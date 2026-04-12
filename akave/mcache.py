import hashlib
import os
import tempfile

import requests
from dotenv import load_dotenv

from logs import setup_logging

load_dotenv()

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

logger = setup_logging("pinata-client")


class PinataClient:
    """Pinata IPFS client — drop-in replacement for the old Akave S3 client."""

    PINATA_API_URL = "https://api.pinata.cloud"
    GATEWAY_URL = os.getenv("PINATA_GATEWAY_URL", "https://gateway.pinata.cloud/ipfs")

    def __init__(self):
        self.cids = []
        self.urls = []
        self._headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_API_KEY,
        }

    # ── helpers ───────────────────────────────────────────────

    def _pin_file(self, file_path: str) -> str:
        """Pin a file to IPFS via Pinata. Returns the CID (IpfsHash)."""
        url = f"{self.PINATA_API_URL}/pinning/pinFileToIPFS"
        file_name = os.path.basename(file_path)

        with open(file_path, "rb") as f:
            response = requests.post(
                url,
                files={"file": (file_name, f)},
                headers=self._headers,
            )

        if response.status_code == 200:
            cid = response.json()["IpfsHash"]
            logger.info(f"Pinned '{file_name}' → CID: {cid}")
            return cid
        else:
            logger.error(f"Pinata pin failed ({response.status_code}): {response.text}")
            raise Exception(f"Pinata upload failed: {response.text}")

    def get_gateway_url(self, cid: str) -> str:
        """Return a public IPFS gateway URL for the given CID."""
        return f"{self.GATEWAY_URL}/{cid}"

    # keep old name as alias so existing callers still work
    def get_presigned_url(self, key: str, **_kwargs) -> str:
        """Backwards-compatible alias for get_gateway_url."""
        return self.get_gateway_url(key)

    def sha256_of_file(self, file_path: str) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    # ── public API (same signatures as old Akave class) ──────

    def upload_file(self, file_path: str) -> str:
        """Upload a file to IPFS via Pinata. Returns the CID."""
        cid = self._pin_file(file_path)
        gateway_url = self.get_gateway_url(cid)
        self.cids.append(cid)
        self.urls.append(gateway_url)
        return cid

    def upload_string(self, content: str) -> tuple:
        """
        Upload a string to IPFS via Pinata.
        Returns (cid, gateway_url) on success, (None, None) on failure.
        """
        tmp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(
                delete=False, mode="w", encoding="utf-8", suffix=".txt"
            ) as tmp_file:
                tmp_file.write(content)
                tmp_file_path = tmp_file.name

            cid = self._pin_file(tmp_file_path)
            gateway_url = self.get_gateway_url(cid)
            self.cids.append(cid)
            self.urls.append(gateway_url)

            logger.info(f"String uploaded → CID: {cid}")
            return (cid, gateway_url)

        except Exception as e:
            logger.error(f"upload_string failed: {e}")
            return (None, None)

        finally:
            if tmp_file_path and os.path.exists(tmp_file_path):
                os.remove(tmp_file_path)

    async def download_file_from_url(self, url, save_path, send_channel):
        """Download a file from any HTTP URL (IPFS gateway, etc.)."""
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(save_path, "wb") as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
                f.flush()
                os.fsync(f.fileno())

            if os.path.exists(save_path):
                file_size = os.path.getsize(save_path)
                msg = f"File downloaded successfully: {save_path} ({file_size} bytes)"
                logger.info(msg)
                await send_channel.send(["send-hcs", msg])
            else:
                msg = f"File download completed but file not found: {save_path}"
                logger.error(msg)
                await send_channel.send(["send-hcs", msg])
                raise FileNotFoundError(msg)
        else:
            msg = f"Failed to download file. Status code: {response.status_code}"
            logger.error(msg)
            await send_channel.send(["send-hcs", msg])
            raise Exception(msg)

    def download_object(self, cid: str) -> bool:
        """Download an object from IPFS by CID and save to ./{cid}."""
        gateway_url = self.get_gateway_url(cid)
        try:
            response = requests.get(gateway_url, stream=True)
            if response.status_code == 200:
                with open(f"./{cid}", "wb") as f:
                    for chunk in response.iter_content(1024):
                        f.write(chunk)
                logger.info(f"Object '{cid}' downloaded successfully!")
                return True
            else:
                logger.error(f"Failed to download object: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error downloading object: {e}")
            return False

    def list_pins(self) -> list:
        """List all pinned files on Pinata."""
        url = f"{self.PINATA_API_URL}/data/pinList?status=pinned"
        response = requests.get(url, headers=self._headers)
        if response.status_code == 200:
            return response.json().get("rows", [])
        else:
            logger.error(f"Failed to list pins: {response.text}")
            return []


# Backwards-compatible alias
Akave = PinataClient
