'use client';

import { useEffect } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error Boundary Captured]:', error);
  }, [error]);

  return (
    <html lang="en" className="dark bg-black">
      <body className="min-h-screen flex items-center justify-center bg-black text-slate-100 p-4 font-sans select-none">
        <div className="relative z-10 max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-zinc-950/90 border border-white/10 shadow-2xl backdrop-blur-2xl">
          <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono tracking-widest uppercase">
              Core Frame Crash // 500
            </div>
            <h1 className="text-2xl font-light text-white tracking-wide">
              Observatory System Halt
            </h1>
            <p className="text-xs text-zinc-400 font-light leading-relaxed">
              A critical failure occurred in the primary view hierarchy. Telemetry state has been preserved.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-mono tracking-wider uppercase bg-[#fea082] text-black font-semibold hover:brightness-110 transition-all cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reboot Observatory</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
