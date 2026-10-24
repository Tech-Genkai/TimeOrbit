import Link from 'next/link';
import { Globe2, Code2 } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-white/10 bg-[#04060e]/80 backdrop-blur-md mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Globe2 className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-gray-200">TimeOrbit</span>
          <span>— One World. Every Time Zone.</span>
        </div>

        <div className="flex items-center gap-6 text-xs text-gray-400">
          <Link href="/docs" className="hover:text-cyan-400 transition-colors">
            Developer API
          </Link>
          <Link href="/compare" className="hover:text-cyan-400 transition-colors">
            Time Comparison
          </Link>
          <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
            API Keys
          </Link>
          <span className="flex items-center gap-1 text-gray-500">
            <Code2 className="w-3.5 h-3.5" />
            100% In-House Engine
          </span>
        </div>

        <div className="text-xs text-gray-500">
          © {currentYear} TimeOrbit. Built with Next.js & MongoDB Atlas.
        </div>
      </div>
    </footer>
  );
}
