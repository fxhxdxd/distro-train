'use client';

import { motion, type Transition } from 'framer-motion';
import { Github, Play, ArrowRight } from 'lucide-react';

const GITHUB_URL = 'https://github.com/1Ayush-Petwal/Distro_Train_M';

function fadeUp(delay = 0) {
  const transition: Transition = { duration: 0.65, ease: 'easeOut', delay };
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition,
  };
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Glow orb */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[700px] h-[500px] rounded-full blur-[140px]"
          style={{
            background:
              'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Fade bottom edge */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#080810] to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          {...fadeUp(0)}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium tracking-wide mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          B.Tech Project · LNMIIT Jaipur · 2026
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.08)}
          className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.08] mb-6"
        >
          <span className="text-zinc-100">Train any model.</span>
          <br />
          <span className="text-zinc-100">On any hardware.</span>
          <br />
          <span className="text-gradient">Without trusting anyone.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          {...fadeUp(0.18)}
          className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10"
        >
          distro-train is a serverless peer-to-peer marketplace connecting ML
          users with volunteer trainers. Secured by five layers of
          Byzantine-robust aggregation, settled on Hedera smart contracts, stored
          on IPFS. No central server, ever.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.26)}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="#demo"
            className="group flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-indigo-600/25"
          >
            <Play className="w-4 h-4" />
            Watch Demo
            <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-zinc-100 font-medium rounded-lg transition-all duration-200"
          >
            <Github className="w-4 h-4" />
            View on GitHub
          </a>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          {...fadeUp(0.4)}
          className="mt-20 flex flex-col items-center gap-2"
        >
          <span className="text-xs font-mono tracking-widest text-zinc-600 uppercase">
            scroll to explore
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-zinc-600 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
