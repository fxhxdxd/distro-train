'use client';

import { motion } from 'framer-motion';
import {
  Upload,
  Radio,
  Cpu,
  Link,
  KeyRound,
} from 'lucide-react';

const steps = [
  {
    icon: Upload,
    num: '01',
    title: 'Upload',
    description:
      'ML user uploads their dataset (CSV) and model script via the Electron app. The dataset is chunked into 50 KB segments, each independently pinned to IPFS via Pinata.',
    detail: 'CHUNK_SIZE = 50 KB · header preserved per chunk',
  },
  {
    icon: Radio,
    num: '02',
    title: 'Broadcast',
    description:
      'Client node calls createTask() on the Hedera smart contract, depositing HBAR as escrow. It then publishes the training round to the GossipSub mesh via py-libp2p.',
    detail: 'GossipSub degree=20 · 210ms median propagation',
  },
  {
    icon: Cpu,
    num: '03',
    title: 'Train',
    description:
      'Trainer nodes receive chunk assignments via pubsub. Each trainer downloads its assigned chunks using presigned IPFS URLs, runs the model locally, and uploads trained weights.',
    detail: 'Round-robin chunk assignment · no raw data over P2P',
  },
  {
    icon: Link,
    num: '04',
    title: 'Settle',
    description:
      'Each trainer encrypts the weights CID with the user\'s RSA-OAEP-2048 public key and calls submitWeights() on the Hedera contract. The contract releases per-chunk HBAR rewards.',
    detail: 'Proof-of-training hash logged to HCS · immutable audit trail',
  },
  {
    icon: KeyRound,
    num: '05',
    title: 'Deliver',
    description:
      'The frontend polls Hedera mirror node for WeightsSubmitted events, decrypts the weight URLs using the private key held only on the user\'s device, and downloads the final model.',
    detail: 'RSA-OAEP · key never leaves the user\'s machine',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-mono tracking-widest text-fuchsia-400 uppercase mb-3">
            Workflow
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-zinc-100 mb-4">
            From dataset to trained weights
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Every step is decentralized and verifiable. No trusted intermediary
            touches your data at any point.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative flex flex-col"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mb-4 relative z-10">
                  <step.icon className="w-5 h-5 text-fuchsia-400" />
                </div>

                {/* Number */}
                <span className="text-xs font-mono text-zinc-600 mb-2">
                  {step.num}
                </span>

                {/* Title */}
                <h3 className="text-base font-semibold text-zinc-100 mb-2">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-zinc-400 leading-relaxed flex-1 mb-3">
                  {step.description}
                </p>

                {/* Detail chip */}
                <span className="text-xs font-mono text-zinc-600 bg-white/[0.03] border border-white/[0.05] rounded px-2 py-1 leading-relaxed">
                  {step.detail}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
