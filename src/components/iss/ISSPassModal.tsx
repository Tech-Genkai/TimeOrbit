'use client';

import React, { useState, useEffect } from 'react';
import { X, Satellite, Compass, Eye, Clock, Calendar, Check } from 'lucide-react';
import { CityData, ISSPassPrediction } from '@/types';
import { calculateISSPasses } from '@/lib/timeEngine';

interface ISSPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: CityData;
}

export default function ISSPassModal({ isOpen, onClose, city }: ISSPassModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [passes, setPasses] = useState<ISSPassPrediction[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setCurrentTime(Date.now());
      setPasses(calculateISSPasses(city.lat, city.lng, new Date(), 5));
    });
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, [isOpen, city.lat, city.lng]);

  if (!isOpen) return null;

  const nextPass = passes[0];
  const minutesUntilNext = nextPass && currentTime > 0
    ? Math.max(0, Math.round((nextPass.startTime.getTime() - currentTime) / 60000))
    : null;

  const formatPassDate = (d: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: city.timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  };

  const handleCopyPass = (p: ISSPassPrediction) => {
    const text = `ISS Flyover over ${city.city}, ${city.country} on ${formatPassDate(p.startTime)}: Max Elevation ${p.maxElevationDeg}° (${p.peakCompass}), Trajectory ${p.riseCompass} ➔ ${p.setCompass}, Visibility: ${p.visibility}. Tracked via TimeOrbit.`;
    navigator.clipboard.writeText(text);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-black/90 border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-[#38bdf8]">
                <Satellite className="w-4 h-4 animate-pulse" />
              </div>
              <h2 className="text-base sm:text-lg font-light tracking-[0.2em] uppercase text-white">
                ISS Flyover Radar
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-light">
              Upcoming orbital passes over <span className="text-white font-normal">{city.city}, {city.country}</span> ({city.lat.toFixed(2)}°, {city.lng.toFixed(2)}°)
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            title="Close Radar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Next Flyover Countdown Banner */}
        {nextPass && (
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-widest text-[#38bdf8] font-mono">
                Next Approaching Orbit
              </span>
              <div className="text-sm font-light text-white flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Starts in approximately <strong className="font-mono text-[#fea082]">{minutesUntilNext} minutes</strong></span>
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                {formatPassDate(nextPass.startTime)} • Peak Altitude: <span className="text-white font-mono">{nextPass.maxElevationDeg}°</span>
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                  nextPass.visibility.includes('Twilight')
                    ? 'bg-sky-500/10 border-sky-400/30 text-[#38bdf8]'
                    : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                {nextPass.visibility}
              </span>
            </div>
          </div>
        )}

        {/* Passes List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-light uppercase tracking-wider">
            <span>Next 5 Predicted Flyovers (48h Window)</span>
            <span className="font-mono text-[10px] text-zinc-500">Threshold: Elev &gt; 10°</span>
          </div>

          <div className="space-y-2.5">
            {passes.map((pass, index) => {
              const isNakedEye = pass.visibility.includes('Twilight');

              return (
                <div
                  key={pass.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isNakedEye
                      ? 'bg-sky-950/20 border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.06)]'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Left: Index & Time */}
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono text-[11px] text-zinc-400 shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-light text-white flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          <span>{formatPassDate(pass.startTime)}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-3 mt-0.5">
                          <span>Duration: {pass.durationMinutes} min</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Compass className="w-3 h-3 text-zinc-500" />
                            {pass.riseCompass} ➔ {pass.peakCompass} ➔ {pass.setCompass}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Elevation & Visibility badge */}
                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="text-xs font-mono font-light text-white">
                          Peak: <span className="text-[#38bdf8] font-normal">{pass.maxElevationDeg}°</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-light">
                          {pass.maxElevationDeg >= 60
                            ? 'Nearly Overhead'
                            : pass.maxElevationDeg >= 30
                            ? 'High in Sky'
                            : 'Low on Horizon'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono tracking-wider flex items-center gap-1 border ${
                            isNakedEye
                              ? 'bg-sky-500/10 border-sky-400/40 text-[#38bdf8]'
                              : 'bg-white/5 border-white/10 text-zinc-400'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isNakedEye ? 'Naked Eye' : pass.visibility}</span>
                        </span>

                        <button
                          onClick={() => handleCopyPass(pass)}
                          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                          title="Copy Pass Details"
                        >
                          {copiedId === pass.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Satellite className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-zinc-500 font-light leading-relaxed border-t border-white/10 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>Orbital altitude: ~418 km • Inclination: 51.64° • Period: 92.7m</span>
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-wider text-zinc-300 hover:text-white px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
          >
            Close Radar
          </button>
        </div>
      </div>
    </div>
  );
}
