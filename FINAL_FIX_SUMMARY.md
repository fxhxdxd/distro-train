# Final Fix Summary - Contract Revert Issue

## Problem Diagnosis

After extensive debugging, here's what we found:

### What Works ✅
1. Contract deployment successful (0.0.7305867)
2. Whitelist removed - no access control issues
3. Tasks created successfully (4 tasks with 3 chunks each available)
4. Training completes successfully
5. Weights upload to Akave successfully
6. **Manual contract call with short test strings SUCCEEDS**

### What Fails ❌
- Contract submission with **actual encrypted weight URLs** fails with `CONTRACT_REVERT_EXECUTED`

## Root Cause

The RSA-encrypted URLs are **too large** for the contract to handle:
- Each Akave presigned URL is ~500+ characters
- Split into 3 parts = ~170 chars each
- RSA-2048 encryption produces 256-byte ciphertexts
- Base64 encoding = ~344 characters **per part**
- **Total: 1032+ characters** being sent to contract

The contract might be hitting:
1. **Gas limits** (even at 10M gas)
2. **String size limits** in Solidity
3. **Transaction size limits** on Hedera

## Recommended Solutions

### Option 1: Skip Encryption for Testing (FASTEST) ⚡

Temporarily remove encryption to verify the rest of the flow works:

**In `p2p/coordinator.py` around line 542:**
```python
# TEMPORARY: Skip encryption for testing
self.publish_on_chain(
    self.current_task_id,
    str(weights_url, 'utf-8'),  # Send URL directly
    "",  # Empty string
    "",  # Empty string
)
```

**Update contract to accept single string:**
```solidity
function submitWeights(
    uint256 taskId,
    string calldata weight_url  // Single URL instead of 3 parts
) external {
    // ... rest of function
}
```

### Option 2: Hash Instead of Encrypt (RECOMMENDED) 🔐

Store only the hash of the weights URL on-chain:

**In `p2p/coordinator.py`:**
```python
import hashlib

# Hash the weights URL
url_hash = hashlib.sha256(weights_url).hexdigest()

self.publish_on_chain(
    self.current_task_id,
    url_hash,  # Just 64 characters
    "",
    ""
)
```

Store the actual encrypted URL in Akave or HCS separately.

### Option 3: IPFS CID Only (SIMPLE) 📦

Just submit the IPFS CID or Akave hash (not the full presigned URL):

```python
# Extract just the hash from Akave URL
# From: https://o3-rc2.akave.xyz/akave-bucket/HASH?X-Amz-...
# To: HASH
akave_hash = weights_url.split('/')[-1].split('?')[0]

self.publish_on_chain(
    self.current_task_id,
    akave_hash,  # Short hash only
    "",
    ""
)
```

### Option 4: Off-Chain Storage (PRODUCTION) 🏗️

**Don't store URLs on-chain at all:**

1. Submit weights to contract with just a **submission ID**
2. Store encrypted URLs in:
   - Akave (decentralized storage)
   - HCS topic (Hedera Consensus Service)
   - IPFS

```solidity
function submitWeights(uint256 taskId) external {
    // Just mark that trainer submitted
    // No weight data stored on-chain
    t.remainingChunks -= 1;
    // Emit event with submission ID
    emit WeightsSubmitted(taskId, msg.sender);
}
```

Client retrieves weights from HCS/Akave using the submission event.

## Quick Test - Option 1

1. **Modify contract to accept single string:**

```bash
cd contracts/contracts
```

Edit `fed-learn.sol`:
```solidity
function submitWeights(
    uint256 taskId,
    string calldata weights_url
) external {
    Task storage t = tasks[taskId];
    require(t.exists, "task does not exist");
    require(t.remainingChunks > 0, "no rewards remaining for this task");

    t.remainingChunks -= 1;
    uint256 reward = t.perChunkReward;

    (bool sent, ) = payable(msg.sender).call{value: reward}("");
    if (!sent) {
        pendingWithdrawals[msg.sender] += reward;
    }

    emit WeightsSubmitted(taskId, msg.sender, weights_url, "", "", reward, t.remainingChunks);

    if (t.remainingChunks == 0){
        emit TaskCompleted(taskId);
        tasks[taskId].exists=false;
    }
}
```

2. **Recompile and redeploy:**
```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network testnet
```

3. **Update coordinator.py:**
```python
# Around line 542
self.publish_on_chain(
    self.current_task_id,
    weights_url.decode('utf-8') if isinstance(weights_url, bytes) else str(weights_url)
)
```

4. **Update publish_on_chain function signature:**
```python
def publish_on_chain(self, task_id, weights_url):
    try:
        transaction = (
            ContractExecuteTransaction()
            .set_contract_id(self.contract_id)
            .set_gas(5000000)
            .set_function(
                "submitWeights",
                ContractFunctionParameters()
                .add_uint256(task_id)
                .add_string(weights_url)
            )
            .freeze_with(self.client)
            .sign(self.operator_key)
        )
        receipt = transaction.execute(self.client)
        # ... rest of function
```

## Next Steps

1. Choose one of the options above
2. Implement the changes
3. Test with a new task
4. If successful, consider moving to Option 4 for production

## Why This Happens

Solidity strings can theoretically hold large data, but:
- **Gas costs** increase with string size
- **Transaction limits** on Hedera
- **ABI encoding overhead** for large strings

The 1000+ character encrypted strings are just too big for efficient blockchain storage.

**Best Practice:** Store minimal data on-chain, keep large payloads off-chain.

---
**Recommendation:** Use **Option 3** (IPFS CID only) for immediate fix, then move to **Option 4** (off-chain storage) for production.
