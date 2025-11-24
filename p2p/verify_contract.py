#!/usr/bin/env python3
"""
Contract Verification Script
Reads and displays all details from the deployed Federated Learning smart contract.
"""

import os
import sys
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

from hiero_sdk_python import (
    Client,
    Network,
    PrivateKey,
    AccountId,
    ContractId,
    ContractCallQuery,
    ContractFunctionParameters,
)

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")


def print_section(text):
    """Print a section header"""
    print(f"\n{Colors.OKBLUE}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.OKBLUE}{'-'*60}{Colors.ENDC}")


def print_success(text):
    """Print success message"""
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")


def print_info(key, value):
    """Print key-value info"""
    print(f"{Colors.OKCYAN}{key}:{Colors.ENDC} {value}")


def print_warning(text):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")


def print_error(text):
    """Print error message"""
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")


class ContractVerifier:
    def __init__(self):
        """Initialize the contract verifier"""
        # Load environment variables
        env_path = Path(__file__).parent / ".env"
        load_dotenv(env_path)

        self.operator_id = AccountId.from_string(os.getenv("OPERATOR_ID"))
        self.operator_key = PrivateKey.from_string(os.getenv("OPERATOR_KEY"))
        self.contract_id = ContractId.from_string(os.getenv("CONTRACT_ID"))

        # Setup client
        network = Network(network="testnet")
        self.client = Client(network)
        self.client.set_operator(self.operator_id, self.operator_key)

        print_success("Client initialized successfully")
        print_info("Operator ID", str(self.operator_id))
        print_info("Contract ID", str(self.contract_id))

    def get_count(self):
        """Get the current count from contract"""
        try:
            query = ContractCallQuery() \
                .set_contract_id(self.contract_id) \
                .set_gas(100000) \
                .set_function("getCount")

            result = query.execute(self.client)
            count = result.get_uint256(0)
            return count
        except Exception as e:
            print_error(f"Failed to get count: {e}")
            return None

    def get_task_id(self):
        """Get the current task ID (task count) from contract"""
        try:
            query = ContractCallQuery() \
                .set_contract_id(self.contract_id) \
                .set_gas(100000) \
                .set_function("getTaskId")

            result = query.execute(self.client)
            task_id = result.get_uint256(0)
            return task_id
        except Exception as e:
            print_error(f"Failed to get task ID: {e}")
            return None

    def task_exists(self, task_id):
        """Check if a task exists"""
        try:
            query = ContractCallQuery() \
                .set_contract_id(self.contract_id) \
                .set_gas(100000) \
                .set_function(
                    "taskExists",
                    ContractFunctionParameters().add_uint256(task_id)
                )

            result = query.execute(self.client)
            exists = result.get_bool(0)
            return exists
        except Exception as e:
            print_error(f"Failed to check if task {task_id} exists: {e}")
            return False

    def get_task_details(self, task_id):
        """Get details for a specific task"""
        try:
            query = ContractCallQuery() \
                .set_contract_id(self.contract_id) \
                .set_gas(100000) \
                .set_function(
                    "tasks",
                    ContractFunctionParameters().add_uint256(task_id)
                )

            result = query.execute(self.client)

            # Parse the task struct
            # Task struct: depositor, modelUrl, datasetUrl, numChunks, remainingChunks, perChunkReward, exists
            depositor = result.get_address(0)
            model_url = result.get_string(1)
            dataset_url = result.get_string(2)
            num_chunks = result.get_uint256(3)
            remaining_chunks = result.get_uint256(4)
            per_chunk_reward = result.get_uint256(5)
            exists = result.get_bool(6)

            return {
                "depositor": depositor,
                "model_url": model_url,
                "dataset_url": dataset_url,
                "num_chunks": num_chunks,
                "remaining_chunks": remaining_chunks,
                "per_chunk_reward": per_chunk_reward,
                "exists": exists,
            }
        except Exception as e:
            print_error(f"Failed to get task {task_id} details: {e}")
            return None

    def get_pending_withdrawal(self, address):
        """Get pending withdrawal balance for an address"""
        try:
            # Convert address string to bytes if needed
            if isinstance(address, str):
                if address.startswith("0x"):
                    address = address[2:]
                address_bytes = bytes.fromhex(address)
            else:
                address_bytes = address

            query = ContractCallQuery() \
                .set_contract_id(self.contract_id) \
                .set_gas(100000) \
                .set_function(
                    "pendingWithdrawals",
                    ContractFunctionParameters().add_address(address_bytes)
                )

            result = query.execute(self.client)
            balance = result.get_uint256(0)
            return balance
        except Exception as e:
            print_error(f"Failed to get pending withdrawal: {e}")
            return None

    def display_contract_overview(self):
        """Display contract overview information"""
        print_header("CONTRACT OVERVIEW")

        print_section("Basic Information")
        print_info("Contract ID", str(self.contract_id))
        print_info("Network", "Hedera Testnet")

        count = self.get_count()
        if count is not None:
            print_info("Count", count)

        task_id = self.get_task_id()
        if task_id is not None:
            print_info("Total Tasks Created", task_id)
            print_success(f"Contract has {task_id} task(s) in history")

    def display_all_tasks(self):
        """Display all tasks in the contract"""
        print_header("TASK DETAILS")

        total_tasks = self.get_task_id()
        if total_tasks is None or total_tasks == 0:
            print_warning("No tasks found in the contract")
            return

        active_tasks = 0
        completed_tasks = 0

        for task_id in range(1, total_tasks + 1):
            exists = self.task_exists(task_id)
            task_details = self.get_task_details(task_id)

            if task_details is None:
                continue

            print_section(f"Task #{task_id}")

            # Status
            if exists:
                status = f"{Colors.OKGREEN}ACTIVE{Colors.ENDC}"
                active_tasks += 1
            else:
                status = f"{Colors.WARNING}COMPLETED{Colors.ENDC}"
                completed_tasks += 1

            print_info("Status", status)
            print_info("Depositor", task_details["depositor"])
            print_info("Model URL", task_details["model_url"][:80] + "..." if len(task_details["model_url"]) > 80 else task_details["model_url"])
            print_info("Dataset URL", task_details["dataset_url"][:80] + "..." if len(task_details["dataset_url"]) > 80 else task_details["dataset_url"])
            print_info("Total Chunks", task_details["num_chunks"])
            print_info("Remaining Chunks", task_details["remaining_chunks"])
            print_info("Completed Chunks", task_details["num_chunks"] - task_details["remaining_chunks"])

            # Convert tinybar to HBAR (1 HBAR = 100,000,000 tinybar)
            per_chunk_hbar = task_details["per_chunk_reward"] / 100_000_000
            total_reward = (task_details["num_chunks"] * task_details["per_chunk_reward"]) / 100_000_000
            remaining_reward = (task_details["remaining_chunks"] * task_details["per_chunk_reward"]) / 100_000_000

            print_info("Reward per Chunk", f"{per_chunk_hbar} HBAR ({task_details['per_chunk_reward']} tinybar)")
            print_info("Total Reward Pool", f"{total_reward} HBAR")
            print_info("Remaining Rewards", f"{remaining_reward} HBAR")

            # Progress bar
            progress = task_details["num_chunks"] - task_details["remaining_chunks"]
            total = task_details["num_chunks"]
            percentage = (progress / total * 100) if total > 0 else 0

            bar_length = 40
            filled = int(bar_length * progress / total) if total > 0 else 0
            bar = "█" * filled + "░" * (bar_length - filled)

            print(f"\n{Colors.OKCYAN}Progress:{Colors.ENDC} [{bar}] {percentage:.1f}% ({progress}/{total})")

        print_section("Summary")
        print_info("Total Tasks", total_tasks)
        print_info("Active Tasks", f"{Colors.OKGREEN}{active_tasks}{Colors.ENDC}")
        print_info("Completed Tasks", f"{Colors.WARNING}{completed_tasks}{Colors.ENDC}")

    def display_operator_info(self):
        """Display operator account information"""
        print_header("OPERATOR ACCOUNT INFO")

        print_info("Operator ID", str(self.operator_id))

        # Get pending withdrawal for operator
        # Note: We need the EVM address, not Hedera account ID
        # This would require converting Hedera ID to EVM address
        print_warning("Pending withdrawals check requires EVM address conversion")

    def verify_contract(self):
        """Run all verification checks"""
        try:
            self.display_contract_overview()
            self.display_all_tasks()
            self.display_operator_info()

            print_header("VERIFICATION COMPLETE")
            print_success("All contract data retrieved successfully!")

        except Exception as e:
            print_error(f"Verification failed: {e}")
            import traceback
            traceback.print_exc()


def main():
    """Main entry point"""
    print_header("FEDERATED LEARNING CONTRACT VERIFIER")

    if len(sys.argv) > 1:
        if sys.argv[1] in ["-h", "--help"]:
            print("Usage: python verify_contract.py [task_id]")
            print("\nOptions:")
            print("  No arguments     - Display all contract information")
            print("  task_id          - Display specific task details")
            print("  -h, --help       - Show this help message")
            return

        # Display specific task
        task_id = int(sys.argv[1])
        verifier = ContractVerifier()

        print_section(f"Task #{task_id} Details")
        exists = verifier.task_exists(task_id)

        if not exists:
            print_warning(f"Task {task_id} does not exist or has been completed")

        task_details = verifier.get_task_details(task_id)
        if task_details:
            for key, value in task_details.items():
                print_info(key.replace("_", " ").title(), value)
    else:
        # Display all information
        verifier = ContractVerifier()
        verifier.verify_contract()


if __name__ == "__main__":
    main()
