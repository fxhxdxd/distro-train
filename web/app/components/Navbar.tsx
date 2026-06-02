'use client';

import { Github, FileText, Play } from 'lucide-react';

const GITHUB_URL = 'https://github.com/1Ayush-Petwal/Distro_Train_M';

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#03000a]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <span className="w-2 h-2 rounded-full bg-fuchsia-500 group-hover:bg-fuchsia-400 transition-colors" />
          <span className="text-sm font-semibold text-zinc-100">
            distro-train
          </span>
        </a>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 text-sm text-zinc-400">
          <a
            href="#how-it-works"
            className="px-3 py-1.5 rounded-md hover:text-zinc-100 hover:bg-white/[0.04] transition-all"
          >
            How it works
          </a>
          <a
            href="#security"
            className="px-3 py-1.5 rounded-md hover:text-zinc-100 hover:bg-white/[0.04] transition-all"
          >
            Security
          </a>
          <a
            href="#architecture"
            className="px-3 py-1.5 rounded-md hover:text-zinc-100 hover:bg-white/[0.04] transition-all"
          >
            Architecture
          </a>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <a
            href="#demo"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-white/[0.04] transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            Demo
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-100 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md transition-all"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
          <a
            href="#paper"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-md transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            Paper
          </a>
        </div>
      </div>
    </header>
  );
}
