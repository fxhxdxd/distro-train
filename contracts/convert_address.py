#!/usr/bin/env python3
"""
Convert EVM address to Hedera Contract ID

Usage: python convert_address.py <evm_address>
Example: python convert_address.py 0x1234567890abcdef1234567890abcdef12345678
"""

import sys


def evm_to_hedera(evm_address):
    """
    Convert an EVM address to Hedera Contract ID format.

    Args:
        evm_address: EVM address (with or without 0x prefix)

    Returns:
        Hedera Contract ID in format "0.0.xxxxx"
    """
    # Remove 0x prefix if present
    if evm_address.startswith('0x') or evm_address.startswith('0X'):
        evm_address = evm_address[2:]

    # Validate hex string
    try:
        int(evm_address, 16)
    except ValueError:
        raise ValueError(f"Invalid hex address: {evm_address}")

    # Hedera uses the last 8 bytes (16 hex chars) as the account number
    if len(evm_address) < 16:
        raise ValueError(f"Address too short: {evm_address}")

    last_8_bytes = evm_address[-16:]
    account_num = int(last_8_bytes, 16)

    return f"0.0.{account_num}"


def main():
    """Main CLI function"""
    if len(sys.argv) != 2:
        print(__doc__)
        print("\nError: Please provide an EVM address")
        sys.exit(1)

    evm_addr = sys.argv[1]

    try:
        hedera_id = evm_to_hedera(evm_addr)
        print(f"\n✅ Conversion successful!")
        print(f"EVM Address:       {evm_addr}")
        print(f"Hedera Contract ID: {hedera_id}")
        print(f"\nUpdate your p2p/.env file with:")
        print(f"CONTRACT_ID={hedera_id}")
    except ValueError as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
