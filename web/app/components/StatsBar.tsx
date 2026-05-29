'use client';

import { motion } from 'framer-motion';

const stats = [
  { value: '25+', label: 'functional test jobs' },
  { value: '210ms', label: 'gossip median latency' },
  { value: '5-stage', label: 'TrustGossip pipeline' },
  { value: '3–5s', label: 'Hedera finality' },
  { value: '$0.0001', label: 'per HCS audit log' },
];

export default function StatsBar() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.01]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="flex flex-col items-center text-center gap-1"
            >
              <span className="text-2xl font-semibold text-zinc-100 tabular-nums">
                {s.value}
              </span>
              <span className="text-xs text-zinc-500">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
