import os
import sys

import requests

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from akave.mcache import Akave
from logs import setup_logging

logger = setup_logging("ml")


class MLTrainer:
    def __init__(self):
        self.akave_client = Akave()

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
            # This allows models that hardcode "./dataset.csv" to still work
            legacy_dataset_path = os.path.join(cwd, "dataset.csv")
            if os.path.exists(legacy_dataset_path):
                os.remove(legacy_dataset_path)  # Remove existing file/symlink

            try:
                os.symlink(dataset_file, legacy_dataset_path)
                logger.info(f"Created symlink: {legacy_dataset_path} -> {dataset_file}")
            except OSError as e:
                logger.warning(f"Could not create symlink (may not be supported): {e}")
                # Fall back to copying if symlinks not supported
                import shutil
                shutil.copy2(dataset_file, legacy_dataset_path)
                logger.info(f"Copied dataset to legacy path: {legacy_dataset_path}")

            # Read model file and exec it
            with open(model_file, "r") as f:
                model_code = f.read()

            # Inject absolute paths into execution context
            local_vars = {
                'DATASET_PATH': dataset_file,  # Model can use this instead of hardcoded path
                'os': os,  # Provide os module to model
            }

            msg = "Starting training of model..."
            logger.info(msg)
            await send_channel.send(["send-hcs", msg])

            exec(model_code, {}, local_vars)

            # Expect the model to define 'model_weights' variable
            if "model_weights" not in local_vars:
                msg = (
                    "Model script must define 'model_weights' variable after execution"
                )
                await send_channel.send(["send-hcs", msg])
                raise ValueError(msg)

            msg = "Training completed. Uploading weights."
            logger.info(msg)
            await send_channel.send(["send-hcs", msg])

            weights = local_vars["model_weights"]

            self.akave_client.upload_string(str(weights))
            return self.akave_client.urls[-1]

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

            # Clean up legacy symlink/copy
            legacy_dataset_path = os.path.join(cwd, "dataset.csv")
            if os.path.exists(legacy_dataset_path):
                os.remove(legacy_dataset_path)
                logger.info(f"Cleaned up legacy dataset path: {legacy_dataset_path}")
