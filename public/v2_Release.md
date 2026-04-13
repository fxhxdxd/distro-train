# v2 Release Plan — Verification & Federated Averaging

## Overview

Three features that build on each other in sequence:

1. **Weight-to-Node Attribution** — Show which trainer produced which weight file
2. **Weight Verification** — Deterministic replication to prove trainers ran the model honestly
3. **Federated Averaging** — Aggregate verified weights into a single global model

---

## Feature 1: Weight-to-Node Attribution

### Problem

Weight files are listed as "Weight File #1", "#2", etc. with no indication of which trainer node produced them. The data exists on-chain but is discarded, WE can use that as the single source of truth for attribution. 

### Key Insight: The Blockchain Already Has This Data

The `WeightsSubmitted` event emits:

```
taskId (uint256, indexed)
trainer (address, indexed)    ← THIS IS DISCARDED TODAY
weightsHash (string)
rewardAmount (uint256)
remainingChunks (uint256)
```

`fetchWeightsSubmittedEvent` in `hederaHelper.ts:162` already decodes `event.trainer` (line 215) but only logs it — never returns it. The fix is to return structured data instead of flat strings.

### Implementation

#### Step 1: New return type for `fetchWeightsSubmittedEvent`

**File**: `frontend/src/ui/utils/hederaHelper.ts`

```ts
export interface WeightEntry {
  url: string;             // presigned URL or bare CID (for download)
  cid: string;             // bare IPFS CID (canonical identifier)
  trainerAddress: string;  // Hedera account ID, e.g. "0.0.12345"
}
```

Change return type from `Promise<string[] | null>` to `Promise<WeightEntry[] | null>`.

Inside the loop, instead of `foundWeights.push(presignedUrl)`, push:

```ts
foundWeights.push({
  url: presignedUrl ?? cid,
  cid,
  trainerAddress: AccountId.fromSolidityAddress(event.trainer as string).toString(),
});
```

#### Step 2: Update history storage schema

**Files**: `TrainingHistory.tsx`, `historyHandlers.ts`, `renderer.d.ts`, `preload.cts`, `historyHelper.ts`

Add `weightsMetadata?: WeightEntry[]` to `TrainingProject` interface. When training completes, store both:

- `weightsHash` (comma-separated string, backward compat)
- `weightsMetadata` (structured array with trainer addresses)

In `TrainingHistory.tsx` polling (line 62-74), after `fetchWeightsSubmittedEvent` returns:

```ts
const weightsArray = await fetchWeightsSubmittedEvent(CONTRACT_ID, job.id);
if (weightsArray && weightsArray.length > 0) {
  const weightsHash = weightsArray.map(w => w.url).join(', ');
  await updateTrainingHistoryItem({
    projectId: job.id,
    newStatus: 'Completed',
    newWeightsHash: weightsHash,
    weightsMetadata: weightsArray,  // NEW
  });
}
```

Update the full IPC chain (`historyHelper.ts` → `preload.cts` → `historyHandlers.ts`) to pass `weightsMetadata` through to electron-store.

#### Step 3: Update ProjectDetailsModal UI

**File**: `frontend/src/ui/components/history/ProjectDetailsModal.tsx`

Modify `WeightsHashRow` to accept optional `weightsMetadata: WeightEntry[]`. When available, display:

```
Weight File #1
Trainer: 0.0.4828371
CID: QmXyz...

Weight File #2
Trainer: 0.0.4828392
CID: QmAbc...
```

When `weightsMetadata` is not available (older entries), fall back to current display.

#### Why Not Scaler-Mean Fingerprinting?

The `scaler_mean` in each weight file does differ per chunk (each chunk has different data distribution), so fingerprinting could theoretically work by:

1. Download each weight file, parse `scaler_mean`
2. Download each chunk, compute `scaler_mean` locally
3. Match by closest distance

But this is fragile (requires downloading everything), slow, and unnecessary — the blockchain already provides an authoritative mapping. Use on-chain data. Save fingerprinting as a secondary "trust but verify" mechanism if needed.

### Files Modified


| File                                                         | Change                                              |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `frontend/src/ui/utils/hederaHelper.ts`                      | New `WeightEntry` interface, return structured data |
| `frontend/src/ui/pages/TrainingHistory.tsx`                  | Handle `WeightEntry[]` from fetch, store metadata   |
| `frontend/src/ui/components/history/ProjectDetailsModal.tsx` | Display trainer address per weight                  |
| `frontend/src/electron/ipc/historyHandlers.ts`               | Persist `weightsMetadata` field                     |
| `frontend/src/ui/utils/historyHelper.ts`                     | Add `weightsMetadata` to update params              |
| `frontend/src/electron/preload.cts`                          | Pass `weightsMetadata` through IPC                  |
| `frontend/src/ui/renderer.d.ts`                              | Type for `weightsMetadata` in IPC                   |


---

## Feature 2: Weight Verification (Deterministic Replication)

### Problem

After training, the user has no way to verify that trainers actually ran the model honestly. A malicious trainer could submit garbage weights and still receive payment.

### Approach: Deterministic Replication

Re-run the exact same model on the exact same data chunk and compare outputs. If the trainer ran the code honestly, the results should match.

**Why this works for the current system**:

- The model script (`ml1_code.py`) uses sklearn's `LogisticRegression(max_iter=10000)` with default solver `lbfgs`
- `lbfgs` is deterministic (no random initialization)
- Same input data + same algorithm = same output weights
- Comparison with numerical tolerance handles minor floating-point differences across platforms

**Limitations**:

- Models with random components (neural nets, random forests) won't produce exact matches — would need seed control
- Requires running compute on the verifier's machine
- Only verifies one chunk at a time (spot-check, not full audit)

### Prerequisite: Chunk-to-Weight Mapping

Currently the system doesn't record which chunk produced which weight. We need this mapping for verification.

**Source of truth**: The client node's `assign_chunks_to_nodes()` produces `{peer_id: [chunk_urls]}`. The blockchain's `WeightsSubmitted` events are emitted per-chunk-per-trainer in the same order the trainer processes them.

**Mapping strategy**:

1. Store the assignment dict when training starts (`{peer_id: [chunk_url_0, chunk_url_1, ...]}`)
2. From blockchain events, group `WeightsSubmitted` by trainer address
3. Map trainer's Nth weight → trainer's Nth assigned chunk
4. Result: each weight entry gets a `chunkUrl` field

This requires storing additional data at training start time.

### Implementation

#### Step 1: Store training metadata when training starts

**File**: `frontend/src/ui/contexts/TrainingContext.tsx` → `beginFinalTraining()`

After `startFinalTraining()` succeeds, also store in history:

```ts
await updateTrainingHistoryItem({
  projectId,
  newStatus: 'Running',
  trainerCount,
  trainingMetadata: {           // NEW
    datasetHash: result.datasetHash,
    modelHash: result.modelHash,
    chunkCount: result.chunkCount,
  }
});
```

**File**: `frontend/src/electron/ipc/historyHandlers.ts`

Persist `trainingMetadata` alongside existing fields.

#### Step 2: Derive chunk-to-weight mapping

When `fetchWeightsSubmittedEvent` returns, the events are already grouped implicitly. Extend `WeightEntry`:

```ts
export interface WeightEntry {
  url: string;
  cid: string;
  trainerAddress: string;
  chunkIndex?: number;     // NEW: derived from assignment order
  chunkUrl?: string;       // NEW: the specific chunk URL
}
```

To derive the mapping, the frontend needs the assignment dict. Two options:

**Option A (simpler)**: The client node already broadcasts `"assign {model_hash} {pub_key} {assignments}"`. Add a new API endpoint that returns the stored assignment for a given task:

```
GET /task-assignments/{taskId}
→ { "peer_id_1": ["chunk_url_0", "chunk_url_2"], "peer_id_2": ["chunk_url_1"] }
```

**Option B (self-contained)**: After training completes, fetch the manifest from IPFS (it's stored as `datasetHash` in history), re-derive chunk URLs, and use the order of `WeightsSubmitted` events per trainer to infer the mapping.

**Recommended: Option A** for reliability. The client node has the authoritative mapping.

#### Step 3: New verification endpoint on client node

**File**: `p2p/coordinator.py` — Add route to the Quart app:

```python
@app.route("/verify-weight", methods=["POST"])
async def verify_weight():
    """Re-run model on a chunk and return computed weights for comparison."""
    data = await request.get_json()
    chunk_url = data.get("chunkUrl")
    model_url = data.get("modelUrl")

    if not chunk_url or not model_url:
        return jsonify({"error": "chunkUrl and modelUrl required"}), 400

    # Download chunk and model to temp files
    # Run exec() with same setup as trainer
    # Return computed weights string
    ...
    return jsonify({"status": "ok", "weights": weights_str})
```

This reuses the same `exec()` logic from `machine_learning.py:train_on_chunk` but without uploading to IPFS.

#### Step 4: Weight comparison logic (frontend)

**New file**: `frontend/src/ui/utils/weightComparison.ts`

```ts
interface ParsedWeights {
  coefficients: number[][];
  intercept: number[];
  classes: number[];
  scaler_mean: number[];
  scaler_scale: number[];
}

function parsePythonDict(raw: string): ParsedWeights { ... }

function compareWeights(
  submitted: ParsedWeights,
  recomputed: ParsedWeights,
  tolerance: number = 1e-6
): { match: boolean; maxDeviation: number; details: string[] } { ... }
```

**Parser challenge**: Weight files are Python `repr()` strings (single quotes, Python-style), not JSON. The parser must:

1. Replace single quotes with double quotes
2. Handle Python `True`/`False`/`None` → `true`/`false`/`null`
3. `JSON.parse()` the result

For the current logistic regression format, a regex-based cleanup suffices. For general Python objects, would need a proper parser.

#### Step 5: Verification UI

**Option A**: Add a "Verify" button per weight file in `ProjectDetailsModal.tsx` `WeightsHashRow`.

**Option B (recommended)**: New `VerificationModal.tsx` component opened from `ProjectDetailsModal`.

Flow:

1. User clicks "Verify" on a weight file
2. Modal shows: chunk URL, model URL, trainer address
3. "Run Verification" button → calls `/verify-weight` endpoint
4. Progress spinner while re-training
5. Result: green checkmark (verified) or red X (mismatch) with deviation details

```
┌─────────────────────────────────────────┐
│ Verify Weight File #1                   │
│                                         │
│ Trainer: 0.0.4828371                    │
│ Chunk: QmChunkCid...                    │
│ Submitted Weight: QmWeightCid...        │
│                                         │
│ [Run Verification]                      │
│                                         │
│ ✅ VERIFIED                             │
│ Max coefficient deviation: 2.3e-15      │
│ Intercept deviation: 0.0                │
└─────────────────────────────────────────┘
```

### Files Modified/Created


| File                                                         | Change                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `p2p/coordinator.py`                                         | New `/verify-weight` endpoint                                      |
| `p2p/machine_learning.py`                                    | New `verify_chunk()` method (like `train_on_chunk` without upload) |
| `frontend/src/ui/utils/weightComparison.ts`                  | **NEW** — parser + comparison logic                                |
| `frontend/src/ui/utils/hederaHelper.ts`                      | Extend `WeightEntry` with `chunkUrl`                               |
| `frontend/src/ui/utils/apiHelper.ts`                         | New `verifyWeight()` API call                                      |
| `frontend/src/ui/components/history/VerificationModal.tsx`   | **NEW** — verification UI                                          |
| `frontend/src/ui/components/history/ProjectDetailsModal.tsx` | "Verify" button per weight                                         |
| `frontend/src/ui/contexts/TrainingContext.tsx`               | Store metadata at training start                                   |
| `frontend/src/electron/ipc/historyHandlers.ts`               | Persist `trainingMetadata`                                         |
| History IPC chain (preload, renderer.d.ts, historyHelper)    | Type updates                                                       |


### Alternative Considered: Statistical Verification

Instead of re-running training, download the weight file and run inference on a held-out validation set:

- If accuracy is above a threshold → "probably honest"
- If accuracy is near random → "definitely cheating"

**Pros**: Faster, doesn't require re-training, works for non-deterministic models.
**Cons**: A trainer could submit a low-quality but non-random model. Doesn't prove they used the assigned data.

**Verdict**: Deterministic replication is stronger for this system since the current model is deterministic. Statistical verification could be added as a complement later.

---

## Feature 3: Federated Averaging (FedAvg)

### Problem

After training, the user has N separate weight files (one per chunk). These need to be aggregated into a single global model.

### Algorithm

For the current weight format (sklearn LogisticRegression):

```python
{
  'coefficients': [[c1, c2, ..., c30]],
  'intercept': [b],
  'classes': [0, 1],
  'scaler_mean': [m1, m2, ..., m30],
  'scaler_scale': [s1, s2, ..., s30]
}
```

**FedAvg** (simple unweighted average across N weight files):

```
global_coefficients[j] = (1/N) * Σ(weight_i.coefficients[j])  for j in 0..29
global_intercept       = (1/N) * Σ(weight_i.intercept)
global_scaler_mean[j]  = (1/N) * Σ(weight_i.scaler_mean[j])
global_scaler_scale[j] = (1/N) * Σ(weight_i.scaler_scale[j])
global_classes         = weight_0.classes  (same for all)
```

**Why simple average**: All chunks are ~50KB (byte-size threshold), so row counts are approximately equal. Weighted average (proportional to sample count per chunk) is technically better but requires knowing per-chunk row counts, which aren't currently stored.

**Future enhancement**: Store `rowCount` per chunk during the chunking phase, then use weighted FedAvg: `w_i = rowCount_i / totalRows`.

### Where to Run

**In the frontend (TypeScript)**: The averaging is pure arithmetic — element-wise addition and division. No ML libraries needed. Running in the renderer process is fast for the current weight format (30 coefficients per file).

**Why not Python/backend**: Would add unnecessary network round-trips. The weights are already downloaded to the frontend for display. Averaging 3 arrays of 30 numbers is trivial in JS.

### Implementation

#### Step 1: Weight parser

**New file**: `frontend/src/ui/utils/fedAvg.ts`

Reuse the `parsePythonDict` from `weightComparison.ts` (or share the parser).

```ts
export interface ModelWeights {
  coefficients: number[][];
  intercept: number[];
  classes: number[];
  scaler_mean: number[];
  scaler_scale: number[];
}

export function parseWeightString(raw: string): ModelWeights { ... }
```

#### Step 2: FedAvg function

```ts
export function federatedAverage(weights: ModelWeights[]): ModelWeights {
  const N = weights.length;
  const numCoeffs = weights[0].coefficients[0].length;

  const avgCoefficients = new Array(numCoeffs).fill(0);
  let avgIntercept = 0;
  const avgScalerMean = new Array(numCoeffs).fill(0);
  const avgScalerScale = new Array(numCoeffs).fill(0);

  for (const w of weights) {
    for (let j = 0; j < numCoeffs; j++) {
      avgCoefficients[j] += w.coefficients[0][j] / N;
      avgScalerMean[j] += w.scaler_mean[j] / N;
      avgScalerScale[j] += w.scaler_scale[j] / N;
    }
    avgIntercept += w.intercept[0] / N;
  }

  return {
    coefficients: [avgCoefficients],
    intercept: [avgIntercept],
    classes: weights[0].classes,
    scaler_mean: avgScalerMean,
    scaler_scale: avgScalerScale,
  };
}
```

#### Step 3: UI — Post-training aggregation

Add to `ProjectDetailsModal.tsx` (or new `AggregationModal.tsx`):

1. "Run Federated Averaging" button appears when:
  - Training is `Completed`
  - At least 2 weight files exist
  - (Optionally) all weights are verified
2. On click:
  - Download each weight file content (via presigned URLs)
  - Parse each into `ModelWeights`
  - Run `federatedAverage()`
  - Display the global model weights
  - "Download Global Model" button to save as `.txt` or `.json`
3. Store the averaged result in history:
  - New field: `globalWeights?: string` (serialized averaged weights)
  - Upload to IPFS optionally (for sharing)

#### Step 4: Result display

```
┌───────────────────────────────────────────────┐
│ Federated Averaging                           │
│                                               │
│ Input: 3 weight files                         │
│ Method: FedAvg (simple average)               │
│                                               │
│ Global Model Coefficients:                    │
│ [0.4357, 0.4433, 0.4198, ...]                │
│                                               │
│ Global Intercept: -1.2361                     │
│                                               │
│ [Download Global Model]  [Upload to IPFS]     │
└───────────────────────────────────────────────┘
```

### Files Modified/Created


| File                                                         | Change                              |
| ------------------------------------------------------------ | ----------------------------------- |
| `frontend/src/ui/utils/fedAvg.ts`                            | **NEW** — parser + FedAvg algorithm |
| `frontend/src/ui/components/history/AggregationModal.tsx`    | **NEW** — averaging UI              |
| `frontend/src/ui/components/history/ProjectDetailsModal.tsx` | "Run FedAvg" button                 |
| `frontend/src/ui/utils/apiHelper.ts`                         | Download weight file contents       |
| History IPC chain                                            | Store `globalWeights`               |


---

## Phase 4: Operator ID & Key Management

### Problem

The system uses three `.env` files with overlapping but differently formatted Hedera credentials. Currently all three reference the same account (`0.0.7285006`), but the private key is encoded differently:

| File | `OPERATOR_ID` | Key Variable | Key Format |
| --- | --- | --- | --- |
| `frontend/.env` | `VITE_OPERATOR_ID=0.0.7285006` | `VITE_OPERATOR_KEY` | Raw 32-byte hex (64 chars) |
| `p2p/.env` | `OPERATOR_ID=0.0.7285006` | `OPERATOR_KEY` | DER-encoded hex (104 chars) |
| Root `.env` | `OPERATOR_ID=0.0.7285006` | `OPERATOR_KEY` | DER-encoded hex (104 chars) |

**Why they differ**: The frontend uses `@hashgraph/sdk` (JavaScript), which expects the raw 32-byte secp256k1 private key via `PrivateKey.fromStringECDSA()`. The backend uses `hiero_sdk_python`, which expects the full DER-encoded key (ASN.1 header + raw key) via `PrivateKey.from_string()`.

The DER prefix `3030020100300706052b8104000a04220420` is the ASN.1 envelope for a secp256k1 private key. The raw 32-byte key is identical in both:

```
Frontend:  d28b439549177a178ea0251e9070497c077ac9a2926caa77d0a71859a3879150
Backend:   3030020100300706052b8104000a04220420 | d28b439549177a178ea0251e9070497c077ac9a2926caa77d0a71859a3879150
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
           DER header (18 bytes)                  Same raw key (32 bytes)
```

### Current Problem: Trainer Nodes Share the ML User's Account

All three `.env` files use the same `0.0.7285006`. In production, each trainer node must have its own Hedera account (different Operator ID + Key) because:

1. The smart contract's whitelist system (`addToWhitelist`, `isWhitelisted`) gates weight submissions by account address
2. Weight-to-node attribution (Phase 1) uses the `trainer` address from `WeightsSubmitted` events — if all trainers share one account, all weights appear from the same trainer
3. Escrow payments go to the submitting account — shared accounts mean all rewards land in one wallet

### Current `runner.py` Behavior

`runner.py` loads the root `.env` first (line 30-31), then checks if `OPERATOR_ID` and `OPERATOR_KEY` are set:

```python
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

OPERATOR_KEY = os.getenv("OPERATOR_KEY")
OPERATOR_ID = os.getenv("OPERATOR_ID")
IS_OPERATOR_ID = len(OPERATOR_ID) != 0
IS_OPERATOR_KEY = len(OPERATOR_KEY) != 0
```

If empty, it prompts interactively (lines 48-60). But this fallback **never fires** because the root `.env` always pre-populates both values.

### Implementation: CLI Argument Override

Add `argparse` to `runner.py` with priority chain: **CLI flag > environment variable > `.env` file > interactive prompt**.

```python
import argparse

parser = argparse.ArgumentParser(description="Run a distro-train P2P node")
parser.add_argument("--role", choices=["bootstrap", "client", "trainer"],
                    help="Node role (skips interactive prompt)")
parser.add_argument("--operator-id", help="Hedera Operator ID (e.g. 0.0.12345)")
parser.add_argument("--operator-key", help="Hedera Operator Key (DER-encoded hex)")
args = parser.parse_args()
```

Resolution logic:

```python
operator_id = args.operator_id or os.getenv("OPERATOR_ID") or ""
operator_key = args.operator_key or os.getenv("OPERATOR_KEY") or ""

# For trainer role, always require explicit credentials
if role == "trainer" and not operator_id:
    operator_id = await prompt("Enter Operator ID: ")
if role == "trainer" and not operator_key:
    operator_key = await prompt("Enter Operator Key: ")
```

Usage:

```bash
# Trainer with own account (no .env editing needed)
python p2p/runner.py --role trainer --operator-id 0.0.9999999 --operator-key 3030...

# Client uses .env defaults
python p2p/runner.py --role client

# Bootstrap (no Hedera account needed)
python p2p/runner.py --role bootstrap
```

### Additional: Whitelist Management

Each trainer's Hedera account must be whitelisted before submitting weights. The existing `p2p/whitelist_manager.py` CLI handles this:

```bash
python p2p/whitelist_manager.py add 0.0.9999999    # whitelist a trainer
python p2p/whitelist_manager.py check 0.0.9999999  # verify status
python p2p/whitelist_manager.py remove 0.0.9999999 # revoke access
```

This should be documented alongside the CLI override so that setting up a new trainer is a two-step process: (1) whitelist the account, (2) start the node with `--operator-id`.

### Files Modified

| File | Change |
| --- | --- |
| `p2p/runner.py` | Add `argparse`, priority chain for credentials, role flag |
| `README.md` | Document Operator ID/Key differences and trainer setup |

---

## Phase 5: TrustGossip Pipeline Evaluation

### Background

TrustGossip is a 5-stage per-node pipeline designed for Byzantine-resilient federated learning. Each stage addresses a different attack vector. Below is an evaluation of each stage against the current distro-train system.

### Stage 1: Sybil Resistance (Stake or Proof-of-Work Gating)

**What it does**: Prevents a single adversary from creating many fake identities to dominate the aggregation. Requires trainers to post a bond or solve a PoW puzzle before participating.

**Assessment: CRITICAL — implement first**

The system already has the building blocks:
- Hedera smart contract can enforce a minimum HBAR stake via `createTask()` escrow
- The whitelist system (`addToWhitelist`) acts as manual Sybil gating
- Weight submissions are tied to Hedera accounts (not free to create — each needs HBAR)

**Implementation**: Extend `submitWeights()` to require a trainer deposit (slashable if verification fails). The whitelist already provides a basic version — the upgrade is making it stake-based and automated.

**Priority**: High. Without Sybil resistance, all downstream defenses can be overwhelmed.

### Stage 2: Norm Clipping

**What it does**: Clips the L2 norm of each weight update to a fixed bound before aggregation. Prevents a single poisoned model from having outsized influence.

**Assessment: HIGH VALUE, LOW EFFORT**

For the current logistic regression format, this means:
```
For each weight file:
  norm = sqrt(sum(coefficient_j^2 for all j))
  if norm > MAX_NORM:
    scale all coefficients by MAX_NORM / norm
```

This is ~10 lines of TypeScript in `fedAvg.ts`, applied before the averaging step. No backend changes needed.

**Implementation**: Add a `clipNorm(weights: ModelWeights, maxNorm: number): ModelWeights` function. Apply to each weight file before `federatedAverage()`. A reasonable default for the breast cancer logistic regression model: `maxNorm = 10.0`.

**Priority**: High. Minimal effort, strong defense against model poisoning.

### Stage 3: Cosine Similarity Filtering

**What it does**: Computes pairwise cosine similarity between all submitted weight vectors. Outliers (low similarity to the majority) are excluded from aggregation.

**Assessment: HIGH VALUE, MODERATE EFFORT**

The cosine similarity between two weight vectors is:
```
cos(A, B) = dot(A, B) / (||A|| * ||B||)
```

With N weight files, compute N×N similarity matrix. For each file, compute average similarity to all others. Exclude files below a threshold (e.g., `avg_similarity < 0.5`).

At the current scale (2-5 trainers), this is computationally trivial. It catches both honest-but-divergent models (trained on unusual data subsets) and malicious models (random/adversarial weights).

**Implementation**: New function in `fedAvg.ts`:
```ts
function filterByCosine(weights: ModelWeights[], threshold: number): ModelWeights[]
```

Applied after norm clipping, before averaging.

**Priority**: Medium-High. Pairs well with norm clipping for a two-layer defense.

### Stage 4: Bucketing Aggregation

**What it does**: Instead of averaging all weights together, groups them into clusters (buckets) by similarity, averages within each bucket, then averages across buckets. This reduces the influence of colluding attackers who submit coordinated poisoned updates.

**Assessment: MARGINAL AT CURRENT SCALE**

With 2-5 trainers, bucketing has limited utility:
- 2 trainers → 1 or 2 buckets (trivial)
- 3 trainers → at most 2 meaningful clusters
- Meaningful bucketing needs N ≥ 10 to differentiate clusters from noise

The algorithm complexity is also higher (requires k-means or hierarchical clustering).

**Implementation**: Defer until trainer pool reaches ~10+ nodes. When needed, use a simple 2-bucket split: majority bucket (> 50% of trainers) gets full weight, minority bucket gets discounted.

**Priority**: Low for current scale. Revisit when trainer count grows.

### Stage 5: Trust-Weighted Gossip Mixin

**What it does**: Maintains a per-trainer trust score across multiple training rounds. Trainers whose weights consistently match the majority earn higher trust. The aggregation weights each contribution by its trainer's cumulative trust score.

**Assessment: REQUIRES MULTI-ROUND TRAINING**

The current system runs single-shot training (one round per project). Trust scores are only meaningful when the same trainers participate across multiple rounds, building a reputation.

**Prerequisites**:
- Persistent trainer identity across sessions (Phase 4 solves this)
- Multi-round federated learning protocol (not yet implemented)
- Trust score storage (could use Hedera state or electron-store)

**Implementation**: Design a `TrustStore` that maps `trainerAddress → { rounds, avgSimilarity, trustScore }`. After each round, update scores based on how close each trainer's weights were to the global average. Use `trustScore` as the FedAvg weight instead of uniform 1/N.

**Priority**: Medium-long term. Requires multi-round training infrastructure first.

### Stage 6: Local Differential Privacy (DP) Noise

**What it does**: Each trainer adds calibrated Gaussian noise to their weights before submission, providing formal privacy guarantees (ε-differential privacy).

**Assessment: TRADEOFF — PRIVACY vs. ACCURACY**

For the current logistic regression model with ~30 features:
- Adding noise degrades model quality proportionally to the privacy budget (ε)
- With small trainer pools, the noise budget per trainer is high → significant accuracy loss
- The system already provides data privacy (trainers only see their chunk, not the full dataset)
- Primary threat model is protecting the ML user's data from trainers, not protecting trainers' computations

**Implementation**: Add Gaussian noise to weight vectors before IPFS upload in the trainer's `train_on_chunk()`:
```python
noise = np.random.normal(0, sigma, weights.shape)
noisy_weights = weights + noise
```

Where `sigma` is calibrated to the desired ε and dataset sensitivity.

**Priority**: Low for current use case. The system's privacy model (data stays local) already provides strong protection. DP noise adds formal guarantees but at accuracy cost. Consider for healthcare/financial datasets where formal DP is a compliance requirement.

### TrustGossip Summary

| Stage | Value | Effort | Priority | Depends On |
| --- | --- | --- | --- | --- |
| 1. Sybil Resistance | Critical | Medium | **P0** | Smart contract changes |
| 2. Norm Clipping | High | Low | **P0** | Phase 3 (FedAvg) |
| 3. Cosine Filtering | High | Medium | **P1** | Phase 3 (FedAvg) |
| 4. Bucketing | Low (at scale) | High | **P3** | 10+ trainers |
| 5. Trust-Weighted | High (long-term) | High | **P2** | Multi-round training |
| 6. DP Noise | Situational | Medium | **P3** | Privacy requirements |

**Recommended implementation order**: Norm Clipping → Cosine Filtering → Sybil Stake → Trust Scores → Bucketing → DP Noise.

Norm clipping and cosine filtering are the highest ROI: ~50 lines of TypeScript added to the existing FedAvg pipeline, no backend changes, and they neutralize the most common attack vectors (model poisoning and outlier injection).

---

## Implementation Order

```
Phase 1: Weight-to-Node Attribution
├── 1.1  Define WeightEntry interface
├── 1.2  Modify fetchWeightsSubmittedEvent return type
├── 1.3  Update history IPC chain (5 files)
├── 1.4  Update TrainingHistory polling
└── 1.5  Update ProjectDetailsModal UI

Phase 2: Verification Infrastructure
├── 2.1  Store trainingMetadata (chunk URLs, model URL) at training start
├── 2.2  Add /verify-weight endpoint to coordinator.py
├── 2.3  Add verify_chunk() to machine_learning.py
├── 2.4  Create weightComparison.ts (parser + comparator)
├── 2.5  Add verifyWeight() to apiHelper.ts
└── 2.6  Create VerificationModal.tsx

Phase 3: Federated Averaging
├── 3.1  Create fedAvg.ts (parser + averaging)
├── 3.2  Create AggregationModal.tsx
├── 3.3  Wire download + parse + average flow
└── 3.4  Store global weights in history

Phase 4: Operator ID & Key Management
├── 4.1  Add argparse to runner.py (--role, --operator-id, --operator-key)
├── 4.2  Implement priority chain: CLI > env > .env > prompt
├── 4.3  Force prompt for trainer role when credentials missing
└── 4.4  Document setup in README.md

Phase 5: TrustGossip Pipeline (incremental)
├── 5.1  Norm clipping in fedAvg.ts (before averaging)
├── 5.2  Cosine similarity filtering in fedAvg.ts
├── 5.3  Stake-based Sybil gating in smart contract
├── 5.4  Trust score storage + weighted FedAvg (requires multi-round)
└── 5.5  Bucketing aggregation (deferred until 10+ trainers)
```

**Dependencies**: Phase 2 depends on Phase 1 (needs `WeightEntry` with trainer address). Phase 3 shares the weight parser with Phase 2 but is otherwise independent — can be built in parallel after the parser is done. Phase 4 is independent of Phases 1-3. Phase 5 stages 1-2 depend on Phase 3 (FedAvg pipeline); stage 3 requires smart contract changes; stages 4-5 require multi-round training.

### Estimated Scope


| Phase | New Files | Modified Files | Complexity                                               |
| ----- | --------- | -------------- | -------------------------------------------------------- |
| 1     | 0         | 7              | Low — plumbing structured data through existing pipeline |
| 2     | 3         | 6              | Medium — new endpoint + parser + comparison logic        |
| 3     | 2         | 3              | Low — pure arithmetic + UI                               |
| 4     | 0         | 2              | Low — argparse + docs                                    |
| 5.1-2 | 0         | 1              | Low — ~50 lines in fedAvg.ts                             |
| 5.3   | 0         | 1              | Medium — smart contract modification                     |
| 5.4-5 | 1         | 3              | High — multi-round infrastructure + trust store          |


---

## Appendix: Weight File Format Reference

From the actual training output (`public/Weights/Weight_File_#1.txt`):

```python
{
  'coefficients': [[0.4396, 0.1674, ..., -0.3204]],   # 1×30 matrix
  'intercept': [-3.0860],                               # scalar in array
  'classes': [0, 1],                                     # binary classification
  'scaler_mean': [13.4815, 19.8979, ..., 0.0841],      # 30 feature means
  'scaler_scale': [3.5296, 4.8090, ..., 0.0161]        # 30 feature std devs
}
```

- `coefficients` + `intercept`: Logistic regression parameters (what FedAvg averages)
- `scaler_mean` + `scaler_scale`: StandardScaler parameters (also averaged — each chunk sees different data distribution)
- `classes`: Class labels (constant across chunks — not averaged)

### Why `scaler_mean` differs per chunk

Each chunk is a different subset of the dataset. `StandardScaler` computes `mean` and `std` from the local chunk only. Comparing across files:


| Feature 0 (`scaler_mean[0]`) | Weight #1 | Weight #2 | Weight #3 |
| ---------------------------- | --------- | --------- | --------- |
| Value                        | 13.4815   | 14.1655   | 13.9714   |


These differ because each chunk has different rows → different feature means. After FedAvg, the global `scaler_mean[0]` ≈ 13.8728 (average of the three).