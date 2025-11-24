"""
Check Contract Owner

This script checks who owns the FederatedTrainingReward contract.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from hiero_sdk_python import (
    AccountId,
    Client,
    Network,
    PrivateKey,
)
from hiero_sdk_python.contract.contract_call_query import ContractCallQuery
from hiero_sdk_python.contract.contract_id import ContractId
from logs import setup_logging

logger = setup_logging("contract_check")
load_dotenv()


def check_owner():
    """Query the contract to find the owner"""
    operator_key = PrivateKey.from_string(os.getenv("OPERATOR_KEY"))
    operator_id = AccountId.from_string(os.getenv("OPERATOR_ID"))
    contract_id = ContractId.from_string(os.getenv("CONTRACT_ID"))

    network = Network(network="testnet")
    client = Client(network)
    client.set_operator(operator_id, operator_key)

    logger.info(f"Current Operator ID: {operator_id}")
    logger.info(f"Contract ID: {contract_id}")

    try:
        # Query the owner() function - it's a public view function
        result = (
            ContractCallQuery()
            .set_contract_id(contract_id)
            .set_gas(50000)
            .set_function("owner")
            .execute(client)
        )

        # The owner is returned as an address (20 bytes)
        owner_address = result.get_address(0)
        logger.info(f"Contract Owner Address (EVM): 0x{owner_address.hex()}")

        # Try to convert back to Hedera Account ID
        # The last 8 bytes typically contain the account number
        account_num = int.from_bytes(owner_address[-8:], byteorder='big')
        logger.info(f"Estimated Owner Account ID: 0.0.{account_num}")

        if str(operator_id) == f"0.0.{account_num}":
            print("\n✅ You ARE the contract owner!")
            print("The whitelist should work. There might be another issue.")
        else:
            print(f"\n⚠️  You are NOT the contract owner.")
            print(f"Current Operator: {operator_id}")
            print(f"Contract Owner: ~0.0.{account_num}")
            print("\nYou need to:")
            print("1. Use the owner account credentials in your .env file, OR")
            print("2. Ask the owner to whitelist your account, OR")
            print("3. Deploy a new contract with your current account")

    except Exception as e:
        logger.error(f"Error querying contract: {e}")
        print("\n⚠️  Could not query contract owner.")
        print("This might mean the contract doesn't have an 'owner()' function or there's a connection issue.")


if __name__ == "__main__":
    check_owner()
