'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Lock } from 'lucide-react';

const STORAGE_KEY = 'timeorbit_age_verified';

export default function AgeVerificationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnderage, setIsUnderage] = useState(false);

  useEffect(() => {
    // Only check in browser
    queueMicrotask(() => {
      try {
        const verified = localStorage.getItem(STORAGE_KEY);
        if (verified !== 'true') {
          setIsOpen(true);
        }
      } catch {
        // If localStorage is blocked or unavailable
        setIsOpen(false);
      }
    });
  }, []);

  const handleConfirmAge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  const handleRejectAge = () => {
    setIsUnderage(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="max-w-md w-full bg-zinc-950/95 border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle celestial accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#fea082] to-transparent opacity-80" />

        {isUnderage ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-light tracking-[0.2em] uppercase text-white">
              Access Restricted
            </h2>
            <p className="text-xs text-zinc-400 font-light leading-relaxed">
              In accordance with platform terms and developer compliance policies, you must be at least 18 years old to access TimeOrbit.
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              Please return when you meet the age requirement.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/15 flex items-center justify-center mx-auto text-[#fea082]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-light tracking-[0.25em] uppercase text-white">
                Age Verification
              </h2>
              <p className="text-[11px] font-light tracking-[0.18em] uppercase text-[#fea082]">
                Planetary Observatory Compliance
              </p>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs text-zinc-300 font-light leading-relaxed">
              <p>
                TimeOrbit developer APIs, planetary telemetry, and celestial observatory tools require all participants to be <strong>18 years of age or older</strong>.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono pt-1 border-t border-white/10">
                <Lock className="w-3 h-3 text-[#fea082]" />
                <span>Verification recorded locally per device</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmAge}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-medium tracking-wider uppercase bg-[#fea082] text-black hover:bg-[#ffb69f] active:scale-98 transition-all cursor-pointer shadow-lg shadow-[#fea082]/10"
              >
                I am 18 or older — Enter Platform
              </button>
              <button
                type="button"
                onClick={handleRejectAge}
                className="w-full py-2 px-4 rounded-xl text-xs font-light tracking-wider uppercase text-zinc-400 hover:text-white bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
              >
                I am under 18
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
