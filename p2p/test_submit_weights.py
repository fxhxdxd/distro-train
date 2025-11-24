#!/usr/bin/env python3
"""
Test submitting weights to contract manually
"""

import os
import sys
import base64
from dotenv import load_dotenv

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
from logs import setup_logging

logger = setup_logging("test_weights")
load_dotenv()


def test_submit_weights():
    """Test submitting weights with dummy data"""
    operator_key = PrivateKey.from_string(os.getenv("OPERATOR_KEY"))
    operator_id = AccountId.from_string(os.getenv("OPERATOR_ID"))
    contract_id = ContractId.from_string(os.getenv("CONTRACT_ID"))

    network = Network(network="testnet")
    client = Client(network)
    client.set_operator(operator_id, operator_key)

    print(f"Operator ID: {operator_id}")
    print(f"Contract ID: {contract_id}")

    # Test data
    task_id = 4  # Use task 4 which has chunks available

    # Create simple test strings (not encrypted, just for testing)
    test_cipher1 = "test_weight_url_part_1_" + "x" * 100
    test_cipher2 = "test_weight_url_part_2_" + "y" * 100
    test_cipher3 = "test_weight_url_part_3_" + "z" * 100

    print(f"\nTest Parameters:")
    print(f"Task ID: {task_id}")
    print(f"Cipher1 length: {len(test_cipher1)}")
    print(f"Cipher2 length: {len(test_cipher2)}")
    print(f"Cipher3 length: {len(test_cipher3)}")

    try:
        print("\nBuilding transaction...")
        transaction = (
            ContractExecuteTransaction()
            .set_contract_id(contract_id)
            .set_gas(10000000)  # 10M gas
            .set_function(
                "submitWeights",
                ContractFunctionParameters()
                .add_uint256(task_id)
                .add_string(test_cipher1)
                .add_string(test_cipher2)
                .add_string(test_cipher3),
            )
            .freeze_with(client)
            .sign(operator_key)
        )

        print("Executing transaction...")
        receipt = transaction.execute(client)

        print(f"\n✅ Transaction Status: {ResponseCode(receipt.status).name}")

        if receipt.status == ResponseCode.SUCCESS:
            print("✅ SUCCESS! Weights submitted successfully!")
            print(f"Transaction ID: {receipt.transaction_id}")
        else:
            print(f"❌ FAILED: {ResponseCode(receipt.status).name}")

    except Exception as e:
        print(f"\n❌ Exception: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_submit_weights()
