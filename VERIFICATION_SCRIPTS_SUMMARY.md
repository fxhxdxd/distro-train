# ✅ Contract Verification Scripts - Ready to Use!

## What I Created

I've built **3 powerful scripts** to help you view and verify your smart contract:

### 1. 🚀 Quick Status (`quick_status.py`)

**Purpose:** Fast overview of your contract state

**Usage:**
```bash
cd p2p
python3 quick_status.py
```

**Shows:**
- Contract ID and Operator ID
- Total tasks created
- Active vs completed tasks
- Progress for each task

**Example Output:**
```
╔════════════════════════════════════════════════════════════╗
║          QUICK CONTRACT STATUS                             ║
╚════════════════════════════════════════════════════════════╝

📋 Contract ID: 0.0.7307807
👤 Operator ID: 0.0.7285006

📊 Total Tasks: 4

  Task #1: ✅ ACTIVE - 1/3 chunks completed
  Task #2: ✅ ACTIVE - 2/3 chunks completed
  Task #3: ✔️  COMPLETED
  Task #4: ✔️  COMPLETED

🟢 Active: 2  |  ✅ Completed: 2
```

---

### 2. 📊 Full Contract Verifier (`verify_contract.py`)

**Purpose:** Detailed view of all contract data

**Usage:**
```bash
cd p2p

# View all tasks with details
python3 verify_contract.py

# View specific task
python3 verify_contract.py 4

# Help
python3 verify_contract.py --help
```

**Shows:**
- Contract overview (count, task ID)
- All tasks with full details:
  - Depositor address
  - Model and dataset URLs
  - Chunk progress with progress bars
  - Rewards in HBAR and tinybar
  - Active/completed status
- Summary statistics

**Example Output:**
```
================================================================================
                           CONTRACT OVERVIEW
================================================================================

✅ Client initialized successfully
Operator ID: 0.0.7285006
Contract ID: 0.0.7307807
Total Tasks Created: 4

================================================================================
                              TASK DETAILS
================================================================================

Task #1
------------------------------------------------------------
Status: ACTIVE
Depositor: 0x1234...
Model URL: https://o3-rc2.akave.xyz/...
Dataset URL: https://o3-rc2.akave.xyz/...
Total Chunks: 3
Remaining Chunks: 2
Completed Chunks: 1
Reward per Chunk: 0.1 HBAR
Total Reward Pool: 0.3 HBAR

Progress: [█████████████░░░░░░░░░░░░░░░] 33.3% (1/3)
```

---

### 3. 📝 Events & Logs Viewer (`view_contract_events.py`)

**Purpose:** View all contract events and transaction logs

**Usage:**
```bash
cd p2p

# View all events and results
python3 view_contract_events.py

# View only logs/events
python3 view_contract_events.py --logs

# View only execution results
python3 view_contract_events.py --results

# Export to JSON
python3 view_contract_events.py --export
python3 view_contract_events.py --export my_logs.json

# Help
python3 view_contract_events.py --help
```

**Shows:**
- All contract transactions with:
  - Timestamps
  - From/To addresses
  - Gas used
  - Transaction hashes
  - Function parameters
  - Results/errors
- All emitted events:
  - TaskCreated
  - WeightsSubmitted (NEW FORMAT - single hash!)
  - TaskCompleted
  - Withdrawn
- Decoded data where possible
- Export capability for analysis

**Example Output:**
```
================================================================================
                      CONTRACT EXECUTION RESULTS
================================================================================

✅ Found 12 execution results

Transaction #1
------------------------------------------------------------
Timestamp: 2025-11-23 14:30:45
From: 0x1234...
Gas Used: 234567
Transaction Hash: 0xabcd...

================================================================================
                      CONTRACT EVENTS (LOGS)
================================================================================

✅ Found 8 log entries

Event #1 - WeightsSubmitted
------------------------------------------------------------
Timestamp: 1732377045.123456789
Task ID: 4
Trainer: 0x5678...
Weights Hash: f402e7f71a64441ec8c4ff2567d1dae9451b98c8bf34f625aa11f8e018ecc3f7
Reward: 10000000 tinybar
Remaining: 2 chunks
```

---

## 📦 Installation

All dependencies are already listed in `extra_requirements.txt`. Just install them:

```bash
# Install all dependencies
pip3 install -r extra_requirements.txt

# Or install just what's needed for these scripts:
pip3 install requests eth-abi
```

## 🎯 Common Use Cases

### Quick Check
```bash
# Just see what's happening
python3 quick_status.py
```

### Monitor Training Progress
```bash
# Watch a specific task in real-time
watch -n 5 python3 verify_contract.py 4

# Or use a loop
while true; do clear; python3 verify_contract.py 4; sleep 5; done
```

### Debug Issues
```bash
# See all events to find errors
python3 view_contract_events.py --logs

# Check latest transactions
python3 view_contract_events.py --results | head -n 100
```

### Export for Analysis
```bash
# Export all data
python3 view_contract_events.py --export contract_data.json

# Analyze with jq
cat contract_data.json | jq '.logs[] | select(.topics[1] == "0x0004")'
```

## 🔍 What's Different in New Contract

The new contract (0.0.7307807) has a **simplified WeightsSubmitted event**:

**Old Format (3 encrypted parts):**
```solidity
WeightsSubmitted(taskId, trainer, cipher1, cipher2, cipher3, reward, remaining)
```

**New Format (single hash):**
```solidity
WeightsSubmitted(taskId, trainer, weightsHash, reward, remaining)
```

**Benefits:**
- ✅ Only 64 characters instead of 1000+
- ✅ No more CONTRACT_REVERT errors
- ✅ Lower gas costs
- ✅ Simpler to read and verify

**To reconstruct full URL:**
```python
hash = "f402e7f71a64441ec8c4ff2567d1dae9451b98c8bf34f625aa11f8e018ecc3f7"
base_url = "https://o3-rc2.akave.xyz/akave-bucket"
# Note: You'll need to regenerate presigned URL or store it separately
```

## 📚 Full Documentation

See `CONTRACT_VERIFICATION_GUIDE.md` for:
- Detailed usage examples
- Understanding events
- Troubleshooting
- Advanced usage
- Integration examples

## 🚨 Important Notes

1. **Mirror Node Delay:** Events may take 1-2 minutes to appear on the mirror node
2. **Completed Tasks:** Tasks show `exists=false` when completed - this is normal
3. **Environment Variables:** Scripts read from `p2p/.env` automatically
4. **Color Output:** Scripts use colored terminal output for better readability

## ✅ You're All Set!

Dependencies needed (already in `extra_requirements.txt`):
- `requests` - For HTTP calls to mirror node
- `eth-abi` - For decoding contract data
- `python-dotenv` - For loading .env files
- `hiero-sdk-python` - Already in your project

Just run:
```bash
pip3 install -r extra_requirements.txt
```

Then try:
```bash
cd p2p
python3 quick_status.py
```

---

**Pro Tip:** Combine with HashScan web UI for the best experience:
```
https://hashscan.io/testnet/contract/0.0.7307807
```

View events on HashScan **and** use these scripts for detailed analysis!
