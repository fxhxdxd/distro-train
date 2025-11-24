#!/usr/bin/env python3
"""
Debug Contract State - Check task details and diagnose revert
"""

import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from hiero_sdk_python import (
    AccountId,
    Client,
    Network,
    PrivateKey,
)
from hiero_sdk_python.contract.contract_call_query import ContractCallQuery
from hiero_sdk_python.contract.contract_function_parameters import (
    ContractFunctionParameters,
)
from hiero_sdk_python.contract.contract_id import ContractId
from logs import setup_logging

logger = setup_logging("contract_debug")
load_dotenv()


def check_contract_state():
    """Query contract to check task state"""
    operator_key = PrivateKey.from_string(os.getenv("OPERATOR_KEY"))
    operator_id = AccountId.from_string(os.getenv("OPERATOR_ID"))
    contract_id = ContractId.from_string(os.getenv("CONTRACT_ID"))

    network = Network(network="testnet")
    client = Client(network)
    client.set_operator(operator_id, operator_key)

    logger.info(f"Operator ID: {operator_id}")
    logger.info(f"Contract ID: {contract_id}")
    print("\n" + "=" * 60)
    print("CONTRACT STATE DEBUG")
    print("=" * 60)

    # Check total task count
    try:
        result = (
            ContractCallQuery()
            .set_contract_id(contract_id)
            .set_gas(100000)
            .set_function("getTaskId")
            .execute(client)
        )
        task_count = result.get_uint256(0)
        print(f"\n✅ Total tasks created: {task_count}")
    except Exception as e:
        print(f"\n❌ Error getting task count: {e}")
        return

    if task_count == 0:
        print("\n⚠️  NO TASKS EXIST on this contract!")
        print("You need to create a task via the frontend first.")
        return

    # Check each task
    for task_id in range(1, task_count + 1):
        print(f"\n{'─' * 60}")
        print(f"TASK ID: {task_id}")
        print('─' * 60)

        # Check if task exists
        try:
            result = (
                ContractCallQuery()
                .set_contract_id(contract_id)
                .set_gas(100000)
                .set_function(
                    "taskExists", ContractFunctionParameters().add_uint256(task_id)
                )
                .execute(client)
            )
            exists = result.get_bool(0)
            print(f"Exists: {exists}")

            if not exists:
                print("⚠️  Task was deleted (completed or cancelled)")
                continue

        except Exception as e:
            print(f"❌ Error checking existence: {e}")
            continue

        # Get task details using tasks() public mapping
        try:
            result = (
                ContractCallQuery()
                .set_contract_id(contract_id)
                .set_gas(200000)
                .set_function("tasks", ContractFunctionParameters().add_uint256(task_id))
                .execute(client)
            )

            # Parse task struct
            # struct Task {
            #     address payable depositor;      // 0
            #     string modelUrl;                // 1
            #     string datasetUrl;              // 2
            #     uint256 numChunks;              // 3
            #     uint256 remainingChunks;        // 4
            #     uint256 perChunkReward;         // 5
            #     bool exists;                    // 6
            # }

            depositor = result.get_address(0)
            model_url = result.get_string(1)
            dataset_url = result.get_string(2)
            num_chunks = result.get_uint256(3)
            remaining_chunks = result.get_uint256(4)
            per_chunk_reward = result.get_uint256(5)
            exists_flag = result.get_bool(6)

            # Handle depositor as string or bytes
            if isinstance(depositor, str):
                print(f"Depositor: {depositor}")
            else:
                print(f"Depositor: 0x{depositor.hex()}")
            print(f"Model URL: {model_url[:80]}..." if len(model_url) > 80 else f"Model URL: {model_url}")
            print(f"Dataset URL: {dataset_url[:80]}..." if len(dataset_url) > 80 else f"Dataset URL: {dataset_url}")
            print(f"Total Chunks: {num_chunks}")
            print(f"Remaining Chunks: {remaining_chunks}")
            print(f"Reward per Chunk: {per_chunk_reward} tinybars ({per_chunk_reward / 100000000} HBAR)")
            print(f"Exists Flag: {exists_flag}")

            if remaining_chunks == 0:
                print("\n⚠️  ALL CHUNKS CONSUMED - No rewards left!")
                print("This is why CONTRACT_REVERT_EXECUTED occurs.")
                print("The contract line failing: require(t.remainingChunks > 0)")
            else:
                print(f"\n✅ Task has {remaining_chunks} chunks available")

        except Exception as e:
            print(f"❌ Error getting task details: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)


if __name__ == "__main__":
    check_contract_state()
