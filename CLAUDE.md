# CLAUDE.md - AI Context for distro-train

## Project Overview
**distro-train** is a decentralized federated learning platform inspired by karankoder/Federated-Learning. It creates a peer-to-peer marketplace connecting ML users (who have data/models but lack compute) with trainers (who have idle GPUs/CPUs).

## Core Architecture

### Technology Stack
- **P2P Networking**: py-libp2p for decentralized communication
- **Storage**: Pinata (IPFS pinning service) for decentralized content-addressed storage
- **Blockchain**: Hedera (smart contracts + consensus service)
- **Frontend**: Node.js, React.js, Yarn
- **Backend**: Python with virtual environment

### Key Components
1. **ML Users**: Upload datasets/models, receive trained weights
2. **Trainers**: Provide compute power, earn by training jobs
3. **Bootstrap Node**: P2P network entry point
4. **Client Nodes**: Bridge between frontend and P2P swarm

### Workflow
1. ML user uploads dataset → chunked and pinned to IPFS via Pinata
2. IPFS gateway URLs generated for each chunk (not raw data over P2P)
3. URLs shared across P2P network
4. Trainers fetch chunks, train locally, upload weights to IPFS
5. Encrypted IPFS gateway URLs for weights published on Hedera
6. Final trained weights returned to ML user

## Key Innovations
- **IPFS Gateway URLs**: Lightweight data distribution (no massive payloads over P2P)
- **Trustless**: Smart contracts handle escrow/payments
- **Fault Tolerant**: Consensus service logs preserve state
- **Privacy**: Data never leaves local devices

## Environment Variables Required
```
PINATA_API_KEY             # Pinata IPFS
PINATA_SECRET_API_KEY      # Pinata IPFS
PINATA_GATEWAY_URL         # Optional, defaults to https://gateway.pinata.cloud/ipfs
OPERATOR_ID                # Hedera
OPERATOR_KEY               # Hedera
API_KEY, API_SECRET        # Auth
JWT_TOKEN                  # Auth
BOOTSTRAP_ADDR             # P2P bootstrap node
CONTRACT_ID, TOPIC_ID      # Hedera
```

## Development Focus Areas
- Federated learning aggregation algorithms (FedAvg, FedProx)
- Byzantine fault tolerance for malicious nodes
- Trainer selection and assignment logic
- Quality verification for trained weights
- Dynamic pricing mechanism
- Model encryption schemes

## When Helping with This Project
- Focus on decentralized, trustless design patterns
- Consider P2P network reliability and fault tolerance
- Prioritize data privacy and security
- Think about scalability with IPFS content-addressed approach
- Reference py-libp2p, Pinata, and Hedera documentation