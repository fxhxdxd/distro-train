import os
import sys

import requests

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from akave.mcache import PinataClient
from logs import setup_logging

logger = setup_logging("ml")


class MLTrainer:
    def __init__(self):
        self.akave_client = PinataClient()

    def assign_chunks_to_nodes(self, dataset_url: str, nodes: list) -> dict:
        """
        Assigns dataset chunks to different trainer nodes.
        """
        logger.debug("Fetching dataset manifest from the provided URL...")
        manifest_content = requests.get(dataset_url, stream=True)
        if not manifest_content:
            raise Exception("Failed to fetch dataset manifest from dataset_url.")

        chunk_urls = manifest_content.text.strip().split(",")
        logger.debug(f"Found {len(chunk_urls)} dataset chunks.")

        assignments = {node: [] for node in nodes}
        for i, chunk_url in enumerate(chunk_urls):
            node = nodes[i % len(nodes)]
            assignments[node].append(chunk_url)
        return assignments

    async def train_on_chunk(self, chunk_url: str, model_url: str, send_channel) -> any:
        """
        Download a dataset chunk and model from URLs, execute the model with exec(),
        clean up temporary files, and return the model weights.
        Assumes model.py reads data from ./dataset.
        """
        # Use absolute paths to avoid working directory issues
        cwd = os.getcwd()
        dataset_file = os.path.join(cwd, f"dataset_{os.getpid()}.csv")
        model_file = os.path.join(cwd, f"model_{os.getpid()}.py")

        logger.info(f"Working directory: {cwd}")
        logger.info(f"Dataset file path: {dataset_file}")
        logger.info(f"Model file path: {model_file}")

        # Clean slate
        if os.path.exists(dataset_file):
            os.remove(dataset_file)

        if os.path.exists(model_file):
            os.remove(model_file)

        # Initialised before the try so the finally-block cleanup is safe
        # even when an early download failure skips the alias creation.
        legacy_dataset_path = os.path.join(cwd, "dataset.csv")
        legacy_created = False

        try:
            await self.akave_client.download_file_from_url(
                chunk_url, dataset_file, send_channel
            )
            await self.akave_client.download_file_from_url(
                model_url, model_file, send_channel
            )

            # Verify files exist after download
            if not os.path.exists(dataset_file):
                raise FileNotFoundError(f"Dataset file not found after download: {dataset_file}")
            if not os.path.exists(model_file):
                raise FileNotFoundError(f"Model file not found after download: {model_file}")

            # Log file sizes to confirm they're not empty
            dataset_size = os.path.getsize(dataset_file)
            model_size = os.path.getsize(model_file)
            logger.info(f"Dataset file size: {dataset_size} bytes")
            logger.info(f"Model file size: {model_size} bytes")

            if dataset_size == 0:
                raise ValueError("Downloaded dataset file is empty")
            if model_size == 0:
                raise ValueError("Downloaded model file is empty")

            # Create symlink for backward compatibility with old model scripts
            # This allows models that hardcode "./dataset.csv" to still work.
            # Only replace symlinks we (or a previous run) created — a real
            # ./dataset.csv belongs to the user and must never be deleted.
            if os.path.islink(legacy_dataset_path):
                os.remove(legacy_dataset_path)
            elif os.path.exists(legacy_dataset_path):
                logger.warning(
                    f"{legacy_dataset_path} is a real file — leaving it intact "
                    f"and skipping the legacy alias. Old model scripts that "
                    f"hardcode ./dataset.csv would read the wrong data; this "
                    f"model receives the chunk via DATASET_PATH."
                )
                legacy_dataset_path = None

            if legacy_dataset_path:
                try:
                    os.symlink(dataset_file, legacy_dataset_path)
                    legacy_created = True
                    logger.info(f"Created symlink: {legacy_dataset_path} -> {dataset_file}")
                except OSError as e:
                    logger.warning(f"Could not create symlink (may not be supported): {e}")
                    import shutil
                    shutil.copy2(dataset_file, legacy_dataset_path)
                    legacy_created = True
                    logger.info(f"Copied dataset to legacy path: {legacy_dataset_path}")

            # Read model file and exec it
            with open(model_file, "r") as f:
                model_code = f.read()

            # Use a single namespace so globals().get('DATASET_PATH') works
            # inside the model code (ml1_code.py uses globals().get())
            exec_namespace = {
                '__builtins__': __builtins__,
                'DATASET_PATH': dataset_file,
                'os': os,
            }

            msg = "Starting training of model..."
            logger.info(msg)
            await send_channel.send(["send-hcs", msg])

            exec(model_code, exec_namespace)

            # Expect the model to define 'model_weights' variable in the same namespace
            if "model_weights" not in exec_namespace:
                msg = (
                    "Model script must define 'model_weights' variable after execution"
                )
                await send_channel.send(["send-hcs", msg])
                raise ValueError(msg)

            msg = "Training completed. Uploading weights."
            logger.info(msg)
            await send_channel.send(["send-hcs", msg])

            weights = exec_namespace["model_weights"]
            weights_str = str(weights)

            logger.info(f"Weights data preview: {weights_str[:200]}...")

            # Upload weights and get hash + URL
            weights_hash, weights_url = self.akave_client.upload_string(weights_str)

            if not weights_hash or not weights_url:
                raise Exception("Failed to upload weights to Akave")

            logger.info(f"Weights uploaded successfully!")
            logger.info(f"Weights hash: {weights_hash}")
            logger.info(f"Weights URL: {weights_url}")

            return weights_url

        except Exception as e:
            msg = f"exception : {e} "
            logger.error(msg)
            await send_channel.send(["send-hcs", msg])

            return None  # Explicitly return None on failure

        finally:
            # Clean up temporary files
            if os.path.exists(model_file):
                os.remove(model_file)
            if os.path.exists(dataset_file):
                os.remove(dataset_file)

            # Clean up the legacy alias — but only the one we created.
            # os.path.exists() is False for a broken symlink (its target was
            # just deleted above), which used to leave dangling ./dataset.csv
            # links behind; lexists catches both.
            if legacy_created and os.path.lexists(legacy_dataset_path):
                os.remove(legacy_dataset_path)
                logger.info(f"Cleaned up legacy dataset path: {legacy_dataset_path}")

    async def verify_chunk(self, chunk_url: str, model_url: str) -> str | None:
        """
        Re-run training on a chunk and return the raw weights string.

        Identical to train_on_chunk but skips IPFS upload and HCS logging.
        Used by the /verify-weight endpoint so the client can deterministically
        replicate a trainer's result and compare against the submitted weights.

        Returns the weights string on success, None on failure.
        """
        cwd = os.getcwd()
        # Use a 'verify_' prefix to avoid clashing with active trainer temp files
        dataset_file = os.path.join(cwd, f"verify_dataset_{os.getpid()}.csv")
        model_file = os.path.join(cwd, f"verify_model_{os.getpid()}.py")

        logger.info(f"[verify_chunk] Chunk URL: {chunk_url}")
        logger.info(f"[verify_chunk] Model URL: {model_url}")

        for path in [dataset_file, model_file]:
            if os.path.exists(path):
                os.remove(path)

        try:
            # Download chunk CSV
            logger.info("[verify_chunk] Downloading chunk...")
            r = requests.get(chunk_url, stream=True, timeout=60)
            if r.status_code != 200:
                raise Exception(
                    f"Failed to download chunk ({r.status_code}): {chunk_url}"
                )
            with open(dataset_file, "wb") as f:
                for chunk in r.iter_content(1024):
                    f.write(chunk)
                f.flush()
                os.fsync(f.fileno())

            # Download model script
            logger.info("[verify_chunk] Downloading model...")
            r = requests.get(model_url, stream=True, timeout=60)
            if r.status_code != 200:
                raise Exception(
                    f"Failed to download model ({r.status_code}): {model_url}"
                )
            with open(model_file, "wb") as f:
                for chunk in r.iter_content(1024):
                    f.write(chunk)
                f.flush()
                os.fsync(f.fileno())

            dataset_size = os.path.getsize(dataset_file)
            model_size = os.path.getsize(model_file)
            logger.info(f"[verify_chunk] Dataset: {dataset_size} bytes, Model: {model_size} bytes")

            if dataset_size == 0:
                raise ValueError("Downloaded dataset file is empty")
            if model_size == 0:
                raise ValueError("Downloaded model file is empty")

            with open(model_file, "r") as f:
                model_code = f.read()

            exec_namespace = {
                "__builtins__": __builtins__,
                "DATASET_PATH": dataset_file,
                "os": os,
            }

            logger.info("[verify_chunk] Running model exec()...")
            exec(model_code, exec_namespace)

            if "model_weights" not in exec_namespace:
                raise ValueError("Model script must define 'model_weights' variable")

            weights_str = str(exec_namespace["model_weights"])
            logger.info(
                f"[verify_chunk] Weights computed. Preview: {weights_str[:100]}..."
            )
            return weights_str

        except Exception as e:
            logger.error(f"[verify_chunk] Failed: {e}")
            return None

        finally:
            for path in [dataset_file, model_file]:
                if os.path.exists(path):
                    os.remove(path)
