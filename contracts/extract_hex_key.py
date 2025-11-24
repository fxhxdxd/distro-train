#!/usr/bin/env python3
"""
Extract hex private key from DER-encoded Hedera key

This extracts the raw 32-byte private key from the DER format.
"""

import sys

def extract_hex_key(der_key):
    """
    Extract the raw private key from DER format.

    DER format for ED25519: 302e020100300706052b8104000a04220420{32-byte-key}
    The actual key is the last 64 hex characters (32 bytes)
    """
    # Remove any whitespace
    der_key = der_key.strip()

    # The private key is the last 64 hex characters (32 bytes)
    if len(der_key) >= 64:
        raw_key = der_key[-64:]
        return raw_key
    else:
        raise ValueError("Key too short")


if __name__ == "__main__":
    # Your DER-encoded key
    der_key = "3030020100300706052b8104000a04220420d28b439549177a178ea0251e9070497c077ac9a2926caa77d0a71859a3879150"

    try:
        hex_key = extract_hex_key(der_key)
        print("=" * 70)
        print("Extracted Hex Private Key (for Hardhat):")
        print("=" * 70)
        print(hex_key)
        print("=" * 70)
        print("\nUpdate your contracts/.env file:")
        print(f"HEDERA_PRIVATE_KEY={hex_key}")
        print("\n⚠️  Note: This is an ED25519 key. If deployment fails,")
        print("you may need to generate an ECDSA key with: python3 get_ecdsa_key.py")
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
