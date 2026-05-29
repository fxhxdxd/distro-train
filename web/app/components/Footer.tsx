import { Github } from 'lucide-react';

const GITHUB_URL = 'https://github.com/1Ayush-Petwal/Distro_Train_M';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-sm text-zinc-500">
            <span className="text-zinc-300 font-medium">distro-train</span> ·
            Built by{' '}
            <span className="text-zinc-400">Fahad Khan</span> &amp;{' '}
            <span className="text-zinc-400">Ayush Petwal</span> · LNMIIT 2026
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <span className="font-mono text-xs">
            Contract: 0.0.6917091 · HCS: 0.0.6914391
          </span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
