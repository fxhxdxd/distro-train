# Contract Verification & Events Viewer Guide

## Overview

I've created two powerful scripts to help you view and verify your deployed smart contract:

1. **`verify_contract.py`** - Read contract state, task details, and balances
2. **`view_contract_events.py`** - View all events and logs from the contract

## Prerequisites

All required dependencies are already in `extra_requirements.txt`. Make sure you have them installed:

```bash
# Install all dependencies
pip3 install -r extra_requirements.txt

# Or install just the new ones needed:
pip3 install requests eth-abi
```

## Script 1: Contract State Verifier

### What It Shows

- ✅ Contract overview (task count, contract ID, etc.)
- ✅ All tasks with detailed information
- ✅ Progress bars for each task
- ✅ Reward information (HBAR and tinybar)
- ✅ Active vs completed tasks
- ✅ Chunk completion status

### Usage

```bash
cd p2p

# View all contract information
python3 verify_contract.py

# View specific task details
python3 verify_contract.py 4

# Show help
python3 verify_contract.py --help
```

### Example Output

```
================================================================================
                           CONTRACT OVERVIEW
================================================================================

✅ Client initialized successfully
Operator ID: 0.0.7285006
Contract ID: 0.0.7307807

Basic Information
------------------------------------------------------------
Contract ID: 0.0.7307807
Network: Hedera Testnet
Count: 0
Total Tasks Created: 4
✅ Contract has 4 task(s) in history

================================================================================
                              TASK DETAILS
================================================================================

Task #1
------------------------------------------------------------
Status: ACTIVE
Depositor: 0x1234...
Model URL: https://o3-rc2.akave.xyz/akave-bucket/abc123...
Dataset URL: https://o3-rc2.akave.xyz/akave-bucket/def456...
Total Chunks: 3
Remaining Chunks: 2
Completed Chunks: 1
Reward per Chunk: 0.1 HBAR (10000000 tinybar)
Total Reward Pool: 0.3 HBAR
Remaining Rewards: 0.2 HBAR

Progress: [█████████████░░░░░░░░░░░░░░░] 33.3% (1/3)

Task #2
------------------------------------------------------------
Status: COMPLETED
...
```

## Script 2: Events & Logs Viewer

### What It Shows

- 📝 All contract execution results (transactions)
- 📋 All emitted events (TaskCreated, WeightsSubmitted, etc.)
- ⏱️ Timestamps and block numbers
- 🔍 Transaction hashes for verification
- 💾 Export to JSON for analysis

### Usage

```bash
cd p2p

# View all events and execution results
python3 view_contract_events.py

# View only logs/events
python3 view_contract_events.py --logs

# View only execution results
python3 view_contract_events.py --results

# Export to JSON file
python3 view_contract_events.py --export
python3 view_contract_events.py --export my_logs.json

# Use with different contract
python3 view_contract_events.py --contract 0.0.1234567

# Show help
python3 view_contract_events.py --help
```

### Example Output

```
================================================================================
                      CONTRACT EXECUTION RESULTS
================================================================================

✅ Found 12 execution results

Transaction #1
------------------------------------------------------------
Timestamp: 2025-11-23 14:30:45
From: 0x1234...
To: 0x5678...
Gas Used: 234567
Transaction Hash: 0xabcd...
Function Parameters: 0x123...
Call Result: 0x...

Transaction #2
------------------------------------------------------------
...

================================================================================
                      CONTRACT EVENTS (LOGS)
================================================================================

✅ Found 8 log entries

Event #1
------------------------------------------------------------
Timestamp: 1732377045.123456789
Block Number: 12345678
Transaction Hash: 0xabcd...
Log Index: 0
Event Signature: 0x1234... (TaskCreated)

Indexed Parameters:
  Topic 1: 0x0000000000000000000000000000000000000000000000000000000000000004 (decimal: 4)
  Topic 2: 0x000000000000000000000000abcd1234... (depositor address)

Data (hex): 0x00000000000000000000000000000000000000000000000000000000000000...
Data (decoded): https://o3-rc2.akave.xyz/akave-bucket/...
```

## Understanding the Events

### Event Types

Your contract emits these events:

1. **TaskCreated** - When a new training task is created
   - Task ID (indexed)
   - Depositor address (indexed)
   - Model URL
   - Dataset URL
   - Number of chunks
   - Total reward

2. **WeightsSubmitted** - When a trainer submits weights (NEW FORMAT!)
   - Task ID (indexed)
   - Trainer address (indexed)
   - Weights hash (Akave hash only - 64 chars)
   - Reward amount
   - Remaining chunks

3. **TaskCompleted** - When all chunks are completed
   - Task ID (indexed)

4. **Withdrawn** - When someone withdraws pending balance
   - Address (indexed)
   - Amount

### Reading WeightsSubmitted Events

With the new contract (0.0.7307807), `WeightsSubmitted` events now contain:

```
WeightsSubmitted(
  taskId: 4,
  trainer: 0x1234...,
  weightsHash: "f402e7f71a64441ec8c4ff2567d1dae9451b98c8bf34f625aa11f8e018ecc3f7",  ← Just the hash!
  rewardAmount: 10000000,
  remainingChunks: 2
)
```

To reconstruct the full Akave URL:
```
https://o3-rc2.akave.xyz/akave-bucket/{weightsHash}?X-Amz-...
```

**Note:** The presigned URL parameters (X-Amz-*) are not on-chain. You'll need to:
- Generate a new presigned URL from Akave using the hash
- Or store the full URL mapping in HCS or local database

## Exporting Data

### Export Events to JSON

```bash
python3 view_contract_events.py --export contract_logs.json
```

This creates a JSON file with all events and results:

```json
{
  "contract_id": "0.0.7307807",
  "export_time": "2025-11-23T14:30:45.123456",
  "logs": [
    {
      "timestamp": "1732377045.123456789",
      "block_number": "12345678",
      "transaction_hash": "0xabcd...",
      "topics": ["0x1234...", "0x5678..."],
      "data": "0x..."
    }
  ],
  "results": [
    {
      "timestamp": "1732377045.123456789",
      "from": "0x1234...",
      "to": "0x5678...",
      "gas_used": 234567,
      "hash": "0xabcd..."
    }
  ]
}
```

You can then analyze this JSON with:
- Python scripts
- jq command-line tool
- JSON viewers
- Custom dashboards

## Monitoring Task Progress

### Real-time Monitoring

To monitor a task in real-time:

```bash
# Watch task progress
watch -n 5 python3 verify_contract.py 4

# Or create a simple loop
while true; do
  clear
  python3 verify_contract.py 4
  sleep 5
done
```

### Check Latest Events

```bash
# See latest 10 events
python3 view_contract_events.py --logs | head -n 50
```

## Troubleshooting

### Script Fails to Run

**Error:** `ModuleNotFoundError: No module named 'eth_abi'`

**Solution:**
```bash
pip3 install -r extra_requirements.txt
```

### No Logs Found

**Possible reasons:**
- Contract is new and no events emitted yet
- Wrong contract ID in `.env`
- Mirror node delay (events can take 1-2 minutes to appear)

**Solution:**
```bash
# Verify contract ID
cat .env | grep CONTRACT_ID

# Wait a minute and try again
sleep 60
python3 view_contract_events.py
```

### Task Shows as "Does Not Exist"

This is normal for completed tasks. The contract sets `exists=false` when a task completes.

You can still see the task history in events:
```bash
python3 view_contract_events.py --logs | grep TaskCompleted
```

## Advanced Usage

### Combine with Other Tools

```bash
# Export events and search for specific task
python3 view_contract_events.py --export
cat contract_logs.json | jq '.logs[] | select(.topics[1] == "0x0000...0004")'

# Monitor gas usage
python3 view_contract_events.py --results | grep "Gas Used"

# Count total submissions
python3 view_contract_events.py --logs | grep -c "WeightsSubmitted"
```

### Integration with Your System

You can import these scripts in your own Python code:

```python
from verify_contract import ContractVerifier
from view_contract_events import EventsViewer

# Use in your code
verifier = ContractVerifier()
task_details = verifier.get_task_details(4)
print(f"Remaining chunks: {task_details['remaining_chunks']}")

# Get events
viewer = EventsViewer("0.0.7307807")
logs = viewer.fetch_contract_logs(limit=100)
```

## Color-Coded Output

Both scripts use color coding:
- 🟢 **Green** - Success messages, active tasks
- 🔵 **Blue** - Section headers, info
- 🟡 **Yellow** - Warnings, completed tasks
- 🔴 **Red** - Errors
- 🟣 **Purple** - Headers

## Quick Reference

```bash
# Most common commands

# View everything
python3 verify_contract.py

# Check specific task
python3 verify_contract.py 4

# See all events
python3 view_contract_events.py

# Export for analysis
python3 view_contract_events.py --export

# Monitor in real-time
watch -n 5 python3 verify_contract.py
```

## Next Steps

1. Install dependencies if needed: `pip3 install -r extra_requirements.txt`
2. Run `python3 verify_contract.py` to see your contract state
3. Run `python3 view_contract_events.py` to see all events
4. Create a new training task and watch the events appear!

---

**Pro Tip:** Bookmark the Hedera Mirror Node explorer for your contract:
```
https://hashscan.io/testnet/contract/0.0.7307807
```

This gives you a web UI to view transactions and events alongside these scripts!
