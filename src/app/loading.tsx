import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-slate-200 tracking-wider uppercase text-xs mb-1">
        Synchronizing Observatory Telemetry
      </h3>
      <p className="text-xs text-slate-500 font-mono">
        Aligning coordinates & ephemeris calculations...
      </p>
    </div>
  );
}
