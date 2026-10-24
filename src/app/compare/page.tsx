'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  ArrowRightLeft,
  Zap,
  MapPin,
  Sliders,
} from 'lucide-react';
import { CITIES } from '@/lib/cities';
import { getCityTime, compareCities } from '@/lib/timeEngine';
import { CityData, TimeDetail, ComparisonResult } from '@/types';

export default function ComparePage() {
  const [cityA, setCityA] = useState<CityData>(CITIES[0]); // Tokyo
  const [cityB, setCityB] = useState<CityData>(CITIES[13]); // London
  const [timeA, setTimeA] = useState<TimeDetail | null>(null);
  const [timeB, setTimeB] = useState<TimeDetail | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [scrubberHour, setScrubberHour] = useState<number>(new Date().getHours());

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeA(getCityTime(cityA, now));
      setTimeB(getCityTime(cityB, now));
      setComparison(compareCities(cityA, cityB, now));
    };

    queueMicrotask(update);
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cityA, cityB]);

  const handleSwap = () => {
    const temp = cityA;
    setCityA(cityB);
    setCityB(temp);
  };

  // Calculates exact real-world timestamp for cityA at scrubberHour:00
  const calculateScrubberTimestamp = (baseCity: CityData, hour: number, baseDate: Date = new Date()): Date => {
    const baseDetail = getCityTime(baseCity, baseDate);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: baseCity.timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(baseDate);
    const year = parseInt(parts.find((p) => p.type === 'year')?.value || `${baseDate.getFullYear()}`, 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || `${baseDate.getMonth() + 1}`, 10) - 1;
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || `${baseDate.getDate()}`, 10);

    const localTargetMs = Date.UTC(year, month, day, hour, 0, 0);
    const targetUtcMs = localTargetMs - baseDetail.utcOffsetMinutes * 60000;
    return new Date(targetUtcMs);
  };

  const getDayOffset = (timestamp: Date, city1: CityData, city2: CityData): number => {
    const day1 = new Intl.DateTimeFormat('en-CA', { timeZone: city1.timezone }).format(timestamp);
    const day2 = new Intl.DateTimeFormat('en-CA', { timeZone: city2.timezone }).format(timestamp);
    return Math.round(
      (new Date(day2 + 'T00:00:00Z').getTime() - new Date(day1 + 'T00:00:00Z').getTime()) / 86400000
    );
  };

  const scrubberTargetTimestamp = calculateScrubberTimestamp(cityA, scrubberHour);
  const scrubbedTimeA = getCityTime(cityA, scrubberTargetTimestamp);
  const scrubbedTimeB = getCityTime(cityB, scrubberTargetTimestamp);
  const scrubberDayOffset = getDayOffset(scrubberTargetTimestamp, cityA, cityB);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Interactive Timezone Comparison Studio</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Compare Any Two Cities Worldwide
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
          Explore synchronized clocks, 24-hour hour-by-hour cross mappings, and working hours overlap.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:flex-1 space-y-1">
          <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Base City
          </span>
          <select
            value={cityA.id}
            onChange={(e) => {
              const c = CITIES.find((x) => x.id === e.target.value);
              if (c) setCityA(c);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-medium bg-[#080d1e]"
          >
            {CITIES.map((c) => (
              <option key={`cmp-a-${c.id}`} value={c.id}>
                {c.flag} {c.city}, {c.country} ({c.timezone})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSwap}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 hover:text-white transition-all hover:rotate-180 duration-300"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        <div className="w-full sm:flex-1 space-y-1">
          <span className="text-xs text-purple-400 font-semibold flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Target City
          </span>
          <select
            value={cityB.id}
            onChange={(e) => {
              const c = CITIES.find((x) => x.id === e.target.value);
              if (c) setCityB(c);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-medium bg-[#080d1e]"
          >
            {CITIES.map((c) => (
              <option key={`cmp-b-${c.id}`} value={c.id}>
                {c.flag} {c.city}, {c.country} ({c.timezone})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clocks & Difference Hero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* City A Card */}
        <div className="glass-panel rounded-2xl p-6 border border-cyan-500/20 bg-cyan-950/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{cityA.flag}</span>
              <div>
                <h3 className="font-bold text-white text-lg">{cityA.city}</h3>
                <p className="text-xs text-gray-400">{cityA.country}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/5 text-xs text-cyan-300 font-mono">
              {timeA?.utcOffset}
            </span>
          </div>

          <div className="text-4xl font-extrabold text-cyan-300 font-mono tracking-tight text-glow-cyan py-2">
            {timeA?.currentTime || '--:--:--'}
          </div>

          <div className="space-y-1 text-xs text-gray-400 border-t border-white/5 pt-3">
            <div className="flex justify-between">
              <span>Timezone:</span>
              <span className="text-white font-mono">{cityA.timezone}</span>
            </div>
            <div className="flex justify-between">
              <span>Coordinates:</span>
              <span className="text-white font-mono">{cityA.lat.toFixed(2)}°, {cityA.lng.toFixed(2)}°</span>
            </div>
            <div className="flex justify-between">
              <span>Daylight Saving:</span>
              <span className="text-white">{timeA?.isDST ? 'Active (DST)' : 'Standard Time'}</span>
            </div>
          </div>
        </div>

        {/* City B Card */}
        <div className="glass-panel rounded-2xl p-6 border border-purple-500/20 bg-purple-950/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{cityB.flag}</span>
              <div>
                <h3 className="font-bold text-white text-lg">{cityB.city}</h3>
                <p className="text-xs text-gray-400">{cityB.country}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/5 text-xs text-purple-300 font-mono">
              {timeB?.utcOffset}
            </span>
          </div>

          <div className="text-4xl font-extrabold text-purple-300 font-mono tracking-tight text-glow-purple py-2">
            {timeB?.currentTime || '--:--:--'}
          </div>

          <div className="space-y-1 text-xs text-gray-400 border-t border-white/5 pt-3">
            <div className="flex justify-between">
              <span>Timezone:</span>
              <span className="text-white font-mono">{cityB.timezone}</span>
            </div>
            <div className="flex justify-between">
              <span>Coordinates:</span>
              <span className="text-white font-mono">{cityB.lat.toFixed(2)}°, {cityB.lng.toFixed(2)}°</span>
            </div>
            <div className="flex justify-between">
              <span>Daylight Saving:</span>
              <span className="text-white">{timeB?.isDST ? 'Active (DST)' : 'Standard Time'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Difference & Working Hours Overlap */}
      {comparison && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>{comparison.formattedDifference}</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">{comparison.workingHoursOverlap.advice}</p>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-cyan-300">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>{comparison.workingHoursOverlap.overlapWindowString}</span>
            </div>
          </div>

          {/* Interactive 24-Hour Scrubber */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Synchronized 24-Hour Timeline Scrubber</span>
              </label>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-cyan-300">
                  When it is <strong className="text-white">{scrubbedTimeA.currentTime.replace(/:\d\d\s/, ' ')}</strong> in {cityA.city}, it is{' '}
                  <strong className="text-purple-300">{scrubbedTimeB.currentTime.replace(/:\d\d\s/, ' ')}</strong> in {cityB.city}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    scrubberDayOffset > 0
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : scrubberDayOffset < 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {scrubberDayOffset > 0 ? '+1 Day' : scrubberDayOffset < 0 ? '-1 Day' : 'Today'}
                </span>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={23}
              value={scrubberHour}
              onChange={(e) => setScrubberHour(Number(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-white/10 rounded-lg cursor-pointer"
            />

            {/* 24-hour Matrix Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 pt-4">
              {Array.from({ length: 24 }).map((_, h) => {
                const isSelected = h === scrubberHour;
                const slotTimestamp = calculateScrubberTimestamp(cityA, h);
                const slotTimeA = getCityTime(cityA, slotTimestamp);
                const slotTimeB = getCityTime(cityB, slotTimestamp);
                const slotDayOffset = getDayOffset(slotTimestamp, cityA, cityB);

                const isFromWorking = slotTimeA.hour24 >= 9 && slotTimeA.hour24 < 18;
                const isToWorking = slotTimeB.hour24 >= 9 && slotTimeB.hour24 < 18;
                const isWorkingOverlap = isFromWorking && isToWorking;

                const aPeriod = slotTimeA.hour24 >= 12 ? 'PM' : 'AM';
                const aHour = slotTimeA.hour24 % 12 === 0 ? 12 : slotTimeA.hour24 % 12;
                const timeAFormatted = `${aHour} ${aPeriod}`;

                const bPeriod = slotTimeB.hour24 >= 12 ? 'PM' : 'AM';
                const bHour = slotTimeB.hour24 % 12 === 0 ? 12 : slotTimeB.hour24 % 12;
                const bMins = slotTimeB.minutes > 0 ? `:${String(slotTimeB.minutes).padStart(2, '0')}` : '';
                const timeBFormatted = `${bHour}${bMins} ${bPeriod}`;

                return (
                  <button
                    key={`slot-${h}`}
                    onClick={() => setScrubberHour(h)}
                    title={`${cityA.city} ${slotTimeA.currentTime} ➔ ${cityB.city} ${slotTimeB.currentTime} (${
                      slotDayOffset > 0 ? '+1 Day' : slotDayOffset < 0 ? '-1 Day' : 'Today'
                    })`}
                    className={`group relative p-2.5 rounded-xl text-center transition-all duration-200 border flex flex-col justify-between items-center cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-black font-bold ring-2 ring-cyan-300 border-cyan-300 shadow-lg shadow-cyan-500/30 scale-105 z-10'
                        : isWorkingOverlap
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-400 hover:scale-[1.03]'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-cyan-400/40 hover:scale-[1.03]'
                    }`}
                  >
                    {/* Date Boundary Pill */}
                    <div className="w-full flex justify-center mb-1">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-semibold tracking-tight transition-colors ${
                          isSelected
                            ? 'bg-black/20 text-black'
                            : slotDayOffset > 0
                            ? 'bg-purple-500/25 text-purple-300 border border-purple-500/30'
                            : slotDayOffset < 0
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/30'
                            : 'bg-white/5 text-gray-400'
                        }`}
                      >
                        {slotDayOffset > 0 ? '+1 Day' : slotDayOffset < 0 ? '-1 Day' : 'Today'}
                      </span>
                    </div>

                    {/* City A Time */}
                    <div
                      className={`text-xs font-mono font-bold leading-tight ${
                        isSelected ? 'text-black font-black' : 'text-white group-hover:text-cyan-300'
                      }`}
                    >
                      {timeAFormatted}
                    </div>

                    {/* City B Time */}
                    <div
                      className={`text-[10px] font-mono leading-tight mt-1 ${
                        isSelected
                          ? 'text-black/80 font-bold'
                          : slotDayOffset !== 0
                          ? 'text-purple-300'
                          : 'text-gray-400 group-hover:text-gray-200'
                      }`}
                    >
                      {timeBFormatted}
                    </div>

                    {/* Overlap Indicator dot */}
                    {isWorkingOverlap && !isSelected && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-gray-900 shadow-[0_0_6px_#34d399]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 pt-3 gap-2 border-t border-white/5">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/60" />
                  <span>Shared Business Overlap (9AM-6PM)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-cyan-500" />
                  <span>Selected Scrubber Hour</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/30 font-mono">
                    +1 Day
                  </span>
                  <span>Target Next Day</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/30 font-mono">
                    -1 Day
                  </span>
                  <span>Target Prior Day</span>
                </span>
              </div>
              <span className="text-gray-500">Click any column to scrub timeline</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
