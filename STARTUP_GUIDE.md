# distro-train Startup Guide

Complete guide for starting the decentralized federated learning platform.

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Bootstrap  │◄────────┤ CLIENT Node  │◄────────┤   Frontend   │
│    Node     │         │              │         │              │
│  Port 8000  │         │  Port 9001   │         │  Port 5173   │
│  API: 9000  │         │              │         │              │
└─────────────┘         └──────────────┘         └──────────────┘
      ▲                        ▲
      │                        │
      │         P2P Mesh       │
      │                        │
      └────────────────────────┴─────────────┐
                                             │
                                    ┌────────▼────────┐
                                    │  Trainer Nodes  │
                                    │  (Dynamic Port) │
                                    └─────────────────┘
```

## Port Assignments

| Node Type | P2P Port | API Port | Purpose |
|-----------|----------|----------|---------|
| Bootstrap | 8000     | 9000     | Network entry point, monitoring |
| CLIENT    | Dynamic  | 9001     | Training commands from frontend |
| Trainer   | Dynamic  | None     | Compute providers |
| Frontend  | N/A      | 5173     | Web interface |

## Prerequisites

1. **Python Environment**
   ```bash
   cd /Users/ayushpetwal/Desktop/distro-train
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e .[p2p]
   ```

2. **Node.js Environment**
   ```bash
   cd frontend
   npm install
   ```

3. **Environment Variables**

   **P2P Nodes** (`p2p/.env`):
   ```bash
   # Hedera Configuration
   OPERATOR_ID=0.0.7285006
   OPERATOR_KEY=your_hedera_private_key
   CONTRACT_ID=0.0.6917091
   TOPIC_ID=0.0.6914391

   # Bootstrap Node Discovery
   BOOTSTRAP_ADDR=/ip4/0.0.0.0/tcp/8000/p2p/QmSTh5b6fhEHbKtpXVNhAFtgJuKvwT3irAYyMeSHjvd4Dk

   # Network Settings
   IP=0.0.0.0
   IS_CLOUD=false
   ```

   **Frontend** (`frontend/.env`):
   ```bash
   VITE_CONTRACT_ID=0.0.6917091
   VITE_OPERATOR_ID=0.0.7285006
   VITE_OPERATOR_KEY=your_hedera_private_key
   VITE_OPERATOR_KEY_TYPE=ECDSA
   VITE_CLIENT_API_URL=http://0.0.0.0:9001
   VITE_BOOTSTRAP_API_URL=http://0.0.0.0:9000
   ```

4. **System Dependencies**
   - `expect` (for automated startup scripts)
     ```bash
     # macOS
     brew install expect

     # Ubuntu/Debian
     sudo apt-get install expect
     ```

## Startup Sequence

### Option 1: Automated Startup (Recommended)

#### Step 1: Start Bootstrap Node
```bash
cd p2p
./start_bootstrap.sh
```

Expected output:
```
================================
Starting Bootstrap Node
================================
✓ Virtual environment activated
✓ Python 3.x.x

Starting bootstrap node...
  - P2P Port: 8000
  - API Port: 9000
  - Role: bootstrap

INFO     Running on http://0.0.0.0:9000
INFO     BOOTSTRAP node subscribed to the [fed-learn] mesh
```

#### Step 2: Start CLIENT Node (New Terminal)
```bash
cd p2p
./start_client.sh
```

Expected output:
```
================================
Starting CLIENT Node
================================
✓ Bootstrap node is running
✓ Virtual environment activated

Starting CLIENT node...
  - P2P Port: Dynamic (auto-assigned)
  - API Port: 9001
  - Role: client
  - Connects to: Bootstrap node

INFO     Running on http://0.0.0.0:9001
INFO     Connected with the BOOTSTRAP node
INFO     CLIENT node subscribed to the [fed-learn] mesh
```

#### Step 3: Start Frontend (New Terminal)
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Option 2: Manual Startup

#### Terminal 1: Bootstrap Node
```bash
cd p2p
source ../.venv/bin/activate
python3 runner.py

# When prompted:
# Role: bootstrap
# OPERATOR_KEY: [press Enter to use .env]
# OPERATOR_ID: [press Enter to use .env]
```

#### Terminal 2: CLIENT Node
```bash
cd p2p
source ../.venv/bin/activate
python3 runner.py

# When prompted:
# Role: client
# OPERATOR_KEY: [press Enter to use .env]
# OPERATOR_ID: [press Enter to use .env]
```

#### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

## Verification Steps

### 1. Check Bootstrap Node
```bash
curl http://0.0.0.0:9000/status
# Expected: {"status":"running"}
```

### 2. Check CLIENT Node
```bash
curl http://0.0.0.0:9001/status
# Expected: {"status":"running"}
```

### 3. Check P2P Mesh
```bash
curl -X POST http://0.0.0.0:9001/command \
  -H "Content-Type: application/json" \
  -d '{"cmd":"bootmesh"}'
```

Expected response:
```json
{
  "status": "ok",
  "bootmesh": {
    "fed-learn": [
      {
        "peer_id": "QmXXXXXX...",
        "role": "CLIENT",
        "maddr": "/ip4/127.0.0.1/tcp/XXXXX/p2p/QmXXXXXX"
      }
    ]
  }
}
```

### 4. Check Frontend
- Open browser to `http://localhost:5173`
- Should see the distro-train interface
- No connection errors in console

## Training Workflow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         UPLOAD PHASE                             │
│  User uploads dataset + model → Akave O3 storage                │
│  Returns: datasetHash, modelHash, chunkCount                    │
└────────────────────────┬────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PAYMENT PHASE                             │
│  Execute Hedera smart contract createTask()                     │
│  Payment locks in escrow → Get projectId from blockchain        │
└────────────────────────┬────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INITIALIZE PHASE                            │
│  Frontend → CLIENT node: POST /command                          │
│  {"cmd": "advertize", "args": [projectId]}                      │
│                                                                  │
│  CLIENT node actions:                                           │
│  1. Subscribe to <projectId> P2P topic                          │
│  2. Announce in "fed-learn" mesh                                │
│  3. Log to Hedera Consensus Service (HCS)                       │
└────────────────────────┬────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ASSEMBLING PHASE                            │
│  Trainer nodes see announcement → Execute "join <projectId>"    │
│  Frontend polls CLIENT: POST /command {"cmd": "bootmesh"}       │
│  Displays trainer count as they join                            │
│  User waits for sufficient trainers                             │
└────────────────────────┬────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TRAINING PHASE                             │
│  User clicks "Start Training"                                   │
│  Frontend generates RSA key pair                                │
│  Frontend → CLIENT: POST /command                               │
│  {"cmd": "train", "args": [projectId, "hash hash pubkey"]}     │
│                                                                  │
│  CLIENT node actions:                                           │
│  1. Get trainer list from mesh                                  │
│  2. Assign chunks (round-robin)                                 │
│  3. Publish assignments to <projectId> topic                    │
│                                                                  │
│  Trainer actions (per assigned chunk):                          │
│  1. Download chunk from Akave O3 via presigned URL             │
│  2. Download model from Akave O3                                │
│  3. Execute model code locally                                  │
│  4. Upload trained weights to Akave O3                          │
│  5. Encrypt weight URL with CLIENT's RSA public key             │
│  6. Submit encrypted URL to Hedera smart contract               │
│  7. Log progress to HCS                                         │
└────────────────────────┬────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      COMPLETION PHASE                            │
│  All trainers finish → CLIENT collects weight URLs              │
│  CLIENT decrypts URLs with private key                          │
│  CLIENT aggregates weights (FedAvg/FedProx)                     │
│  Final trained model returned to user                           │
└─────────────────────────────────────────────────────────────────┘
```

### Testing the Flow

1. **Upload Assets** (Frontend)
   - Upload dataset and model files
   - Wait for Akave O3 upload completion
   - Verify datasetHash and modelHash displayed

2. **Make Payment** (Frontend)
   - Connect Hedera wallet (WalletConnect)
   - Enter HBAR amount
   - Approve transaction
   - Wait for blockchain confirmation
   - **This automatically triggers `advertize` command to CLIENT node**

3. **Wait for Trainers** (Assembling Phase)
   - Frontend auto-polls CLIENT node for mesh state
   - Trainer count updates in real-time
   - Can manually start trainers in separate terminals:
     ```bash
     cd p2p
     python3 runner.py
     # Role: trainer
     # Command> join <projectId>
     ```

4. **Start Training** (Frontend)
   - Click "Begin Training" button
   - **This sends `train` command to CLIENT node**
   - Monitor HCS logs in frontend
   - See real-time training progress

## Troubleshooting

### Bootstrap Node Issues

**Error**: `Address already in use`
```bash
# Kill existing process on port 8000
lsof -ti:8000 | xargs kill -9
lsof -ti:9000 | xargs kill -9
```

**Error**: `Bootstrap keys not found in .env`
- Bootstrap node will auto-generate new keys
- But peer ID will change (update BOOTSTRAP_ADDR for clients)

### CLIENT Node Issues

**Error**: `Could not connect to bootstrap node`
```bash
# 1. Verify bootstrap is running
curl http://0.0.0.0:9000/status

# 2. Check BOOTSTRAP_ADDR in p2p/.env matches actual bootstrap multiaddr
# Get bootstrap multiaddr:
curl -X POST http://0.0.0.0:9000/command \
  -H "Content-Type: application/json" \
  -d '{"cmd":"local"}'
```

**Error**: `Address already in use` (port 9001)
```bash
lsof -ti:9001 | xargs kill -9
```

### Frontend Issues

**Error**: `Could not connect to the server`
- CLIENT node not running
- Check CLIENT node on port 9001:
  ```bash
  curl http://0.0.0.0:9001/status
  ```

**Error**: `Training round can only be started by a CLIENT node`
- Frontend is pointing to wrong API (bootstrap instead of CLIENT)
- Verify `apiHelper.ts` has `baseURL: 'http://0.0.0.0:9001'`

### Training Issues

**Error**: `No training nodes available`
- No trainers have joined the topic
- Start trainer nodes and execute: `join <projectId>`

**Error**: `Training stuck in assembling phase`
- Check mesh state:
  ```bash
  curl -X POST http://0.0.0.0:9001/command \
    -H "Content-Type: application/json" \
    -d '{"cmd":"bootmesh"}' | jq
  ```
- Verify trainers are in the correct projectId topic

## Additional Commands

### Interactive Mode (any node)

After starting any node, you can use these commands:

```
Available commands:
- connect <multiaddr>     – Connect to another peer
- advertize <topic>       – Start a training round (CLIENT only)
- train <topic> <args>    – Starts the training procedure (CLIENT only)
- join <topic>            – Subscribe to a topic (TRAINER only)
- leave <topic>           – Unsubscribe from a topic
- publish <topic> <msg>   – Publish a message
- mesh                    – Get the local mesh summary
- bootmesh                – Get the bootstrap mesh summary
- peers                   – List connected peers
- local                   – List local multiaddr
- topics                  – List of subscribed topics
- help                    – List the existing commands
- exit                    – Shut down
```

### Monitoring

**Watch mesh state:**
```bash
watch -n 2 'curl -s -X POST http://0.0.0.0:9001/command \
  -H "Content-Type: application/json" \
  -d "{\"cmd\":\"bootmesh\"}" | jq'
```

**Watch connected peers:**
```bash
watch -n 2 'curl -s -X POST http://0.0.0.0:9001/command \
  -H "Content-Type: application/json" \
  -d "{\"cmd\":\"peers\"}" | jq'
```

## Production Deployment

For cloud deployment:

1. Update `IS_CLOUD=true` in `p2p/.env`
2. Set `IP` to public IP address
3. Update `BOOTSTRAP_ADDR` with public bootstrap multiaddr
4. Configure firewall rules:
   - Allow TCP 8000 (bootstrap P2P)
   - Allow TCP 9000 (bootstrap API)
   - Allow TCP 9001 (CLIENT API)
   - Allow dynamic ports for trainer P2P

## Support

For issues or questions:
- Check logs in terminal output
- Verify all environment variables are set
- Ensure Hedera account has sufficient HBAR
- Review HCS topic logs on HashScan: https://hashscan.io/testnet/topic/{TOPIC_ID}

## Summary

**Startup Order**: Bootstrap → CLIENT → Frontend
**Payment Flow**: Frontend payment → CLIENT advertize → Trainers join → CLIENT train → Trainers execute
**Key Fix**: Frontend now calls CLIENT node (9001) instead of bootstrap (9000)
