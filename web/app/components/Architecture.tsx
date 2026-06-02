'use client';

import { motion } from 'framer-motion';
import { Network, Database, Layers, ShieldCheck } from 'lucide-react';

const layers = [
  {
    icon: Network,
    title: 'P2P Layer',
    subtitle: 'py-libp2p + GossipSub',
    color: 'fuchsia',
    features: [
      'Ed25519 peer identity — each node is its public key',
      'GossipSub pubsub: degree=20, heartbeat=5s',
      'Per-round isolated topic (proj_{timestamp})',
      'Timestamp + nonce replay protection',
      'Kademlia DHT + mDNS peer discovery',
    ],
  },
  {
    icon: Database,
    title: 'Storage Layer',
    subtitle: 'Pinata IPFS / Akave O3',
    color: 'violet',
    features: [
      'Chunks pinned as content-addressed IPFS objects',
      'Presigned URLs — time-limited, read-only access',
      'Trainers download via URL, not P2P payload',
      'Manifest file = comma-separated chunk CIDs',
      'Weight CIDs RSA-encrypted before on-chain submit',
    ],
  },
  {
    icon: Layers,
    title: 'Blockchain Layer',
    subtitle: 'Hedera Testnet',
    color: 'purple',
    features: [
      'createTask() — HBAR escrow deposit per job',
      'submitWeights() — releases per-chunk reward',
      'HCS audit topic: every state change timestamped',
      'Proof-of-training hash: H(weights) ∥ H(checkpoints)',
      'Mirror node REST API — no SDK required for reads',
    ],
  },
];

const colorMap: Record<string, string> = {
  fuchsia: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export default function Architecture() {
  return (
    <section id="architecture" className="py-24 px-6 border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-mono tracking-widest text-fuchsia-400 uppercase mb-3">
            Architecture
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-zinc-100 mb-4">
            Three layers, zero central servers
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Each layer is independently decentralized. Remove any single node
            and the system continues — that&apos;s the guarantee.
          </p>
        </motion.div>

        {/* Layer cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {layers.map((layer, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card-glass rounded-xl p-6"
            >
              <div
                className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-4 ${colorMap[layer.color]}`}
              >
                <layer.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100 mb-1">
                {layer.title}
              </h3>
              <p className="text-xs text-zinc-500 font-mono mb-4">
                {layer.subtitle}
              </p>
              <ul className="space-y-2">
                {layer.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Security layer — full width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.35 }}
          className="card-glass rounded-xl p-6 border border-fuchsia-500/10"
          style={{ background: 'rgba(168,85,247,0.04)' }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100 mb-1">
                Security Layer — TrustGossip Defense Pipeline
              </h3>
              <p className="text-xs text-zinc-500 font-mono mb-3">
                Runs on every received gradient update · No trusted aggregator
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
                A five-stage per-node pipeline:{' '}
                <span className="text-zinc-300">Ed25519 signature admission</span>{' '}
                → <span className="text-zinc-300">L2-norm clipping</span> →
                {' '}<span className="text-zinc-300">adaptive cosine-similarity filtering (τ = μ − σ)</span>{' '}
                → <span className="text-zinc-300">P2P-adapted bucketing (f/n → f/√n)</span>{' '}
                → <span className="text-zinc-300">EMA trust-weighted aggregation</span>.
                Provably tolerates up to f &lt; ⅓ Byzantine neighbors. Explicit
                50% failure boundary documented in the paper.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
