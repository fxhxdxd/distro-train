'use client';

import { motion } from 'framer-motion';
import { Github, FileText, Play } from 'lucide-react';

const GITHUB_URL = 'https://github.com/1Ayush-Petwal/Distro_Train_M';

export default function CtaSection() {
  return (
    <section id="paper" className="py-24 px-6 border-t border-white/[0.05]">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden p-10 text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(168,85,247,0.08) 50%, rgba(168,85,247,0.06) 100%)',
            border: '1px solid rgba(168,85,247,0.2)',
          }}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.15) 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10">
            <p className="text-xs font-mono tracking-widest text-fuchsia-400 uppercase mb-4">
              Open source
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-zinc-100 mb-4">
              See the code.
              <br />
              Read the paper.
            </h2>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              All source code is on GitHub. The full B.Tech research report —
              including the TrustGossip security proofs, attack simulations, and
              experimental results — is available for download.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-zinc-900 font-semibold rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
              <a
                href="#demo"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-fuchsia-600/80 hover:bg-fuchsia-600 text-white font-medium rounded-lg transition-colors border border-fuchsia-500/30"
              >
                <Play className="w-4 h-4" />
                Watch Demo
              </a>
              <a
                href="#"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 font-medium rounded-lg transition-colors border border-white/[0.08]"
              >
                <FileText className="w-4 h-4" />
                BTP Paper
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
