"""
Whitelist Manager for FederatedTrainingReward Contract

This script manages the whitelist for trainer accounts that are allowed to submit weights.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from hiero_sdk_python import (
    AccountId,
    Client,
    Network,
    PrivateKey,
    ResponseCode,
)
from hiero_sdk_python.contract.contract_execute_transaction import (
    ContractExecuteTransaction,
)
from hiero_sdk_python.contract.contract_function_parameters import (
    ContractFunctionParameters,
)
from hiero_sdk_python.contract.contract_id import ContractId
from hiero_sdk_python.contract.contract_call_query import ContractCallQuery

from logs import setup_logging

logger = setup_logging("whitelist")

# Load environment variables
load_dotenv()


class WhitelistManager:
    def __init__(self):
        self.operator_key = PrivateKey.from_string(os.getenv("OPERATOR_KEY"))
        self.operator_id = AccountId.from_string(os.getenv("OPERATOR_ID"))
        self.contract_id = ContractId.from_string(os.getenv("CONTRACT_ID"))

        # Setup client
        network = Network(network="testnet")
        self.client = Client(network)
        self.client.set_operator(self.operator_id, self.operator_key)

        logger.info(f"Initialized WhitelistManager")
        logger.info(f"Operator ID: {self.operator_id}")
        logger.info(f"Contract ID: {self.contract_id}")

    def add_to_whitelist(self, account_id_str: str):
        """
        Add an account to the whitelist.

        Args:
            account_id_str: Account ID in format "0.0.xxxxx"
        """
        try:
            account_id = AccountId.from_string(account_id_str)
            logger.info(f"Adding account {account_id} to whitelist...")

            # Convert AccountId to Hedera address format (20 bytes)
            # For Hedera, we need to convert the account to an EVM address
            # Format: 0x + 8 bytes of zeros + 4 bytes shard + 8 bytes realm + 8 bytes num
            shard_bytes = account_id.shard.to_bytes(8, byteorder='big')
            realm_bytes = account_id.realm.to_bytes(8, byteorder='big')
            num_bytes = account_id.num.to_bytes(8, byteorder='big')

            # Hedera address is the last 20 bytes of the concatenation
            full_bytes = shard_bytes + realm_bytes + num_bytes
            hedera_address = full_bytes[-20:]  # Take last 20 bytes

            receipt = (
                ContractExecuteTransaction()
                .set_contract_id(self.contract_id)
                .set_gas(100000)
                .set_function(
                    "addToWhitelist",
                    ContractFunctionParameters().add_address(hedera_address)
                )
                .execute(self.client)
            )

            if receipt.status != ResponseCode.SUCCESS:
                status_message = ResponseCode(receipt.status).name
                logger.error(f"Failed to add to whitelist: {status_message}")
                raise Exception(f"Transaction failed with status: {status_message}")

            logger.info(f"✅ Successfully added {account_id} to whitelist")
            return True

        except Exception as e:
            logger.error(f"Error adding to whitelist: {e}")
            raise

    def remove_from_whitelist(self, account_id_str: str):
        """
        Remove an account from the whitelist.

        Args:
            account_id_str: Account ID in format "0.0.xxxxx"
        """
        try:
            account_id = AccountId.from_string(account_id_str)
            logger.info(f"Removing account {account_id} from whitelist...")

            # Convert to Hedera address (same as add_to_whitelist)
            shard_bytes = account_id.shard.to_bytes(8, byteorder='big')
            realm_bytes = account_id.realm.to_bytes(8, byteorder='big')
            num_bytes = account_id.num.to_bytes(8, byteorder='big')
            full_bytes = shard_bytes + realm_bytes + num_bytes
            hedera_address = full_bytes[-20:]

            receipt = (
                ContractExecuteTransaction()
                .set_contract_id(self.contract_id)
                .set_gas(100000)
                .set_function(
                    "removeFromWhitelist",
                    ContractFunctionParameters().add_address(hedera_address)
                )
                .execute(self.client)
            )

            if receipt.status != ResponseCode.SUCCESS:
                status_message = ResponseCode(receipt.status).name
                logger.error(f"Failed to remove from whitelist: {status_message}")
                raise Exception(f"Transaction failed with status: {status_message}")

            logger.info(f"✅ Successfully removed {account_id} from whitelist")
            return True

        except Exception as e:
            logger.error(f"Error removing from whitelist: {e}")
            raise

    def check_whitelist(self, account_id_str: str):
        """
        Check if an account is whitelisted.

        Args:
            account_id_str: Account ID in format "0.0.xxxxx"

        Returns:
            bool: True if whitelisted, False otherwise
        """
        try:
            account_id = AccountId.from_string(account_id_str)
            logger.info(f"Checking whitelist status for {account_id}...")

            # Convert to Hedera address
            shard_bytes = account_id.shard.to_bytes(8, byteorder='big')
            realm_bytes = account_id.realm.to_bytes(8, byteorder='big')
            num_bytes = account_id.num.to_bytes(8, byteorder='big')
            full_bytes = shard_bytes + realm_bytes + num_bytes
            hedera_address = full_bytes[-20:]

            result = (
                ContractCallQuery()
                .set_contract_id(self.contract_id)
                .set_gas(50000)
                .set_function(
                    "isWhitelisted",
                    ContractFunctionParameters().add_address(hedera_address)
                )
                .execute(self.client)
            )

            # Parse boolean result
            is_whitelisted = result.get_bool(0)
            logger.info(f"Account {account_id} whitelisted: {is_whitelisted}")
            return is_whitelisted

        except Exception as e:
            logger.error(f"Error checking whitelist: {e}")
            raise


def main():
    """Main function for CLI usage"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python whitelist_manager.py add <account_id>")
        print("  python whitelist_manager.py remove <account_id>")
        print("  python whitelist_manager.py check <account_id>")
        print("\nExample:")
        print("  python whitelist_manager.py add 0.0.123456")
        sys.exit(1)

    manager = WhitelistManager()
    command = sys.argv[1].lower()

    if command == "add" and len(sys.argv) == 3:
        account_id = sys.argv[2]
        manager.add_to_whitelist(account_id)
    elif command == "remove" and len(sys.argv) == 3:
        account_id = sys.argv[2]
        manager.remove_from_whitelist(account_id)
    elif command == "check" and len(sys.argv) == 3:
        account_id = sys.argv[2]
        is_whitelisted = manager.check_whitelist(account_id)
        print(f"Whitelisted: {is_whitelisted}")
    else:
        print("Invalid command or arguments")
        sys.exit(1)


if __name__ == "__main__":
    main()
