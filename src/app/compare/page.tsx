'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  ArrowRightLeft,
  Zap,
  Sliders,
  Navigation,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Trash2,
  Calendar,
  Users,
} from 'lucide-react';
import { CITIES, resolveUserCity, findNearestCity } from '@/lib/cities';
import { getCityTime, compareCities, compareMultiCities, generateCalendarMeetingLinks } from '@/lib/timeEngine';
import { CityData, TimeDetail, ComparisonResult, MultiCityComparisonResult } from '@/types';
import { useToast } from '@/context/ToastContext';

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
  const toast = useToast();
  const [cities, setCities] = useState<CityData[]>([
    CITIES[0], // Tokyo
    CITIES[47] || CITIES[13], // London
  ]);

  const [cityTimes, setCityTimes] = useState<TimeDetail[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [multiComparison, setMultiComparison] = useState<MultiCityComparisonResult | null>(null);
  const [scrubberHour, setScrubberHour] = useState<number>(12);

  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [copiedCalendar, setCopiedCalendar] = useState(false);

  // Auto-detect user's primary timezone on mount
  useEffect(() => {
    queueMicrotask(() => {
      setScrubberHour(new Date().getHours());
    });
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const matched = resolveUserCity(userTz);
      if (matched) {
        queueMicrotask(() => {
          setCities((prev) => [matched, prev[1] || CITIES[13]]);
        });
      }
    } catch (e) {
      console.error('Timezone auto-detect error:', e);
    }
  }, []);

  // Synchronize clocks and multi-city comparison
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const times = cities.map((c) => getCityTime(c, now));
      setCityTimes(times);

      if (cities.length >= 2) {
        setComparison(compareCities(cities[0], cities[1], now));
        setMultiComparison(compareMultiCities(cities, now));
      }
    };

    queueMicrotask(update);
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cities]);

  const handleDetectLocation = () => {
    setIsLocating(true);
    setLocationStatus('Accessing orbital coordinates...');

    if (typeof window === 'undefined' || !navigator.geolocation) {
      const fallback = resolveUserCity();
      setCities((prev) => [fallback, ...prev.slice(1)]);
      setLocationStatus(`Timezone matched: ${fallback.city}, ${fallback.country}`);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = findNearestCity(latitude, longitude);
        setCities((prev) => [nearest, ...prev.slice(1)]);
        setLocationStatus(`Located: ${nearest.city}, ${nearest.country} (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`);
        setIsLocating(false);
        toast.success(`Primary hub set to ${nearest.city}, ${nearest.country}`, 'GPS Location Fixed');
        setTimeout(() => setLocationStatus(null), 8000);
      },
      (err) => {
        console.warn('Geolocation denied:', err.message);
        const fallback = resolveUserCity();
        setCities((prev) => [fallback, ...prev.slice(1)]);
        setLocationStatus(`Using closest timezone hub: ${fallback.city}, ${fallback.country}`);
        setIsLocating(false);
        setTimeout(() => setLocationStatus(null), 8000);
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  const handleSwapPrimary = () => {
    if (cities.length < 2) return;
    setCities((prev) => [prev[1], prev[0], ...prev.slice(2)]);
  };

  const handleAddCity = (cityToAdd: CityData) => {
    if (cities.length >= 5) return;
    if (cities.some((c) => c.id === cityToAdd.id)) return;
    setCities((prev) => [...prev, cityToAdd]);
  };

  const handleRemoveCity = (index: number) => {
    if (cities.length <= 2) return;
    setCities((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCity = (index: number, newCity: CityData) => {
    setCities((prev) => {
      const copy = [...prev];
      copy[index] = newCity;
      return copy;
    });
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

  const scrubberTargetTimestamp = calculateScrubberTimestamp(cities[0], scrubberHour);
  const scrubbedTimes = useMemo(() => {
    return cities.map((c) => getCityTime(c, scrubberTargetTimestamp));
  }, [cities, scrubberTargetTimestamp]);

  const handleExportGoldenMeeting = () => {
    if (!comparison) return;
    const bestHour = multiComparison?.goldenHour.bestUtcHour ?? 14;
    const cal = generateCalendarMeetingLinks(cities[0], cities[1], bestHour);
    window.open(cal.googleCalendarUrl, '_blank', 'noopener,noreferrer');
    setCopiedCalendar(true);
    toast.celestial('Google Calendar scheduling link created & opened.', 'Call Scheduled');
    setTimeout(() => setCopiedCalendar(false), 2500);
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-light tracking-[0.25em] uppercase text-white">
          Comparison Studio
        </h1>
        <p className="text-xs sm:text-sm font-light tracking-[0.2em] uppercase text-[#fea082]">
          Multi-City Planetary Alignment & Golden Window Finder
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#fea082]" />
            <span className="text-xs font-light tracking-wider uppercase text-white">
              Comparing {cities.length} of 5 Global Cities
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Navigation className={`w-3 h-3 text-[#fea082] ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Locating...' : 'Detect GPS'}</span>
            </button>

            <button
              type="button"
              onClick={handleSwapPrimary}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title="Swap primary hubs"
            >
              <ArrowRightLeft className="w-3 h-3 text-[#fea082]" />
              <span>Swap 1 ⇄ 2</span>
            </button>

            {cities.length < 5 && (
              <select
                value=""
                onChange={(e) => {
                  const found = CITIES.find((c) => c.id === e.target.value);
                  if (found) handleAddCity(found);
                }}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-light bg-[#fea082]/10 border border-[#fea082]/30 text-[#fea082] hover:bg-[#fea082]/20 cursor-pointer outline-none truncate"
              >
                <option value="" disabled className="bg-zinc-900 text-zinc-400">
                  + Add City ({5 - cities.length} remaining)
                </option>
                {REGION_GROUPS.map((group) => (
                  <optgroup key={`add-${group.label}`} label={group.label} className="bg-zinc-900 text-zinc-400 font-normal">
                    {group.cities
                      .filter((c) => !cities.some((x) => x.id === c.id))
                      .map((c) => (
                        <option key={`opt-add-${c.id}`} value={c.id} className="text-white">
                          {c.city}, {c.country}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* City Selectors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cities.map((city, idx) => (
            <div
              key={`city-sel-${city.id}-${idx}`}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs font-mono text-zinc-500 w-5">#{idx + 1}</span>
                <select
                  value={city.id}
                  onChange={(e) => {
                    const found = CITIES.find((c) => c.id === e.target.value);
                    if (found) handleUpdateCity(idx, found);
                  }}
                  className="w-full appearance-none pr-4 text-xs font-light text-white bg-transparent outline-none cursor-pointer truncate"
                >
                  {REGION_GROUPS.map((group) => (
                    <optgroup key={`cg-${idx}-${group.label}`} label={group.label} className="bg-zinc-900 text-zinc-400">
                      {group.cities.map((c) => (
                        <option key={`co-${idx}-${c.id}`} value={c.id} className="text-white bg-zinc-900">
                          {c.city}, {c.country}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {cities.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveCity(idx)}
                  className="p-1 text-zinc-500 hover:text-rose-400 rounded hover:bg-white/5 transition-colors"
                  title="Remove this city"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {locationStatus && (
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-[#fea082] shrink-0 animate-pulse" />
            <span>{locationStatus}</span>
          </div>
        )}
      </div>

      {/* Golden Window Meeting Finder Highlight Banner */}
      {multiComparison && (
        <div className="glass-panel rounded-2xl p-6 border border-[#fea082]/30 bg-black/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#fea082]/10 border border-[#fea082]/30 flex items-center justify-center text-[#fea082]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#fea082]">
                  Golden Window Alignment Analysis
                </span>
                <h3 className="text-sm sm:text-base font-light text-white">
                  {multiComparison.goldenHour.hasOverlap
                    ? `★ Universal Overlap: ${multiComparison.goldenHour.overlapHoursCount} Shared Business Hours`
                    : 'Optimal Alignment Window (Maximum Availability)'}
                </h3>
              </div>
            </div>

            <button
              onClick={handleExportGoldenMeeting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Calendar className="w-3.5 h-3.5 text-[#fea082]" />
              <span>{copiedCalendar ? 'Opened Calendar' : 'Schedule Team Call'}</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            {multiComparison.goldenHour.advice}
          </p>
        </div>
      )}

      {/* Clocks Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cities.map((city, idx) => {
          const detail = cityTimes[idx];
          const isPrimary = idx === 0;

          return (
            <div
              key={`clock-card-${city.id}`}
              className={`glass-panel rounded-2xl p-5 border space-y-3 transition-all ${
                isPrimary ? 'border-[#38bdf8]/40 bg-sky-950/10' : 'border-white/10 bg-black/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPrimary ? 'bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]' : 'bg-[#fea082]'
                      }`}
                    />
                    <h3 className="font-light tracking-[0.15em] text-white uppercase text-sm sm:text-base">
                      {city.city}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 font-light mt-0.5">{city.country}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {renderSolarBadge(detail?.solarState)}
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-300 font-mono">
                    {detail?.utcOffset}
                  </span>
                </div>
              </div>

              <div
                suppressHydrationWarning
                className={`text-3xl sm:text-4xl font-light font-mono tracking-wider py-1 ${
                  isPrimary ? 'text-white' : 'text-[#fea082]'
                }`}
              >
                {detail?.currentTime || '--:--:--'}
              </div>

              <div className="space-y-1 text-xs text-zinc-400 border-t border-white/10 pt-2.5 font-light">
                <div className="flex justify-between">
                  <span>Timezone:</span>
                  <span className="text-white font-mono">{city.timezone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coordinates:</span>
                  <span className="text-white font-mono">
                    {city.lat.toFixed(2)}°, {city.lng.toFixed(2)}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Daylight Saving:</span>
                  <span suppressHydrationWarning className="text-white font-mono">
                    {detail?.isDST ? 'Active (DST)' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive 24-Hour Scrubber */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-sm font-light tracking-[0.2em] uppercase text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#fea082]" />
              <span>Interactive Multi-City 24-Hour Scrubber</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-black/40 rounded-xl p-4 border border-white/10">
          {cities.map((city, idx) => {
            const scrubbed = scrubbedTimes[idx];
            return (
              <div key={`scrub-${city.id}`} className="space-y-1 p-2 rounded-lg bg-white/[0.02]">
                <span className="text-xs text-white font-light uppercase tracking-wider">{city.city}</span>
                <div suppressHydrationWarning className="text-xl sm:text-2xl font-light font-mono text-[#fea082]">
                  {scrubbed?.currentTime}
                </div>
                <p suppressHydrationWarning className="text-[11px] text-zinc-400 font-light">
                  {scrubbed?.currentDate}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unified 24-Hour Multi-City Cross Mapping Matrix */}
      {multiComparison && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs font-light tracking-[0.2em] uppercase text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#fea082]" />
              <span>Full 24-Hour Unified Alignment Grid</span>
            </h2>
            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-400/50" /> Working (9-18)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-400/40" /> Waking (8-22)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-zinc-800/80 border border-zinc-700" /> Sleeping
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3">UTC Hour</th>
                  {cities.map((c) => (
                    <th key={`th-${c.id}`} className="py-2.5 px-3 uppercase text-white">
                      {c.city}
                    </th>
                  ))}
                  <th className="py-2.5 px-3">Team Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {multiComparison.timeline24h.map((slot) => {
                  return (
                    <tr
                      key={`slot-${slot.utcHour}`}
                      className={`transition-colors ${
                        slot.isAllWorking
                          ? 'bg-emerald-950/20'
                          : slot.isAllAwake
                          ? 'bg-white/[0.03]'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-2 px-3 font-mono text-zinc-400 font-light">
                        {slot.utcFormatted}
                      </td>

                      {slot.cityStatuses.map((st, i) => (
                        <td key={`st-${i}-${slot.utcHour}`} className="py-2 px-3 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] inline-block ${
                              st.state === 'working'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : st.state === 'extended'
                                ? 'bg-amber-500/15 text-amber-200 border border-amber-500/20'
                                : 'text-zinc-600'
                            }`}
                          >
                            {st.localFormatted}
                          </span>
                        </td>
                      ))}

                      <td className="py-2 px-3">
                        {slot.isAllWorking ? (
                          <span className="text-[10px] font-mono uppercase text-emerald-300 font-medium">
                            ★ Universal Overlap
                          </span>
                        ) : slot.isAllAwake ? (
                          <span className="text-[10px] text-zinc-400 font-mono">All Awake</span>
                        ) : (
                          <span className="text-[10px] text-zinc-700 font-mono">Off-Hours</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
