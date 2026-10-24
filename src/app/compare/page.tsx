'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  ArrowRightLeft,
  Zap,
  MapPin,
  Sliders,
  Navigation,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { CITIES, resolveUserCity, findNearestCity } from '@/lib/cities';
import { getCityTime, compareCities } from '@/lib/timeEngine';
import { CityData, TimeDetail, ComparisonResult } from '@/types';

const REGION_GROUPS = [
  { label: 'Asia & South Asia', cities: CITIES.filter((c) => c.timezone.startsWith('Asia/')) },
  { label: 'Europe', cities: CITIES.filter((c) => c.timezone.startsWith('Europe/')) },
  {
    label: 'North America',
    cities: CITIES.filter(
      (c) =>
        c.timezone.startsWith('America/') &&
        (c.country === 'United States' || c.country === 'Canada' || c.country === 'Mexico')
    ),
  },
  {
    label: 'Latin America',
    cities: CITIES.filter(
      (c) =>
        c.timezone.startsWith('America/') &&
        c.country !== 'United States' &&
        c.country !== 'Canada' &&
        c.country !== 'Mexico'
    ),
  },
  {
    label: 'Oceania & Pacific',
    cities: CITIES.filter((c) => c.timezone.startsWith('Australia/') || c.timezone.startsWith('Pacific/')),
  },
  { label: 'Africa', cities: CITIES.filter((c) => c.timezone.startsWith('Africa/')) },
];

export default function ComparePage() {
  const [cityA, setCityA] = useState<CityData>(CITIES[0]); // Tokyo or auto-detected
  const [cityB, setCityB] = useState<CityData>(CITIES[47] || CITIES[13]); // London
  const [timeA, setTimeA] = useState<TimeDetail | null>(null);
  const [timeB, setTimeB] = useState<TimeDetail | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [scrubberHour, setScrubberHour] = useState<number>(12);

  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setScrubberHour(new Date().getHours());
    });
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const matched = resolveUserCity(userTz);
      if (matched) {
        queueMicrotask(() => {
          setCityA(matched);
        });
      }
    } catch (e) {
      console.error('Timezone auto-detect error:', e);
    }
  }, []);

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

  const handleDetectLocation = () => {
    setIsLocating(true);
    setLocationStatus('Accessing orbital coordinates...');

    if (typeof window === 'undefined' || !navigator.geolocation) {
      const fallback = resolveUserCity();
      setCityA(fallback);
      setLocationStatus(`Timezone matched: ${fallback.city}, ${fallback.country}`);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = findNearestCity(latitude, longitude);
        setCityA(nearest);
        setLocationStatus(`Located: ${nearest.city}, ${nearest.country} (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`);
        setIsLocating(false);
        setTimeout(() => setLocationStatus(null), 8000);
      },
      (err) => {
        console.warn('Geolocation denied:', err.message);
        const fallback = resolveUserCity();
        setCityA(fallback);
        setLocationStatus(`Using closest timezone hub: ${fallback.city}, ${fallback.country}`);
        setIsLocating(false);
        setTimeout(() => setLocationStatus(null), 8000);
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  const handleSwap = () => {
    const temp = cityA;
    setCityA(cityB);
    setCityB(temp);
  };

  const renderSolarBadge = (state?: 'day' | 'night' | 'dawn' | 'dusk') => {
    switch (state) {
      case 'day':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/5 border border-white/10 text-white">
            <Sun className="w-3 h-3 text-[#fea082]" /> Day
          </span>
        );
      case 'night':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-400">
            <Moon className="w-3 h-3 text-zinc-300" /> Night
          </span>
        );
      case 'dawn':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/5 border border-white/10 text-[#fea082]">
            <Sunrise className="w-3 h-3 text-[#fea082]" /> Dawn
          </span>
        );
      case 'dusk':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/5 border border-white/10 text-[#fea082]">
            <Sunset className="w-3 h-3 text-[#fea082]" /> Dusk
          </span>
        );
      default:
        return null;
    }
  };

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
        <h1 className="text-2xl sm:text-3xl font-light tracking-[0.25em] uppercase text-white">
          Comparison Studio
        </h1>
        <p className="text-xs sm:text-sm font-light tracking-[0.2em] uppercase text-[#fea082]">
          Synchronized Planetary Coordinates
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-light tracking-wider uppercase text-zinc-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#fea082]" /> Base Hub
              </span>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer"
              >
                <Navigation className={`w-3 h-3 text-[#fea082] ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Detect GPS'}</span>
              </button>
            </div>

            <select
              value={cityA.id}
              onChange={(e) => {
                const c = CITIES.find((x) => x.id === e.target.value);
                if (c) setCityA(c);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 text-xs font-light bg-black/80 text-white focus:border-[#fea082] outline-none"
            >
              {REGION_GROUPS.map((group) => (
                <optgroup
                  key={`cmp-grp-a-${group.label}`}
                  label={group.label}
                  className="bg-zinc-900 text-zinc-400 font-normal uppercase tracking-wider text-[11px]"
                >
                  {group.cities.map((c) => (
                    <option key={`cmp-a-${c.id}`} value={c.id} className="text-white">
                      {c.city}, {c.country} ({c.timezone})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwap}
            title="Swap cities"
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 transition-all hover:rotate-180 duration-300 sm:mt-5 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <div className="w-full sm:flex-1 space-y-1">
            <span className="text-xs font-light tracking-wider uppercase text-zinc-300 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#fea082]" /> Target Hub
            </span>
            <select
              value={cityB.id}
              onChange={(e) => {
                const c = CITIES.find((x) => x.id === e.target.value);
                if (c) setCityB(c);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 text-xs font-light bg-black/80 text-white focus:border-[#fea082] outline-none"
            >
              {REGION_GROUPS.map((group) => (
                <optgroup
                  key={`cmp-grp-b-${group.label}`}
                  label={group.label}
                  className="bg-zinc-900 text-zinc-400 font-normal uppercase tracking-wider text-[11px]"
                >
                  {group.cities.map((c) => (
                    <option key={`cmp-b-${c.id}`} value={c.id} className="text-white">
                      {c.city}, {c.country} ({c.timezone})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {locationStatus && (
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-[#fea082] shrink-0 animate-pulse" />
            <span>{locationStatus}</span>
          </div>
        )}
      </div>

      {/* Clocks & Difference Hero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* City A Card */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-light tracking-[0.15em] text-white uppercase text-base">{cityA.city}</h3>
              <p className="text-xs text-zinc-400 font-light">{cityA.country}</p>
            </div>
            <div className="flex items-center gap-2">
              {renderSolarBadge(timeA?.solarState)}
              <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-300 font-mono">
                {timeA?.utcOffset}
              </span>
            </div>
          </div>

          <div
            suppressHydrationWarning
            className="text-4xl font-light text-white font-mono tracking-wider py-2"
          >
            {timeA?.currentTime || '--:--:--'}
          </div>

          <div className="space-y-1 text-xs text-zinc-400 border-t border-white/10 pt-3 font-light">
            <div className="flex justify-between">
              <span>Timezone:</span>
              <span className="text-white font-mono">{cityA.timezone}</span>
            </div>
            <div className="flex justify-between">
              <span>Coordinates:</span>
              <span className="text-white font-mono">
                {cityA.lat.toFixed(2)}°, {cityA.lng.toFixed(2)}°
              </span>
            </div>
            <div className="flex justify-between">
              <span>Daylight Saving:</span>
              <span suppressHydrationWarning className="text-white font-mono">
                {timeA?.isDST ? 'Active (DST)' : 'Standard Time'}
              </span>
            </div>
          </div>
        </div>

        {/* City B Card */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-light tracking-[0.15em] text-white uppercase text-base">{cityB.city}</h3>
              <p className="text-xs text-zinc-400 font-light">{cityB.country}</p>
            </div>
            <div className="flex items-center gap-2">
              {renderSolarBadge(timeB?.solarState)}
              <span suppressHydrationWarning className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-[#fea082] font-mono">
                {timeB?.utcOffset}
              </span>
            </div>
          </div>

          <div
            suppressHydrationWarning
            className="text-4xl font-light text-[#fea082] font-mono tracking-wider py-2"
          >
            {timeB?.currentTime || '--:--:--'}
          </div>

          <div className="space-y-1 text-xs text-zinc-400 border-t border-white/10 pt-3 font-light">
            <div className="flex justify-between">
              <span>Timezone:</span>
              <span className="text-white font-mono">{cityB.timezone}</span>
            </div>
            <div className="flex justify-between">
              <span>Coordinates:</span>
              <span className="text-white font-mono">
                {cityB.lat.toFixed(2)}°, {cityB.lng.toFixed(2)}°
              </span>
            </div>
            <div className="flex justify-between">
              <span>Daylight Saving:</span>
              <span suppressHydrationWarning className="text-white font-mono">
                {timeB?.isDST ? 'Active (DST)' : 'Standard Time'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Summary Bar */}
      {comparison && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-2">
          <div suppressHydrationWarning className="flex items-center gap-2 text-sm font-light tracking-wider uppercase text-white">
            <Clock className="w-4 h-4 text-[#fea082]" />
            <span>{comparison.formattedDifference}</span>
          </div>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            {comparison.workingHoursOverlap.advice}
          </p>
        </div>
      )}

      {/* Interactive 24-Hour Scrubber */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-sm font-light tracking-[0.2em] uppercase text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#fea082]" />
              <span>Interactive 24-Hour Scrubber</span>
            </h2>
          </div>
          <button
            onClick={() => setScrubberHour(new Date().getHours())}
            className="text-xs uppercase tracking-wider text-zinc-300 hover:text-white font-light px-3 py-1 rounded bg-white/5 border border-white/15 cursor-pointer"
          >
            Reset Time
          </button>
        </div>

        {/* Range Slider */}
        <div className="space-y-2">
          <input
            suppressHydrationWarning
            type="range"
            min="0"
            max="23"
            value={scrubberHour}
            onChange={(e) => setScrubberHour(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#fea082]"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* Scrubbed Clocks Result */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 rounded-xl p-4 border border-white/10">
          <div className="space-y-1">
            <span className="text-xs text-white font-light uppercase tracking-wider">{cityA.city}</span>
            <div suppressHydrationWarning className="text-2xl font-light font-mono text-white">
              {scrubbedTimeA.currentTime}
            </div>
            <p suppressHydrationWarning className="text-[11px] text-zinc-400 font-light">
              {scrubbedTimeA.currentDate}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-[#fea082] font-light uppercase tracking-wider">{cityB.city}</span>
            <div suppressHydrationWarning className="text-2xl font-light font-mono text-[#fea082]">
              {scrubbedTimeB.currentTime}
            </div>
            <p suppressHydrationWarning className="text-[11px] text-zinc-400 font-light">
              {scrubbedTimeB.currentDate}
              {scrubberDayOffset !== 0 && (
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                  {scrubberDayOffset > 0 ? `+${scrubberDayOffset}d` : `${scrubberDayOffset}d`}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 24-Hour Hour-by-Hour Cross Mapping Matrix */}
      {comparison && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-light tracking-[0.2em] uppercase text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#fea082]" />
              <span>Full 24-Hour Matrix</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3">Hour</th>
                  <th className="py-2.5 px-3 text-white uppercase">{cityA.city}</th>
                  <th className="py-2.5 px-3 text-[#fea082] uppercase">{cityB.city}</th>
                  <th className="py-2.5 px-3">Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comparison.timeline24h.map((slot) => (
                  <tr
                    key={`slot-${slot.hourFrom}`}
                    className={`transition-colors ${
                      slot.isWorkingOverlap
                        ? 'bg-white/5'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-zinc-500">{slot.hourFrom}:00</td>
                    <td className="py-2 px-3 text-white font-mono">{slot.timeFromFormatted}</td>
                    <td className="py-2 px-3 text-[#fea082] font-mono">{slot.timeToFormatted}</td>
                    <td className="py-2 px-3">
                      {slot.isWorkingOverlap ? (
                        <span className="text-[10px] font-mono uppercase text-white">
                          ● Work Overlap
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono">Off-Hours</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
