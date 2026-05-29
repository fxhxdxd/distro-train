# distro-train — Deployment Plan (Free-Tier / Student Credits)

This document maps every deployable unit of **distro-train** onto a free-tier offering or onto GCP credit (Google for Education / GCP $300 free trial). The objective is a **zero-cash, end-to-end testnet deployment** that survives for the demo window (≥ 30 days continuous uptime) and can serve at least one ML user + three trainer nodes.

---

## 1. Inventory of Deployable Units

Derived from `README.md`, `pyproject.toml`, `p2p/runner.py`, `frontend/package.json`, and `contracts/`.

| # | Unit | Code Path | Runtime | Inbound Ports | State | Notes |
|---|------|-----------|---------|---------------|-------|-------|
| 1 | **Bootstrap Node** | `p2p/runner.py --role bootstrap` | Python 3.11+ (trio, py-libp2p) | `tcp/8000` (libp2p), `tcp/9000` (HTTP API) | Stateless | **Must have a stable public IP** — its multiaddr is published as `BOOTSTRAP_ADDR`. Tiny CPU/RAM footprint. |
| 2 | **Client Node** | `p2p/runner.py --role client` | Python 3.11+ | dynamic libp2p port, `tcp/9001` HTTP API | In-RAM swarm state | Bridges Electron frontend ↔ P2P. Light CPU; egress-heavy when assigning chunks. |
| 3 | **Trainer Node(s)** | `p2p/runner.py --role trainer` | Python 3.11+ + scikit-learn / pandas | dynamic libp2p port, `tcp/9000+` | Local `.csv` + `.weights` files (ephemeral) | Compute-heavy. CPU-bound (sklearn) — GPU not currently required by `ml1_code.py`. |
| 4 | **Frontend (Electron)** | `frontend/` | Node 20 + Vite + Electron 38 | n/a (desktop) | Per-user keystore via `electron-store` / `keytar` | Distributed as a built binary (`yarn dist:linux|mac|win`). No server hosting needed. A Vite-only web build is also possible for demo. |
| 5 | **Smart Contracts** | `contracts/contracts/fed-learn.sol` | Hedera Testnet | n/a | On-chain | Already deployed at `0.0.6917091`. **Zero deployment work** unless a redeploy is needed. |
| 6 | **HCS Topic (audit log)** | Hedera Topic `0.0.6914391` | Hedera Testnet | n/a | On-chain | Free on testnet. |
| 7 | **IPFS Storage** | `frontend/src/electron/pinataCli.ts`, `akaveCli.ts` | Pinata SaaS *or* Akave O3 | n/a | Off-host | Use Pinata free tier (1 GB / 100 pins) for datasets + weights. |
| 8 | **Mirror Node** | Hedera public mirror | Hedera Testnet | n/a | On-chain | Free public REST endpoint, no hosting. |

Units **5–8 require no infrastructure** — they live on Hedera and Pinata. The plan below therefore focuses on hosting **#1, #2, #3**, plus shipping #4.

---

## 2. Target Topology

```
                       ┌──────────────────────────────────────┐
                       │  Hedera Testnet (contracts + HCS)    │  ← free
                       │  Pinata IPFS (datasets + weights)    │  ← free 1 GB
                       └──────────────────────────────────────┘
                                       ▲
                                       │ REST / SDK
                       ┌───────────────┴───────────────┐
                       │                               │
        ┌──────────────────────────┐         ┌────────────────────────┐
        │  Frontend (Electron)     │         │  Trainer pool          │
        │  Runs on ML user's       │   P2P   │  3× Oracle Cloud       │
        │  laptop OR e2-micro      │◄──────► │  Always-Free ARM VMs   │
        │  hosted demo build       │         │  (Ampere A1)           │
        └──────────────┬───────────┘         └──────────┬─────────────┘
                       │                                │
                       │  HTTP                          │ libp2p / TCP
                       ▼                                ▼
        ┌──────────────────────────┐         ┌────────────────────────┐
        │  Client Node (Py)        │ libp2p  │  Bootstrap Node (Py)   │
        │  e2-small on GCP         │◄──────► │  e2-micro on GCP       │
        │  (or colocated w/ FE)    │         │  static external IP    │
        └──────────────────────────┘         └────────────────────────┘
```

The split exploits two free programmes simultaneously:

* **GCP** — small Compute Engine VMs for the **two coordination nodes** (bootstrap + client) where a static public IP and IAM control matter.
* **Oracle Cloud Always-Free** — generous ARM compute (4 OCPU / 24 GB RAM total) for **trainer nodes**, where CPU/RAM matters more than networking.

If a student prefers a single-cloud plan, every unit fits inside the GCP $300 credit alone (see §6 alt plan).

---

## 3. Per-Unit Deployment

### 3.1 Bootstrap Node — GCP `e2-micro` (Always-Free)

| Setting | Value |
|---|---|
| Project tier | GCP "Always Free" (1× `e2-micro` in `us-west1`, `us-central1`, or `us-east1`) |
| Machine | `e2-micro` (2 vCPU burst, 1 GB RAM) |
| Disk | 30 GB standard PD (free-tier ceiling) |
| OS | Ubuntu 22.04 LTS |
| Static IP | 1 reserved external IPv4 (free while attached to a running VM) |
| Firewall | Ingress allow `tcp:8000` (libp2p), `tcp:9000` (admin only — restrict to your IP) |
| Cost | **$0/mo** (within always-free) |

Provisioning:

```bash
gcloud compute instances create distro-bootstrap \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --address=BOOTSTRAP_STATIC_IP \
  --tags=distro-bootstrap

gcloud compute firewall-rules create distro-bootstrap-libp2p \
  --allow=tcp:8000 --target-tags=distro-bootstrap

gcloud compute firewall-rules create distro-bootstrap-api \
  --allow=tcp:9000 --target-tags=distro-bootstrap \
  --source-ranges=YOUR_HOME_IP/32
```

Bring-up:

```bash
sudo apt-get install -y python3.11 python3.11-venv git build-essential expect
git clone <repo> && cd distro-train
python3.11 -m venv .venv && source .venv/bin/activate
pip install uv && uv sync --all-extras
cd p2p && IS_CLOUD=true ./start_bootstrap.sh
```

Publish the multiaddr to every other node's `.env`:

```
BOOTSTRAP_ADDR=/ip4/<STATIC_IP>/tcp/8000/p2p/<PeerId-from-bootstrap-logs>
```

Run as a `systemd` unit so it survives reboots (template at the end of this doc).

### 3.2 Client Node — GCP `e2-small` (on credit)

| Setting | Value |
|---|---|
| Tier | $300 credit (or `e2-micro` if you want it also always-free; tight on RAM) |
| Machine | `e2-small` (2 vCPU, 2 GB RAM) |
| Disk | 20 GB pd-standard |
| Firewall | Ingress `tcp:9001` from your home IP only |
| Cost | ~$13/mo on credit (or $0 if you reuse the always-free `e2-micro`) |

The client node mostly proxies HTTP commands from the frontend into pubsub, so RAM is the binding constraint when manifests get large. `e2-small` is the safe pick.

> **Co-location option** — if you want to stay strictly inside the GCP always-free quota, run **bootstrap + client on the same `e2-micro`**: bootstrap on `:8000/:9000`, client on a dynamic libp2p port and `:9001`. They are independent processes that talk over loopback.

### 3.3 Trainer Nodes — Oracle Cloud Always-Free ARM (Ampere A1)

| Setting | Value |
|---|---|
| Tier | Oracle Cloud Always-Free: **up to 4 OCPU / 24 GB RAM** of Ampere A1 split across instances |
| Layout | 3× VM @ 1 OCPU / 6 GB RAM (or 2× @ 2 OCPU / 12 GB) |
| OS | Ubuntu 22.04 (ARM64) |
| Outbound | Default open; inbound NSG rule for the dynamic libp2p port range you pick |
| Cost | **$0/mo** (always-free, no expiry) |

Why Oracle, not GCP: GCP's free `e2-micro` has only 1 GB RAM — too tight when pandas loads a chunk and trains. Oracle's free Ampere quota gives genuinely useful CPU + RAM at no cost. AWS free tier is 12 months only and CPU-credit throttled, so it is not recommended for trainers that run for the full project duration.

Bring-up per trainer (each needs its **own Hedera testnet account** — see README §"Setting Up a New Trainer Node"):

```bash
sudo apt-get install -y python3.11 python3.11-venv git build-essential
git clone <repo> && cd distro-train
python3.11 -m venv .venv && source .venv/bin/activate
pip install uv && uv sync --all-extras

echo "BOOTSTRAP_ADDR=/ip4/<GCP_STATIC_IP>/tcp/8000/p2p/<PeerId>" >> .env
.venv/bin/python p2p/runner.py --role trainer \
  --operator-id 0.0.NEW_ACCOUNT \
  --operator-key 3030...DER
```

Whitelist each trainer's Hedera account from the ML user's machine before training:

```bash
.venv/bin/python p2p/whitelist_manager.py add 0.0.NEW_ACCOUNT
```

### 3.4 Frontend — Distributed Binary (no hosting)

The frontend is an Electron app — there is no "deployment server". For the demo:

* `cd frontend && yarn install && yarn dist:linux` (or `dist:mac` / `dist:win`) produces an installer.
* Host the installer artefact on **GitHub Releases** (free).
* If a hosted web demo is required, `yarn build` emits a static SPA in `frontend/dist/`. Serve it from:
  * **GitHub Pages** (free, static), or
  * **Cloudflare Pages** / **Netlify** / **Vercel** free tier — all support `vite build` natively.

The web build loses Electron-only features (`keytar`, OS file dialogs), so prefer the desktop binary for the real flow.

### 3.5 Smart Contracts — Hedera Testnet (already live)

`fed-learn.sol` is deployed at `0.0.6917091`. No deployment work unless you redeploy (e.g. after a contract change):

```bash
cd contracts
npm install
npx hardhat run scripts/deploy.ts --network hederaTestnet
```

Testnet HBAR is free from the [Hedera portal faucet](https://portal.hedera.com). Each trainer also needs its own testnet account (free).

### 3.6 IPFS — Pinata Free Tier

* Free tier: **1 GB storage**, **100 files / month** pinning, public gateway.
* Sufficient for the demo dataset (`dataset.csv` symlinks a ~50 KB chunked CSV) plus model scripts and weights.
* If 1 GB becomes tight, switch the frontend's storage adapter from `pinataCli.ts` to `akaveCli.ts` — Akave O3 has a generous free tier as well (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars).

### 3.7 HCS Audit Log — Hedera Testnet Topic

Topic `0.0.6914391` already exists. Mirror-node REST queries against `testnet.mirrornode.hedera.com` are free and unauthenticated. No hosting.

---

## 4. Networking & Secrets

* **Reserved IPs**: 1 (bootstrap). GCP charges only for *unattached* static IPs, so leave it bound to the running VM.
* **DNS** (optional): point `bootstrap.<your-domain>` at the static IP via Cloudflare free DNS. Cleaner than embedding raw IPs in `.env`.
* **Secrets**: never commit `.env`. Store per-VM in `/etc/distro-train/env` (mode 600) and source it from the systemd unit. Required keys per node:

| Node | Required env vars |
|---|---|
| Bootstrap | `BOOTSTRAP_PRIVATE_KEY`, `BOOTSTRAP_PUBLIC_KEY`, `IP`, `IS_CLOUD=true` |
| Client | `BOOTSTRAP_ADDR`, `OPERATOR_ID`, `OPERATOR_KEY`, `CONTRACT_ID`, `TOPIC_ID`, `PINATA_API_KEY`, `PINATA_SECRET_API_KEY` |
| Trainer | `BOOTSTRAP_ADDR`, `OPERATOR_ID`, `OPERATOR_KEY` (its own), `CONTRACT_ID`, `TOPIC_ID`, `PINATA_API_KEY`, `PINATA_SECRET_API_KEY` |
| Frontend | `VITE_OPERATOR_ID`, `VITE_OPERATOR_KEY` (raw 32-byte hex), `VITE_CONTRACT_ID`, `VITE_TOPIC_ID`, `VITE_PINATA_*` |

Note the DER vs. raw-hex private-key distinction described in `README.md` §"Hedera Operator ID & Key Configuration".

---

## 5. systemd Unit Template (bootstrap / client / trainer)

```ini
# /etc/systemd/system/distro-bootstrap.service
[Unit]
Description=distro-train bootstrap node
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=distro
WorkingDirectory=/home/distro/distro-train
EnvironmentFile=/etc/distro-train/env
ExecStart=/home/distro/distro-train/.venv/bin/python p2p/runner.py --role bootstrap
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now distro-bootstrap
journalctl -u distro-bootstrap -f
```

Duplicate the unit with `--role client` / `--role trainer` and per-node env files. The current `start_bootstrap.sh` / `start_client.sh` scripts drive `runner.py` via `expect` for interactive prompts; for a server install, prefer feeding the role/keys via CLI flags so no TTY is needed.

---

## 6. Single-Cloud Alternative (GCP only)

If splitting across two clouds is undesirable:

| Unit | GCP resource | Cost on credit |
|---|---|---|
| Bootstrap | `e2-micro` (always-free) + static IP | $0 |
| Client | same `e2-micro` (co-located) or `e2-small` | $0 – ~$13/mo |
| Trainer × 3 | 3× `e2-medium` (2 vCPU, 4 GB) preemptible | ~$7/mo each × 3 ≈ $21/mo preemptible |
| Frontend hosting | Cloud Storage + Cloud CDN (static) | <$1/mo |
| **Total burn rate** | | **~$22 – $35 / mo against the $300 credit → 8–13 months runway** |

Preemptible (Spot) instances are fine for trainers because the system already needs Byzantine / churn tolerance and the worst case is a chunk reassignment.

---

## 7. Cost Summary

| Plan | Recurring cost | Credit burn |
|---|---|---|
| **Recommended** (GCP free + Oracle free + Pinata free + Hedera testnet) | **$0/mo** | $0 |
| **GCP-only with credit** | $0 out-of-pocket | ~$22–$35/mo against $300 credit |
| **Mainnet upgrade** (replace testnet with Hedera mainnet) | + real HBAR for escrow + per-tx fees | not covered by GCP credit |

---

## 8. Operational Checklist

* [ ] Reserve GCP static IP, create `e2-micro`, open `tcp:8000`.
* [ ] Restrict `tcp:9000` and `tcp:9001` ingress to your home / lab IPs.
* [ ] Provision 3× Oracle Ampere A1 VMs, install Python 3.11 + repo.
* [ ] Create per-trainer Hedera testnet accounts; fund from faucet.
* [ ] Whitelist each trainer account via `whitelist_manager.py add`.
* [ ] Distribute `BOOTSTRAP_ADDR` (with peer ID) to every node's `.env`.
* [ ] Install systemd units; `enable --now` on every VM.
* [ ] Smoke test: `curl http://<bootstrap>:9000/status` → mesh summary lists all trainers.
* [ ] Build frontend binary, publish to GitHub Releases.
* [ ] Dry run: small CSV upload → manifest pinned to Pinata → 1 chunk trained → weights decrypted in frontend.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| GCP always-free `e2-micro` only in 3 US regions → latency to India / EU trainers | Either accept ~200 ms RTT (P2P is async anyway) or move bootstrap to a paid `e2-small` in a closer region (~$13/mo on credit). |
| Pinata free tier (1 GB / 100 pins) exhausts | Rotate stale pins, or switch storage adapter to Akave O3. |
| Oracle Ampere A1 capacity outages in some regions | Try Frankfurt, Phoenix, or Mumbai; Ashburn is usually full. |
| Long-running `e2-micro` evicted for inactivity | Always-free instances are not evicted, but stopping the VM releases the static IP charge-free; keep it running. |
| Hedera testnet reset (rare, scheduled) | Redeploy contract; update `CONTRACT_ID` and `TOPIC_ID` in every `.env`. |
| Trainer Hedera key leakage | Each trainer has its own account; rotate via `whitelist_manager.py remove` + new account. |
