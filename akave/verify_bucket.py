#!/usr/bin/env python3
"""
Utility script to verify and inspect data stored in Akave O3 bucket.
This helps you check what files are uploaded and their contents.
"""

import os
import sys
import subprocess
import requests
from dotenv import load_dotenv

# Add parent directory to path to import Akave client
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from akave.mcache import Akave
from logs import setup_logging

load_dotenv()
logger = setup_logging("akave-verify")


class AkaveVerifier:
    """Helper class to verify and inspect Akave O3 bucket contents"""

    def __init__(self):
        self.akave = Akave()
        self.bucket_name = "akave-bucket"
        self.endpoint_url = "https://o3-rc2.akave.xyz"
        self.profile = "akave-o3"

    def list_all_objects(self):
        """List all objects in the Akave bucket"""
        logger.info("Listing all objects in akave-bucket...")

        command = [
            "aws", "s3api", "list-objects-v2",
            "--bucket", self.bucket_name,
            "--endpoint-url", self.endpoint_url,
            "--profile", self.profile
        ]

        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode == 0:
            logger.info("✅ Successfully listed objects:")
            print(result.stdout)
            return result.stdout
        else:
            logger.error(f"❌ Error listing objects: {result.stderr}")
            return None

    def get_object_metadata(self, object_key: str):
        """Get metadata for a specific object"""
        logger.info(f"Getting metadata for object: {object_key}")

        command = [
            "aws", "s3api", "head-object",
            "--bucket", self.bucket_name,
            "--key", object_key,
            "--endpoint-url", self.endpoint_url,
            "--profile", self.profile
        ]

        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode == 0:
            logger.info("✅ Object metadata:")
            print(result.stdout)
            return result.stdout
        else:
            logger.error(f"❌ Error getting metadata: {result.stderr}")
            return None

    def download_and_preview_object(self, object_key: str, preview_lines: int = 20):
        """Download and preview the contents of an object"""
        logger.info(f"Downloading and previewing object: {object_key}")

        temp_file = f"/tmp/akave_preview_{object_key[:16]}.tmp"

        # Download the object
        success = self.akave.download_object(object_key)

        if success or os.path.exists(f"./{object_key}"):
            logger.info(f"✅ Downloaded to: ./{object_key}")

            # Preview contents
            try:
                with open(f"./{object_key}", "r") as f:
                    lines = f.readlines()
                    logger.info(f"\n📄 Preview (first {preview_lines} lines):")
                    print("=" * 80)
                    for i, line in enumerate(lines[:preview_lines], 1):
                        print(f"{i}: {line.rstrip()}")
                    if len(lines) > preview_lines:
                        print(f"\n... ({len(lines) - preview_lines} more lines)")
                    print("=" * 80)
            except Exception as e:
                logger.error(f"Error reading file: {e}")
        else:
            logger.error("❌ Failed to download object")

    def verify_presigned_url(self, presigned_url: str):
        """Verify that a presigned URL is accessible and preview its content"""
        logger.info(f"Verifying presigned URL...")
        logger.debug(f"URL: {presigned_url}")

        try:
            response = requests.get(presigned_url, stream=True)

            if response.status_code == 200:
                content = response.text
                logger.info("✅ Presigned URL is accessible!")
                logger.info(f"Content length: {len(content)} bytes")
                logger.info("\n📄 Content preview:")
                print("=" * 80)
                print(content[:500])  # First 500 characters
                if len(content) > 500:
                    print(f"\n... ({len(content) - 500} more characters)")
                print("=" * 80)
                return content
            else:
                logger.error(f"❌ Failed to access URL. Status: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"❌ Error accessing URL: {e}")
            return None

    def verify_dataset_manifest(self, manifest_url: str):
        """Verify a dataset manifest and check all chunk URLs"""
        logger.info("Verifying dataset manifest...")

        content = self.verify_presigned_url(manifest_url)
        if content:
            chunk_urls = content.strip().split(",")
            logger.info(f"\n📋 Found {len(chunk_urls)} chunk URLs in manifest:")

            for i, chunk_url in enumerate(chunk_urls, 1):
                logger.info(f"\n  Chunk {i}/{len(chunk_urls)}:")
                logger.info(f"    URL: {chunk_url[:80]}...")

                # Test first chunk only to save time
                if i == 1:
                    logger.info("    Testing accessibility...")
                    try:
                        response = requests.head(chunk_url)
                        if response.status_code == 200:
                            logger.info(f"    ✅ Chunk {i} is accessible")
                        else:
                            logger.warning(f"    ⚠️  Chunk {i} returned status {response.status_code}")
                    except Exception as e:
                        logger.error(f"    ❌ Error accessing chunk {i}: {e}")

    def search_by_hash(self, file_path: str):
        """Calculate hash of a local file and search for it in the bucket"""
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return

        file_hash = self.akave.sha256_of_file(file_path)
        logger.info(f"📝 File: {file_path}")
        logger.info(f"🔑 SHA256 Hash: {file_hash}")

        # Check if object exists
        logger.info("\nChecking if object exists in Akave O3...")
        self.get_object_metadata(file_hash)

        # Generate presigned URL
        logger.info("\nGenerating presigned URL...")
        url = self.akave.get_presigned_url(file_hash)
        if url:
            logger.info(f"✅ Presigned URL: {url}")
            return file_hash, url
        return file_hash, None


def main():
    """Main CLI interface"""
    print("\n" + "="*80)
    print("🔍 Akave O3 Bucket Verification Tool")
    print("="*80 + "\n")

    verifier = AkaveVerifier()

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python verify_bucket.py list                          # List all objects")
        print("  python verify_bucket.py metadata <object_key>         # Get object metadata")
        print("  python verify_bucket.py preview <object_key>          # Download and preview object")
        print("  python verify_bucket.py verify-url <presigned_url>    # Verify presigned URL")
        print("  python verify_bucket.py verify-manifest <manifest_url># Verify dataset manifest")
        print("  python verify_bucket.py hash <file_path>              # Find object by file hash")
        print("\nExamples:")
        print("  python verify_bucket.py list")
        print("  python verify_bucket.py preview abc123...")
        print("  python verify_bucket.py hash ./dataset.csv")
        return

    command = sys.argv[1].lower()

    if command == "list":
        verifier.list_all_objects()

    elif command == "metadata" and len(sys.argv) >= 3:
        object_key = sys.argv[2]
        verifier.get_object_metadata(object_key)

    elif command == "preview" and len(sys.argv) >= 3:
        object_key = sys.argv[2]
        verifier.download_and_preview_object(object_key)

    elif command == "verify-url" and len(sys.argv) >= 3:
        url = sys.argv[2]
        verifier.verify_presigned_url(url)

    elif command == "verify-manifest" and len(sys.argv) >= 3:
        manifest_url = sys.argv[2]
        verifier.verify_dataset_manifest(manifest_url)

    elif command == "hash" and len(sys.argv) >= 3:
        file_path = sys.argv[2]
        verifier.search_by_hash(file_path)

    else:
        print(f"❌ Unknown command or missing arguments: {' '.join(sys.argv[1:])}")
        print("Run without arguments to see usage.")


if __name__ == "__main__":
    main()
