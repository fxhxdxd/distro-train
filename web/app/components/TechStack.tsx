'use client';

import { motion } from 'framer-motion';

const stack = [
  { name: 'py-libp2p', category: 'Networking', desc: 'P2P transport + GossipSub' },
  { name: 'Hedera', category: 'Blockchain', desc: 'Smart contracts + HCS' },
  { name: 'Pinata / IPFS', category: 'Storage', desc: 'Content-addressed chunks' },
  { name: 'Electron', category: 'Frontend', desc: 'Desktop app (ML user)' },
  { name: 'React + TypeScript', category: 'Frontend', desc: 'UI + type safety' },
  { name: 'scikit-learn', category: 'ML', desc: 'Local model training' },
  { name: 'Solidity', category: 'Contracts', desc: 'fed-learn.sol (0.0.6917091)' },
  { name: 'Hardhat', category: 'Contracts', desc: 'Hedera deployment' },
  { name: 'RSA-OAEP 2048', category: 'Crypto', desc: 'Weight URL encryption' },
  { name: 'Python 3.11', category: 'Backend', desc: 'P2P node runtime' },
];

export default function TechStack() {
  return (
    <section className="py-20 px-6 border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-mono tracking-widest text-fuchsia-400 uppercase mb-3">
            Tech stack
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold text-zinc-100">
            Built on open-source foundations
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {stack.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="card-glass rounded-lg p-4 flex flex-col gap-1 hover:border-white/[0.12] transition-colors"
            >
              <span className="text-xs font-mono text-fuchsia-400/70">
                {item.category}
              </span>
              <span className="text-sm font-semibold text-zinc-200">
                {item.name}
              </span>
              <span className="text-xs text-zinc-500">{item.desc}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
