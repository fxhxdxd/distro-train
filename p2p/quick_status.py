#!/usr/bin/env python3
"""
Quick Status Checker
Fast overview of contract and latest events.
"""

import os
from pathlib import Path
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

# Load environment
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

def main():
    operator_id = AccountId.from_string(os.getenv("OPERATOR_ID"))
    operator_key = PrivateKey.from_string(os.getenv("OPERATOR_KEY"))
    contract_id = ContractId.from_string(os.getenv("CONTRACT_ID"))

    network = Network(network="testnet")
    client = Client(network)
    client.set_operator(operator_id, operator_key)

    print("╔════════════════════════════════════════════════════════════╗")
    print("║          QUICK CONTRACT STATUS                             ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print()
    print(f"📋 Contract ID: {contract_id}")
    print(f"👤 Operator ID: {operator_id}")
    print()

    try:
        # Get task count
        query = ContractCallQuery() \
            .set_contract_id(contract_id) \
            .set_gas(100000) \
            .set_function("getTaskId")

        result = query.execute(client)
        total_tasks = result.get_uint256(0)

        print(f"📊 Total Tasks: {total_tasks}")
        print()

        if total_tasks > 0:
            # Check each task
            active = 0
            completed = 0

            for task_id in range(1, total_tasks + 1):
                query = ContractCallQuery() \
                    .set_contract_id(contract_id) \
                    .set_gas(100000) \
                    .set_function(
                        "taskExists",
                        ContractFunctionParameters().add_uint256(task_id)
                    )

                result = query.execute(client)
                exists = result.get_bool(0)

                if exists:
                    active += 1

                    # Get task details
                    query = ContractCallQuery() \
                        .set_contract_id(contract_id) \
                        .set_gas(100000) \
                        .set_function(
                            "tasks",
                            ContractFunctionParameters().add_uint256(task_id)
                        )

                    result = query.execute(client)
                    num_chunks = result.get_uint256(3)
                    remaining = result.get_uint256(4)
                    progress = num_chunks - remaining

                    print(f"  Task #{task_id}: ✅ ACTIVE - {progress}/{num_chunks} chunks completed")
                else:
                    completed += 1
                    print(f"  Task #{task_id}: ✔️  COMPLETED")

            print()
            print(f"🟢 Active: {active}  |  ✅ Completed: {completed}")
        else:
            print("ℹ️  No tasks created yet")

        print()
        print("─" * 60)
        print("💡 For detailed info, run: python3 verify_contract.py")
        print("📝 For events/logs, run: python3 view_contract_events.py")
        print("─" * 60)

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
