'use client';

import { motion } from 'framer-motion';
import {
  KeyRound,
  Scissors,
  Filter,
  Grid3X3,
  Star,
  ChevronRight,
} from 'lucide-react';

const stages = [
  {
    icon: KeyRound,
    num: '01',
    name: 'Admission',
    tag: 'Sybil resistance',
    description:
      'Ed25519 signature validation on every message. New peers must solve a configurable hash puzzle (d=20–24 bits) before joining the neighborhood. Flash-Sybils are quarantined for R warm-up rounds with zero trust weight.',
    defends: 'Sybil flooding · replay attacks · identity forgery',
  },
  {
    icon: Scissors,
    num: '02',
    name: 'L2-Norm Clipping',
    tag: 'Unbounded poisoning',
    description:
      'Each gradient is clipped to ∆wⱼ ← ∆wⱼ · min(1, C/‖∆wⱼ‖₂). The clipping threshold C is set adaptively to the 90th percentile of trusted-peer norms over the last K rounds — tight enough to catch outliers, relaxed enough for heterogeneous hardware.',
    defends: 'Unbounded gradient attacks · coordinate-wise mean manipulation',
  },
  {
    icon: Filter,
    num: '03',
    name: 'Cosine Filtering',
    tag: 'Optimal poisoning',
    description:
      'Cosine similarity of each update vs. the local gradient is computed. Adaptive threshold τ = μ − σ (median minus std of pairwise cosines) adjusts per round: tight under IID data, relaxed under non-IID heterogeneity. This prevents honest outliers from being dropped.',
    defends: 'Fang optimal poisoning · sign-flip attacks · random noise injection',
  },
  {
    icon: Grid3X3,
    num: '04',
    name: 'Bucketing',
    tag: 'Distributed backdoor',
    description:
      'Filtered updates are randomly assigned to s = ⌈√n′⌉ buckets (seed from HCS timestamp — unpredictable to the adversary). Bucket means are aggregated via coordinate-wise trimmed mean. Byzantine fraction drops from f/n to f/√n.',
    defends: 'DBA · Neurotoxin durable backdoor · optimal poisoning',
  },
  {
    icon: Star,
    num: '05',
    name: 'Trust Mix',
    tag: 'Gradient inversion',
    description:
      'Each peer maintains an exponential-moving-average trust score Tⱼ. Peers with T < 0.1 or still in warm-up are excluded from aggregation. Score updates: Tⱼ ← αTⱼ + (1−α)·cos(∆wⱼ, ∆wagg) with α=0.9.',
    defends: 'Persistent backdoor attackers · Sybil nodes post-admission',
  },
];

export default function SecurityPipeline() {
  return (
    <section id="security" className="py-24 px-6 border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase mb-3">
            TrustGossip Security
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-zinc-100 mb-4">
            Byzantine-robust without a trusted aggregator
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Every received gradient passes through five stages before influencing
            the model. Each stage closes a gap left open by the previous one.
            Designed for P2P — no central server needed.
          </p>
        </motion.div>

        {/* Pipeline label */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden lg:flex items-center justify-center gap-1 mb-10 text-xs font-mono text-zinc-600"
        >
          {stages.map((s, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-500">
                {s.name}
              </span>
              {i < stages.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
              )}
            </span>
          ))}
        </motion.div>

        {/* Stage cards */}
        <div className="space-y-4">
          {stages.map((stage, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.09 }}
              className="card-glass rounded-xl p-5 flex gap-5 group hover:border-indigo-500/20 transition-colors"
            >
              {/* Stage icon + number */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/15 transition-colors">
                  <stage.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-xs font-mono text-zinc-700">{stage.num}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {stage.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-500 font-mono">
                    {stage.tag}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-2">
                  {stage.description}
                </p>
                <p className="text-xs font-mono text-zinc-600">
                  Defends: {stage.defends}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Honest boundary note */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-5"
        >
          <p className="text-sm text-amber-200/70 leading-relaxed">
            <span className="font-semibold text-amber-300/80">Defense boundary: </span>
            All guarantees hold while Byzantine neighbors &lt; 50%. Above this
            threshold, median estimators fail, bucketing concentration breaks
            down, and gradient inversion becomes feasible. This limit is
            explicitly documented in the paper — unlike most FL work, we don&apos;t
            paper over it.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
