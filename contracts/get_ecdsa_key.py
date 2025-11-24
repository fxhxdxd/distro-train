#!/usr/bin/env python3
"""
Generate a new ECDSA private key for Hedera EVM compatibility

This script generates a new ECDSA secp256k1 private key that can be used
with Hedera's EVM-compatible smart contracts.
"""

import sys
import os

# Add parent directory to path to import hiero_sdk_python
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "p2p")))

try:
    from hiero_sdk_python import PrivateKey
except ImportError:
    print("Error: hiero_sdk_python not found")
    print("Make sure you've installed the dependencies in the p2p directory")
    sys.exit(1)


def main():
    """Generate and display a new ECDSA key"""
    print("=" * 60)
    print("Generating new ECDSA Private Key for Hedera")
    print("=" * 60)

    # Generate a new ECDSA key
    ecdsa_key = PrivateKey.generate_ecdsa()

    print("\n✅ Key Generated Successfully!\n")
    print("Private Key (keep this SECRET!):")
    print("-" * 60)
    print(str(ecdsa_key))
    print("-" * 60)

    print("\nPublic Key:")
    print("-" * 60)
    print(str(ecdsa_key.public_key()))
    print("-" * 60)

    print("\n📝 Next Steps:")
    print("1. Save the private key securely (use a password manager)")
    print("2. Add this key to your Hedera account as an ECDSA alias")
    print("3. Use this key in contracts/.env as HEDERA_PRIVATE_KEY")
    print("\n   For hardhat deployment:")
    print(f"   HEDERA_PRIVATE_KEY={str(ecdsa_key)}")

    print("\n⚠️  SECURITY WARNING:")
    print("   - Never commit this key to git")
    print("   - Never share this key with anyone")
    print("   - Store it in a secure location")
    print("=" * 60)


if __name__ == "__main__":
    main()
