import Link from 'next/link';
import { Globe2 } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-white/10 bg-black/90 backdrop-blur-xl mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs tracking-wider uppercase text-zinc-400 font-light">
          <Globe2 className="w-4 h-4 text-[#fea082]" />
          <span className="text-white font-normal">TimeOrbit</span>
          <span className="text-zinc-600">—</span>
          <span>Planetary Time & Solar Explorer</span>
        </div>

        <div className="flex items-center gap-6 text-xs tracking-wider uppercase text-zinc-400 font-light">
          <Link href="/docs" className="hover:text-white transition-colors">
            Developer API
          </Link>
          <Link href="/compare" className="hover:text-white transition-colors">
            Time Comparison
          </Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">
            API Keys
          </Link>
        </div>

        <div className="text-[11px] text-zinc-600 font-mono">
          © {currentYear} TimeOrbit. In-House Celestial Engine.
        </div>
      </div>
    </footer>
  );
}
