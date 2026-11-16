import Link from 'next/link';
import { Globe2, ArrowRight, Clock, CalendarDays, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 overflow-hidden bg-black text-slate-100">
      {/* Background Starfield Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#fea082]/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 p-8 rounded-3xl bg-zinc-950/70 border border-white/10 backdrop-blur-2xl shadow-2xl">
        {/* Pulsing Target Ring */}
        <div className="mx-auto w-20 h-20 rounded-full bg-white/5 border border-white/15 flex items-center justify-center relative shadow-[0_0_30px_rgba(254,160,130,0.15)]">
          <Compass className="w-10 h-10 text-[#fea082] animate-spin" style={{ animationDuration: '30s' }} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-black animate-ping" />
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-[#fea082] uppercase">
            Trajectory Error // 404
          </div>
          <h1 className="text-3xl sm:text-4xl font-extralight tracking-wider text-white">
            Coordinates Not Found
          </h1>
          <p className="text-sm font-light text-zinc-400 leading-relaxed max-w-md mx-auto">
            The orbital path or celestial observatory coordinate you requested has drifted beyond the radar horizon.
          </p>
        </div>

        {/* Quick Re-Alignment Links */}
        <div className="pt-2 space-y-2">
          <p className="text-[11px] font-mono tracking-wider uppercase text-zinc-500">
            Re-align Telemetry:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-200 hover:text-white hover:bg-white/10 hover:border-[#fea082]/40 transition-all font-light"
            >
              <Globe2 className="w-4 h-4 text-[#fea082]" />
              <span>3D Earth</span>
            </Link>
            <Link
              href="/compare"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-200 hover:text-white hover:bg-white/10 hover:border-[#fea082]/40 transition-all font-light"
            >
              <Clock className="w-4 h-4 text-[#fea082]" />
              <span>Compare</span>
            </Link>
            <Link
              href="/clock"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-200 hover:text-white hover:bg-white/10 hover:border-[#fea082]/40 transition-all font-light"
            >
              <Clock className="w-4 h-4 text-[#fea082]" />
              <span>Digital Clock</span>
            </Link>
            <Link
              href="/calendar"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-200 hover:text-white hover:bg-white/10 hover:border-[#fea082]/40 transition-all font-light"
            >
              <CalendarDays className="w-4 h-4 text-[#fea082]" />
              <span>Calendar</span>
            </Link>
          </div>
        </div>

        {/* Home Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-mono uppercase tracking-widest glow-btn transition-all shadow-lg"
          >
            <span>Return to Mission Control</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
