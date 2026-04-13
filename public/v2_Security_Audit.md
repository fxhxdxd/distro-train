# distro-train — Security Audit

**Date**: 2026-04-13
**Scope**: Full codebase review — smart contracts, P2P layer, trainer execution, API server, frontend, cryptographic primitives.
**Goal**: Identify all attack surfaces relevant to decentralized federated learning; compare with the state of the art.

---

## Executive Summary

The system has **four critical vulnerabilities** that are exploitable today with no tooling beyond a Hedera testnet account, three of which cause direct fund loss or full node compromise. Several high-severity gaps also exist. The good news: P0 fixes are all small changes (1–50 lines), and the system's core differentiator — decentralized marketplace with blockchain escrow — remains architecturally sound once the gaps are closed.

---

## CRITICAL Vulnerabilities

### C1. `setPendingWithdrawal()` is Public and Unrestricted

**File**: `contracts/contracts/fed-learn.sol:192`

```solidity
function setPendingWithdrawal(address _address, uint256 _amount) public {
    pendingWithdrawals[_address] = _amount;
}
```

**Attack**: Any address calls `setPendingWithdrawal(attacker, MAX_UINT)`, then calls `withdrawPending()` to drain the entire contract balance in one transaction.

**Impact**: Total loss of all escrowed HBAR across all tasks.

**Fix**: Delete the function entirely, or restrict with `onlyOwner`. This function has no legitimate external caller — it was likely a debugging helper that was never removed.

---

### C2. Whitelist Disabled on Deployed Contract — Open Reward Theft

**File**: `contracts/contracts/fed-learn.sol:128`

```solidity
// ✅ WHITELIST CHECK REMOVED FOR TESTING
```

The active contract (`0.0.6917091`) has no access control on `submitWeights()`. Any Hedera account can:

1. Watch for `TaskCreated` events on the mirror node.
2. Immediately call `submitWeights(taskId, "garbage")` for each of `numChunks` chunks.
3. Collect the full per-chunk reward (`perChunkReward * numChunks = total escrow`).

Since `remainingChunks` reaches 0, legitimate trainers can no longer submit, and the ML user receives garbage or no weights.

**Impact**: Financial loss of 100% of escrow per task + training DoS.

**Fix**: Re-enable whitelist in a new contract deployment. For a stronger design, implement a commit-reveal scheme: trainers must first commit `keccak256(weights_cid || nonce)`, wait for a commit window, then reveal — preventing front-running.

---

### C3. `exec()` on Untrusted Model Code — RCE on Trainer Nodes

**File**: `p2p/machine_learning.py:106-116`, `p2p/machine_learning.py:255-262`

```python
exec_namespace = {
    '__builtins__': __builtins__,   # full Python stdlib
    'DATASET_PATH': dataset_file,
    'os': os,                       # filesystem + env access
}
exec(model_code, exec_namespace)
```

The trainer downloads a Python script from IPFS and executes it with unrestricted `__builtins__` and `os`. A malicious ML user uploads a model that:

- Reads `os.getenv("OPERATOR_KEY")` → steals the trainer's Hedera private key
- Calls `os.getenv("PINATA_API_KEY")` → steals IPFS storage credentials
- Reads arbitrary filesystem paths (`~/.ssh/`, AWS credentials, etc.)
- Spawns child processes, opens reverse shells, or installs persistent malware
- Transfers all HBAR from the trainer's account before the training "completes"

**Impact**: Complete compromise (key theft, fund theft, persistent backdoor) of every trainer node that accepts any task.

**Fix**: Sandbox execution in an isolated container with:
- No network access
- No environment variable inheritance
- Read-only filesystem (except for the specific temp dataset file)
- CPU and memory limits
- Killed after a timeout

Options: Docker (`--network none --read-only --env-file /dev/null`), gVisor, Firecracker microVM, or a restricted Python interpreter (RestrictedPython).

---

### C4. RSA Private Key Hardcoded in Source Code

**File**: `frontend/src/ui/utils/constant.ts:4-31`

A full 2048-bit RSA private key PEM is committed into the source tree:

```typescript
export const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PRIVATE KEY-----`;
```

The corresponding public key is hardcoded into `coordinator.py:190-200`.

**Impact**: Anyone with repository access can decrypt all weight URLs encrypted under this key. (Though encryption is not currently wired up — see H1.)

**Fix**: Never commit private keys. Generate an ephemeral keypair per training session in memory, as `beginFinalTraining()` in `TrainingContext.tsx` already does correctly. Remove `privateKeyPem` from `constant.ts` and the hardcoded public key from `coordinator.py`.

---

## HIGH Severity

### H1. Weight URL Encryption Not Actually Wired Up

**Files**: `p2p/coordinator.py:453`, `p2p/coordinator.py:496-522`

The README describes RSA-OAEP encryption of weight URLs. The code loads the RSA public key correctly at line 453:

```python
self.client_pub_key = serialization.load_pem_public_key(pub_key.encode("utf-8"), ...)
```

But the key is **never used**. At line 496-522, the raw IPFS CID is extracted and submitted directly:

```python
ipfs_cid = weights_url_str.split('/')[-1].split('?')[0]
self.publish_on_chain(self.current_task_id, ipfs_cid)
```

Similarly, `decryptMessage()` exists in `hederaHelper.ts` but is never called inside `fetchWeightsSubmittedEvent()`.

**Impact**: All trained weight files are publicly discoverable from Hedera event logs. Anyone scanning `WeightsSubmitted` events can download the ML user's trained model for free.

**Fix**: Encrypt the CID with `self.client_pub_key` before calling `publish_on_chain()`. The code for this is commented out in `coordinator.py:206-265` — uncomment and integrate it.

---

### H2. No Weight Verification Before Payment

**File**: `contracts/contracts/fed-learn.sol:120-153`

`submitWeights()` transfers the per-chunk reward immediately upon any call. There is no verification that the submitted weights are:
- Parseable
- Produced by training on the assigned chunk
- Non-adversarial

The `/verify-weight` endpoint in `coordinator.py:1005` exists for post-hoc verification, but:
- It runs **after** payment has been made
- It is optional (the user must trigger it manually)
- sklearn's LogisticRegression may produce different weights across environments (solver stochasticity, numerical precision), causing false verification failures for honest trainers

**Impact**: Trainers can submit garbage weights and collect full payment.

**Fix (protocol-level)**: Implement a challenge-response slash mechanism:
1. Trainer submits a commitment hash of their weights (not the weights themselves).
2. After a time window, trainer reveals the weights.
3. A random fraction of submissions are challenged: the client node re-runs training on the same chunk and compares.
4. Dishonest trainers lose their stake.

---

### H3. API Server — No Authentication, Wildcard CORS

**File**: `p2p/coordinator.py:903-907`

```python
@app.after_request
async def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response
```

All endpoints (`/command`, `/upload/file`, `/upload/dataset`, `/verify-weight`, `/generate-presigned-url`) accept requests from any origin with zero authentication.

**Attack scenarios**:
- Any webpage visited by the node operator can send commands to the node via cross-origin fetch.
- Any process on the local network can call `/command` with `{"cmd": "train", ...}` to trigger training with an arbitrary (malicious) model script — which then executes via C3.
- Any process can call `/upload/file` to exfiltrate files to IPFS using the node's Pinata credentials.

**Fix**: Add API key authentication (shared secret between frontend and node, passed as `Authorization` header). Restrict CORS to `app://localhost` (Electron's origin). Bind API to `127.0.0.1` for roles that only serve the local frontend.

---

### H4. P2P Messages Unencrypted and Unsigned

**File**: `p2p/coordinator.py:441-443`

```python
await self.pubsub.publish(
    parts[1],
    f"assign {model_hash} {pub_key} {assignments}".encode(),
)
```

The `assign` message — containing chunk URLs, the RSA public key, and the node-to-chunk assignment map — travels in plaintext through the GossipSub mesh. Any node on the mesh can:

- Read all assignments and the RSA public key
- Inject a forged `assign` message with their own `peer_id` in the assignments dict to steal chunks
- Substitute a different RSA public key to later decrypt weight URLs
- Replay old assignments to trigger redundant training

**Fix**: Sign all P2P messages with the sender's libp2p identity key and verify the signature on receipt. GossipSub in newer versions supports message signing — enable it. Additionally, authenticate the `assign` message as coming from the expected client node peer ID.

---

## MEDIUM Severity

### M1. Sybil Attack — No Stake Requirement for Trainers

Creating Hedera testnet accounts is free. An attacker can register N trainer nodes, each receiving ≈1/N of the chunks via round-robin assignment. Combined with H2 (no verification), the attacker submits garbage for all assigned chunks and collects proportional rewards.

Even with whitelist re-enabled, `whitelist_manager.py` has no economic gate — the contract owner adds accounts for free.

**Mitigation**: Require trainers to lock a stake deposit (e.g., 2× the expected chunk reward) before being whitelisted. Stake is slashed if a verification challenge fails.

---

### M2. `ast.literal_eval` DoS on P2P Data

**File**: `p2p/coordinator.py:458`

```python
assignments: dict = ast.literal_eval(parts[3])
```

`ast.literal_eval` is safer than `eval` but still parses arbitrary Python literal syntax received from the P2P network. A crafted deeply-nested or extremely large literal (e.g., 50 MB of `[[[[[[...]]]]]]`) will exhaust CPU and memory on the trainer node.

**Fix**: Validate `len(parts[3]) < MAX_ASSIGNMENT_SIZE` before parsing. Switch to JSON encoding for the assignments dict (use `json.dumps` on the client side, `json.loads` on trainer side) — JSON parsers have better DoS protections and produce predictable types.

---

### M3. Defense Settings Default to OFF

**File**: `frontend/src/ui/components/history/AggregationModal.tsx:93-98`

```typescript
const [defense, setDefense] = useState<DefenseSettings>({
    normClipping: false,     // disabled
    cosineFilter: false,     // disabled
    ...
});
```

The norm clipping (Stage 5.1) and cosine filtering (Stage 5.2) defenses are available but default to disabled. Even when enabled, they run in the frontend after payment — they cannot prevent fund loss, only improve model quality.

**Fix**: Default both to enabled with conservative values (`maxNorm: 10`, `cosineThreshold: 0.5`). Add a tooltip explaining what each setting does.

---

### M4. Credentials in `localStorage` (Web Mode)

**File**: `frontend/src/ui/utils/credentialsHelper.ts:31`

In non-Electron mode, Pinata API keys, Hedera keys, and JWT tokens are stored in `localStorage`, which is accessible to any XSS payload on the same origin. Electron mode correctly uses `keytar` (OS keychain).

**Fix**: Ensure the app is always run in Electron mode (disable the web fallback path entirely). If web mode must be supported, use `sessionStorage` (cleared on tab close) or the Web Crypto API for key-encrypted storage.

---

### M5. No Task Timeout / Expiration

**File**: `contracts/contracts/fed-learn.sol`

Tasks have no deadline. `cancelTask()` is only allowed when `remainingChunks == numChunks` (before any submission). If training stalls after even a single submission, the remaining escrow is locked forever with no recourse.

**Fix**: Add a `deadline` field to the `Task` struct. Allow the depositor to call `cancelTask()` after the deadline regardless of remaining chunks, with partial refund of unredeemed chunk rewards.

---

### M6. Integer Division Remainder Permanently Locked

**File**: `contracts/contracts/fed-learn.sol:92`

```solidity
uint256 perChunk = msg.value / numChunks;
```

If `msg.value` is not evenly divisible by `numChunks`, the remainder (`msg.value % numChunks`) is permanently trapped in the contract. For large tasks or HBAR values, this can be non-trivial.

**Fix**: Track the remainder explicitly and return it to the depositor in `cancelTask()` or after all chunks are submitted.

---

## Vulnerability Summary Table

| ID | Severity | Issue | Exploitable Now |
|----|----------|-------|-----------------|
| C1 | Critical | `setPendingWithdrawal` drains contract | Yes — fund loss |
| C2 | Critical | Whitelist disabled — reward theft + training DoS | Yes — fund loss |
| C3 | Critical | `exec()` on untrusted code — full RCE on trainers | Yes — node compromise |
| C4 | Critical | RSA private key hardcoded in source | Yes — key exposure |
| H1 | High | Weight encryption not implemented | Yes — model leakage |
| H2 | High | No verification before payment | Yes — fund loss |
| H3 | High | API zero-auth + wildcard CORS | Yes — arbitrary control |
| H4 | High | P2P messages unsigned/unencrypted | Yes — message injection |
| M1 | Medium | No trainer stake — Sybil attack | Yes — reward drain |
| M2 | Medium | `ast.literal_eval` DoS on P2P data | Yes — node DoS |
| M3 | Medium | Defenses default to off | By design |
| M4 | Medium | `localStorage` credential storage (web mode) | Web mode only |
| M5 | Medium | No task expiration — funds locked | Yes — fund lock |
| M6 | Medium | Integer division remainder locked | Yes — dust lock |

---

## Competition Analysis — What to Incorporate

### distro-train's Unique Advantages

| Feature | distro-train | Flower / PySyft / OpenFL / TFF |
|---------|-------------|-------------------------------|
| Decentralized peer discovery | GossipSub P2P mesh | Central server (gRPC/HTTP) |
| Trustless payments | Hedera smart contract escrow | None — trust-based |
| Immutable audit trail | HCS consensus logs | None or custom logging |
| Content-addressed storage | IPFS/Pinata for data distribution | Direct gRPC transfer |
| Open marketplace | Any trainer can join & earn | Closed federation |

No FL framework has a decentralized marketplace with blockchain escrow. This is a genuine architectural differentiation.

---

### What Competitors Have That You Should Incorporate

#### 1. Secure Aggregation (PySyft / Flower) — Priority: HIGH

**What it does**: Prevents the aggregator (your frontend) from seeing individual weight files. Each trainer's contribution is secret-shared so the aggregator only learns the sum, not individual values.

**How it fits**: Using additive secret sharing:
1. Each trainer generates a random mask vector (same length as weights).
2. Trainer i sends mask to trainer j and subtracts it from their own weights before submitting.
3. Masks cancel out during summation — the aggregator gets the true average, but no individual model is visible.

**Why it matters**: Protects trainer IP. Currently, your frontend downloads and reads every trainer's weights in plaintext.

---

#### 2. FedProx (Flower / TFF) — Priority: MEDIUM

**What it does**: Adds a proximal regularization term to the local training objective:

```
L_local(w) = L_original(w) + (μ/2) ||w - w_global||²
```

**Why it matters**: Your fixed-size chunking (no shuffling, no stratification) produces non-IID data distributions across trainers. FedAvg diverges on non-IID data. FedProx penalizes local models from drifting too far from the global model, dramatically improving convergence.

**Implementation effort**: Modify the model script to accept `W_GLOBAL` as a parameter and include the regularization term in the loss. The global weights can be sent alongside the chunk assignment in the `assign` P2P message.

---

#### 3. Differential Privacy (PySyft) — Priority: MEDIUM

**What it does**: Adds calibrated Gaussian noise to weights before IPFS upload:

```
w_noisy = w + N(0, σ² · S²)
```

where `S` is the L2 sensitivity (bounded by your existing norm clipping) and `σ` is set to achieve `(ε, δ)`-DP.

**Why it matters**: Provides a formal mathematical privacy guarantee against model inversion attacks. An attacker who downloads trained weights cannot reconstruct individual training records.

**Implementation effort**: ~15 lines in `fedAvg.ts`. You already have norm clipping (Stage 5.1) which is the prerequisite for bounded sensitivity. Add a `differentialPrivacy: boolean` and `epsilonBudget: number` to `DefenseSettings`.

---

#### 4. Client Selection / Quality-Aware Assignment (Flower / Oort) — Priority: MEDIUM

**What it does**: Instead of round-robin, select trainers based on:
- Compute speed (training + upload time from previous rounds)
- Data quality (local validation loss)
- Trust score (cosine similarity history)
- Reliability (did they successfully submit in previous rounds?)

**Why it matters**: Your current assignment treats a phone CPU and a cloud A100 identically. Oort-style selection balances exploration (new trainers) with exploitation (proven trainers).

**Implementation effort**: Extend the trainer "join" message to include a self-reported capability score. Track per-trainer success history in the bootstrap node's mesh summary. Modify `assign_chunks_to_nodes()` in `machine_learning.py` to do weighted assignment.

---

#### 5. FedOpt / Momentum (Flower / TFF) — Priority: LOW

**What it does**: Replaces plain averaging with server-side momentum:

```
Δ = FedAvg(Δ₁, Δ₂, ..., Δₙ)
w_global = w_global + η · (m + Δ)   # SGD with momentum
```

**Why it matters**: Better convergence than plain FedAvg, especially in non-IID settings. The aggregation step happens in your frontend during the `AggregationModal`, so this is a pure frontend change.

---

#### 6. Gradient Compression (DeepSpeed / Horovod) — Priority: LOW (future)

**What it does**: Reduces IPFS upload/download overhead via:
- Top-K sparsification: transmit only the K largest weight changes
- Quantization: reduce float64 to float16 or int8

**Why it matters**: Not critical for sklearn (small weight vectors), but becomes essential if you scale to neural networks.

---

### Recommended Implementation Order

| Priority | Fix | Effort | Blocks |
|----------|-----|--------|--------|
| **P0** | Delete / restrict `setPendingWithdrawal()` (C1) | 1 line | Contract redeploy |
| **P0** | Re-enable whitelist (C2) | Contract redeploy | — |
| **P0** | Sandbox `exec()` in Docker with `--network none` (C3) | ~1 day | — |
| **P0** | Remove hardcoded private key from `constant.ts` (C4) | 5 min | — |
| **P1** | Wire up RSA encryption in trainer submit path (H1) | ~50 lines | — |
| **P1** | Add API key auth to `/command` and upload endpoints (H3) | ~30 lines | — |
| **P1** | Sign P2P `assign` messages with libp2p identity key (H4) | ~40 lines | — |
| **P1** | Enable norm clipping + cosine filter by default (M3) | 2 lines | — |
| **P2** | Add task deadline + partial refund (M5) | Contract change | — |
| **P2** | Implement FedProx in model script | Model script | — |
| **P2** | Add differential privacy to `fedAvg.ts` | ~15 lines | P1 (norm clip) |
| **P2** | Stake-based Sybil gating (M1) | Contract change | — |
| **P3** | Secure aggregation via additive secret sharing | Major change | P1 (encryption) |
| **P3** | Oort-style client selection | Mesh + assignment | — |
| **P3** | FedOpt momentum aggregation | Frontend only | — |

---

*Generated from full codebase review on 2026-04-13. All file references include line numbers verified at time of writing.*
