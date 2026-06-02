'use client';

import { motion } from 'framer-motion';

// TODO: Replace LOOM_EMBED_URL with your YouTube embed URL once uploaded
// YouTube embed format: https://www.youtube.com/embed/<video-id>
const LOOM_EMBED_URL =
  'https://www.loom.com/embed/49afb7fc3a29451482d053b8bf19aa62?autoplay=0&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true';

export default function DemoVideo() {
  return (
    <section id="demo" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-mono tracking-widest text-fuchsia-400 uppercase mb-3">
            Live demo
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-zinc-100 mb-4">
            End-to-end training run
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-base">
            Dataset upload → distributed training across 3 nodes → weight
            delivery. Fully decentralized, settled on Hedera.
          </p>
        </motion.div>

        {/* Browser window */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/60"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#0f1018] border-b border-white/[0.06]">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            <span className="flex-1 mx-4 text-xs text-center text-zinc-600 font-mono">
              distro-train — demo
            </span>
          </div>

          {/* Video embed */}
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={LOOM_EMBED_URL}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; fullscreen"
              title="distro-train demo"
            />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-xs text-zinc-600 mt-4 font-mono"
        >
          Recorded on Hedera Testnet · IPFS via Pinata · 3 trainer nodes
        </motion.p>
      </div>
    </section>
  );
}
