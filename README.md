# Distro-Train: Decentralized Federated Learning Platform

A peer-to-peer marketplace connecting ML users (data + models, no compute) with trainers (idle GPUs/CPUs). Built on **py-libp2p**, **Pinata (IPFS)**, and **Hedera blockchain** for trustless, transparent, and cost-efficient distributed model training.

> Reference papers : TODO

## Demo

TODO: 

---

## Architecture

App Architecture

### Components


| Component   | Technology                    | Role                                              |
| ----------- | ----------------------------- | ------------------------------------------------- |
| Frontend    | Electron + React + TypeScript | ML user interface (upload, pay, retrieve weights) |
| P2P Network | py-libp2p + GossipSub         | Decentralized peer discovery, pubsub messaging    |
| Storage     | Pinata (IPFS) / Akave O3 (S3) | Content-addressed dataset and weight storage      |
| Blockchain  | Hedera Smart Contracts + HCS  | Escrow payments, event logging, audit trail       |
| Encryption  | RSA-OAEP 2048-bit             | End-to-end encryption of trained weight URLs      |


### Node Types

- **Bootstrap Node** — Network entry point. Maintains mesh summary, floods peer registry every 2s on `fed-learn` topic.
- **Client Node** — ML user's delegate in the swarm. Creates per-round pubsub topics, broadcasts chunk assignments, collects encrypted weights.
- **Trainer Node** — Joins training topics, fetches assigned chunks, trains locally, uploads weights to IPFS, submits encrypted CID to Hedera.

### End-to-End Workflow

```
1. ML user uploads dataset (CSV) + model script (Python) via frontend
2. Dataset chunked → each chunk pinned to IPFS → manifest (list of chunk URLs) created
3. Model script pinned to IPFS
4. User calls createTask() on Hedera smart contract (deposits HBAR as escrow)
5. Client node creates pubsub topic for the training round
6. Trainer nodes discover and join the topic
7. Client assigns chunks to trainers (round-robin)
8. Each trainer: downloads chunk + model → trains locally via exec() → uploads weights to IPFS
9. Trainer encrypts weight URL with user's RSA public key → submits to Hedera contract
10. Smart contract pays trainer per-chunk reward from escrow
11. Frontend polls Hedera mirror node for WeightsSubmitted events → decrypts → retrieves weights
```

---

## Dataset Chunking Algorithm

The system splits CSV datasets into chunks for distributed training. Each chunk is independently uploaded to IPFS and assigned to a trainer node.

### Current Implementation: Fixed-Size Line-Aware Splitting

**Location**: `frontend/src/electron/pinataCli.ts` (L83-140), `frontend/src/electron/akaveCli.ts` (L96-175)

```
CHUNK_SIZE = 50 KB (50 * 1024 bytes)

1. Extract CSV header (first line)
2. For each subsequent line:
   - If adding the line exceeds CHUNK_SIZE and chunk is non-empty:
     → Prepend header to current chunk, upload to IPFS, start new chunk
   - Else: append line to current chunk
3. Upload final chunk
4. Create manifest file (comma-separated chunk URLs) and upload
5. Return manifest CID + chunk count
```

**Properties**:

- Never splits mid-row (line-boundary aware)
- Header prepended to every chunk (each chunk is a valid CSV)
- Byte-aware sizing using UTF-8 encoding
- Manifest pattern: single file pointing to all chunk CIDs

### Limitations


| Issue                          | Impact                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| Fixed byte-size chunks         | Unequal row counts per chunk → imbalanced training loads                             |
| No shuffling                   | Sequential splitting preserves data ordering → biased local models if data is sorted |
| No stratification              | Class distribution may vary wildly across chunks → poor convergence                  |
| Size-agnostic of trainer count | Chunk count determined by file size, not number of available trainers                |


### Improved Approach: Stratified Row-Count Chunking

A better strategy for federated learning is **stratified, row-count-based chunking** that ensures each chunk has balanced class representation:

```
1. Extract CSV header
2. Shuffle all data rows (seeded random for reproducibility)
3. Group rows by target/label column
4. For each class, distribute rows evenly across N chunks (round-robin)
5. Each chunk gets proportional representation of every class
6. Prepend header to each chunk, upload to IPFS
7. Create and upload manifest
```

**Advantages over fixed-size splitting**:

- **Balanced training**: Equal row counts → uniform compute load per trainer
- **Stratified classes**: Each chunk mirrors the global label distribution → better local model quality and faster federated convergence
- **Shuffle**: Eliminates ordering bias (e.g., data sorted by date or label)
- **Trainer-aware**: Chunk count can match trainer count instead of being dictated by arbitrary byte threshold

---

## Hedera Blockchain

### Smart Contract (`fed-learn.sol`)


| Function                                      | Description                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `createTask(modelUrl, datasetUrl, numChunks)` | Creates training task, deposits HBAR (msg.value / numChunks = per-chunk reward)                  |
| `submitWeights(taskId, weightsHash)`          | Trainer submits encrypted weight CID, receives per-chunk reward. Emits `WeightsSubmitted` event. |


**Contract ID**: `0.0.6917091` (Hedera Testnet)

### Consensus Service (HCS)

Trainer nodes stream state logs (training progress, errors, downloads) to **Topic `0.0.6914391`** in real time. Provides an immutable audit trail even if nodes crash.

---

## P2P Network

Built on **py-libp2p** with **GossipSub** pubsub (degree=20, heartbeat=5s).

- Bootstrap node maintains global `fed-learn` mesh topic
- Each training round gets a dedicated pubsub topic (`proj_{timestamp}`)
- Only lightweight URLs are passed over P2P — heavy data flows through IPFS

---

## Trainer Assembly & Node Metrics

During the assembly phase, the frontend polls the bootstrap node every **5 seconds** (`fetchNetworkState()` → `bootmesh` command) to discover trainer nodes that have joined the training-round topic.

**Ping & Uptime values shown in the UI are mock/simulated** — they are not measured from actual network probes. The current implementation generates random values at render time:

```
Ping:   Math.floor(Math.random() * 50) + 50    → 50–99ms
Uptime: Math.floor(Math.random() * 30) + 70    → 70–99%
Avg Latency: Math.floor(Math.random() * 100) + 200  → 200–299ms
```

**Location**: `frontend/src/ui/components/training/AssemblingPhase.tsx` (L199-211, L238)

These are placeholder indicators for the UI. Real metrics would require implementing periodic heartbeat pings between the frontend/client node and each trainer, and tracking cumulative uptime from the time a trainer joins the mesh.

---

## Chunk Assignment Algorithm

Once training starts, the client node assigns dataset chunks to trainer nodes using **round-robin distribution**.

**Location**: `p2p/machine_learning.py` → `assign_chunks_to_nodes()` (L19-35)

```python
# Fetch manifest → get list of chunk URLs
chunk_urls = manifest_content.text.strip().split(",")

# Round-robin assignment
assignments = {node: [] for node in nodes}
for i, chunk_url in enumerate(chunk_urls):
    node = nodes[i % len(nodes)]
    assignments[node].append(chunk_url)
```

**How it works**: Each chunk URL is assigned to `nodes[i % len(nodes)]`, cycling through the available trainers. If there are 6 chunks and 2 trainers, each gets 3 chunks.

**Limitations**:

- **Ignores trainer capability** — a laptop GPU gets the same load as a cloud A100
- **No fault tolerance** — if a trainer disconnects, its chunks are never reassigned
- **Static** — assignment happens once; no dynamic rebalancing

**Better approach — Weighted capacity-aware assignment**:

1. Each trainer advertises a capability score (GPU memory, FLOPS, or a benchmark result) when joining
2. Chunks are assigned proportionally to capability: a trainer 3x as powerful gets 3x as many chunks
3. A timeout watchdog reassigns chunks from unresponsive trainers to healthy ones

---

## "Start Final Training" Flow

When the user clicks **Start Final Training**, the following sequence executes:

**Location**: `frontend/src/ui/contexts/TrainingContext.tsx` → `beginFinalTraining()` (L312-374)

```
1. Generate RSA-OAEP 2048-bit keypair (Web Crypto API)
2. Export public key as PEM → encode: spaces→"#", newlines→"?"
3. POST to client node:
   cmd: "train"
   args: [projectId, "{datasetHash} {modelHash} {encodedPublicKey}"]
4. Client node (coordinator.py L426-444):
   a. Parse dataset URL, model URL, and public key from message
   b. Fetch manifest → get list of chunk URLs
   c. Call assign_chunks_to_nodes() → round-robin assignment dict
   d. Publish "assign {modelUrl} {publicKey} {assignments}" to training topic
5. Each trainer node (coordinator.py L446-519):
   a. Receive "assign" message, restore PEM public key
   b. Find own peer_id in assignments dict
   c. For each assigned chunk:
      - Download chunk CSV + model script from IPFS
      - Execute model via exec() with DATASET_PATH injected
      - Upload resulting weights to IPFS
      - Encrypt weights CID with user's public key
      - Call submitWeights(taskId, encryptedCID) on Hedera contract
      - Log progress to HCS topic
6. Frontend subscribes to HCS logs and polls Hedera mirror node
   for WeightsSubmitted events → phase transitions to "training"
```

---

## IPFS Storage (Pinata / Akave O3)

- **Upload**: Dataset chunks and model scripts pinned via Pinata API or Akave S3 CLI
- **Distribution**: IPFS gateway URLs (or presigned URLs for Akave) shared over P2P — no large payloads in the mesh
- **Security**: Trained weight URLs encrypted with ML user's RSA-2048 public key before on-chain submission
- **Access**: Trainers get temporary URL access, no credential sharing required

---

## Getting Started

### Prerequisites

- Node.js, Yarn
- Python 3.10+, virtual environment
- Pinata API keys (`PINATA_API_KEY`, `PINATA_SECRET_API_KEY`) **or** Akave O3 keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Hedera Testnet account (`OPERATOR_ID`, `OPERATOR_KEY`)

### Installation

```bash
git clone https://github.com/lla-dane/P2P-Federated-Learning.git
cd P2P-Federated-Learning
```

**Frontend:**

```bash
cd frontend
yarn install
```

**Backend:**

```bash
python -m venv .venv
uv sync --all-extras
pip install -r extra_requirements.txt
```

### Environment Variables

Create a `.env` file (see `.env.example`):

```env
# Storage (choose one)
PINATA_API_KEY=
PINATA_SECRET_API_KEY=
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Hedera
OPERATOR_ID=
OPERATOR_KEY=
CONTRACT_ID=
TOPIC_ID=

# P2P
BOOTSTRAP_ADDR=/ip4/<IP>/tcp/8000/p2p/<PeerId>
BOOTSTRAP_PRIVATE_KEY=
BOOTSTRAP_PUBLIC_KEY=
IP=
IS_CLOUD=

# Auth
API_KEY=
API_SECRET=
JWT_TOKEN=
```

### Hedera Operator ID & Key Configuration

The system uses three `.env` files, each serving a different component. **The private key format differs between frontend and backend**:


| File            | Purpose                                 | Key Format                            | Used By                                             |
| --------------- | --------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| `frontend/.env` | Electron app (ML user)                  | Raw 32-byte hex (`VITE_OPERATOR_KEY`) | `@hashgraph/sdk` via `PrivateKey.fromStringECDSA()` |
| `p2p/.env`      | P2P node overrides                      | DER-encoded hex (`OPERATOR_KEY`)      | `hiero_sdk_python` via `PrivateKey.from_string()`   |
| Root `.env`     | Shared defaults (loaded by `runner.py`) | DER-encoded hex (`OPERATOR_KEY`)      | `hiero_sdk_python` via `PrivateKey.from_string()`   |


**Key format relationship** — both encode the same secp256k1 private key, but the backend wraps it in an ASN.1 DER envelope:

```
Frontend (raw):  d28b4395...a3879150                          (64 hex chars = 32 bytes)
Backend  (DER):  3030020100300706052b8104000a04220420 d28b4395...a3879150  (104 hex chars)
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^
                 ASN.1 header for secp256k1         Same raw key
```

**Important for trainers**: Each trainer node needs its own Hedera account. Using the same Operator ID across all nodes means:

- Weight-to-node attribution shows the same address for every weight file
- Escrow rewards all go to one wallet
- The whitelist cannot distinguish between trainers

#### Setting Up a New Trainer Node

1. **Create a Hedera testnet account** at [portal.hedera.com](https://portal.hedera.com)
2. **Whitelist the new account** (run from the ML user's machine):
  ```bash
   .venv/bin/python p2p/whitelist_manager.py add 0.0.NEW_ACCOUNT_ID
  ```
3. **Start the trainer node** with its own credentials:
  ```bash
   .venv/bin/python p2p/runner.py --role trainer \
     --operator-id 0.0.NEW_ACCOUNT_ID \
     --operator-key 3030...NEW_DER_KEY
  ```
   The `--operator-id` and `--operator-key` CLI flags override any `.env` values, so you don't need to edit `.env` files when switching between trainer accounts.

### Running

```bash
# Terminal 1: Frontend
cd frontend && yarn dev

# Terminal 2: Bootstrap node
.venv/bin/python p2p/runner.py --role bootstrap

# Terminal 3: Client node
.venv/bin/python p2p/runner.py --role client

# Terminal 4+: Trainer nodes (each with own Hedera account)
.venv/bin/python p2p/runner.py --role trainer --operator-id 0.0.XXXX --operator-key 3030...
```

### API

```bash
# Publish message to topic
curl -X POST http://localhost:9000/command \
  -H "Content-Type: application/json" \
  -d '{"cmd":"publish","args":["fed-learn","hello"]}'

# Get bootstrap mesh summary
curl -X POST http://localhost:9000/command \
  -H "Content-Type: application/json" \
  -d '{"cmd":"bootmesh"}'

# Get local mesh state
curl -X POST http://localhost:9000/command \
  -H "Content-Type: application/json" \
  -d '{"cmd":"mesh"}'

# Node status
curl http://localhost:9000/status
```

---

## Target Users

**ML Users** — Have data and models but lack compute. Upload via frontend, pay with HBAR, receive trained weights.

**Trainers** — Have idle GPUs/CPUs. Earn HBAR by training assigned chunks. Fair pricing through market competition.


## Competition & Current tech in the Distributed Training of ML models:

Frameworks & Libraries

PyTorch DDP (DistributedDataParallel) — de facto standard for multi-GPU/multi-node training
PyTorch FSDP (Fully Sharded Data Parallel) — shards model weights across GPUs for very large models
DeepSpeed (Microsoft) — ZeRO optimizer stages, used heavily for LLM training
Megatron-LM (NVIDIA) — tensor + pipeline parallelism, used for GPT-scale models
JAX + XLA — Google's stack; used in TPU clusters (Gemini training)
Horovod (Uber) — ring-allreduce, framework-agnostic wrapper over PyTorch/TF

Federated Learning Specific

Flower (flwr) — most popular open FL framework
TensorFlow Federated (TFF) — Google's FL research framework
PySyft — privacy-focused FL with DP and secure aggregation
OpenFL (Intel) — enterprise federated learning

Orchestration & Infrastructure

Ray / Ray Train — distributed compute orchestration, widely used in industry
Kubernetes + KubeFlow — ML pipeline orchestration on clusters
Slurm — HPC job scheduler, standard in academic/research clusters
AWS SageMaker / Azure ML / GCP Vertex AI — managed distributed training on cloud

Communication Backends

NCCL (NVIDIA) — GPU-to-GPU communication, underpins most PyTorch DDP
Gloo — CPU fallback communication backend
MPI — older HPC standard, still used in Horovod
gRPC / HTTP — used in FL client-server communication

Parallelism Strategies (not tools, but governs tool choice)

Data Parallelism — same model, different data shards (DDP, Horovod)
Tensor Parallelism — split individual weight matrices (Megatron)
Pipeline Parallelism — split layers across devices (Megatron, DeepSpeed)
Expert Parallelism — for MoE models (DeepSpeed-MoE)
