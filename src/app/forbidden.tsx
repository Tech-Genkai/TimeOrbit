import Link from 'next/link';
import { ShieldAlert, ArrowRight, Lock, Home } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 overflow-hidden bg-black text-slate-100">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-amber-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-7 p-8 rounded-3xl bg-zinc-950/80 border border-amber-500/20 backdrop-blur-2xl shadow-2xl">
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(245,158,11,0.15)] text-amber-400">
          <ShieldAlert className="w-10 h-10" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black border border-amber-500/40 flex items-center justify-center">
            <Lock className="w-3 h-3 text-amber-400" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono tracking-widest text-amber-400 uppercase">
            Clearance Protocol // 403
          </div>
          <h1 className="text-3xl sm:text-4xl font-extralight tracking-wider text-white">
            Access Restricted
          </h1>
          <p className="text-sm font-light text-zinc-400 leading-relaxed max-w-md mx-auto">
            You do not possess the required security authorization to view this orbital command sector. This terminal is reserved for Super Administrators.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-widest bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 transition-all cursor-pointer"
          >
            <span>Authenticate Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-widest glow-btn transition-all shadow-md"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Mission Control</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
