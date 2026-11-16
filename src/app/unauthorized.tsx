import Link from 'next/link';
import { KeyRound, ArrowRight, UserPlus, Home } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 overflow-hidden bg-black text-slate-100">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-sky-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-7 p-8 rounded-3xl bg-zinc-950/80 border border-sky-500/20 backdrop-blur-2xl shadow-2xl">
        <div className="mx-auto w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.15)]">
          <KeyRound className="w-10 h-10" />
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs font-mono tracking-widest text-sky-400 uppercase">
            Authentication Required // 401
          </div>
          <h1 className="text-3xl sm:text-4xl font-extralight tracking-wider text-white">
            Astronaut Credentials Missing
          </h1>
          <p className="text-sm font-light text-zinc-400 leading-relaxed max-w-md mx-auto">
            This telemetry terminal requires an active session or valid cryptographic API key. Please log in or establish a mission account to proceed.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-widest glow-btn transition-all shadow-md"
          >
            <span>Sign In to Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
