'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe2,
  Clock,
  ArrowRightLeft,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  ArrowRight,
  Code2,
  Check,
  Copy,
  Sparkles,
  MapPin,
  Compass,
} from 'lucide-react';
import GlobeCanvas from '@/components/globe/GlobeCanvas';
import { CITIES } from '@/lib/cities';
import { getCityTime, compareCities } from '@/lib/timeEngine';
import { CityData, TimeDetail, ComparisonResult } from '@/types';

export default function HomePage() {
  const [cityA, setCityA] = useState<CityData>(CITIES[0]); // Tokyo
  const [cityB, setCityB] = useState<CityData>(CITIES[22]); // New York
  const [timeA, setTimeA] = useState<TimeDetail | null>(null);
  const [timeB, setTimeB] = useState<TimeDetail | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Auto-detect user timezone on mount
  useEffect(() => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const matchedCity = CITIES.find((c) => c.timezone === userTz) || CITIES.find((c) => userTz.includes(c.city));
      if (matchedCity) {
        queueMicrotask(() => {
          setCityA(matchedCity);
        });
      }
    } catch (e) {
      console.error('Timezone detect error:', e);
    }
  }, []);

  // Update clock every second locally with strict React 19 safety
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeA(getCityTime(cityA, now));
      setTimeB(getCityTime(cityB, now));
      setComparison(compareCities(cityA, cityB, now));
    };

    queueMicrotask(update);
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [cityA, cityB]);

  const handleSwap = () => {
    const temp = cityA;
    setCityA(cityB);
    setCityB(temp);
  };

  const copySnippet = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const getTimezoneAbbrev = (timezone: string): string => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
      }).formatToParts(new Date());
      return parts.find((p) => p.type === 'timeZoneName')?.value || timezone.split('/').pop()?.replace(/_/g, ' ') || '';
    } catch {
      return '';
    }
  };

  const formatCoordinates = (lat: number, lng: number): string => {
    const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
    const lngStr = `${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
    return `${latStr}, ${lngStr}`;
  };

  const renderSolarBadge = (state?: 'day' | 'night' | 'dawn' | 'dusk') => {
    switch (state) {
      case 'day':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Day (Full Daylight)</span>
          </div>
        );
      case 'night':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-[0_0_12px_rgba(99,102,241,0.2)]">
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Night (Dark Sky)</span>
          </div>
        );
      case 'dawn':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-semibold shadow-[0_0_12px_rgba(249,115,22,0.2)]">
            <Sunrise className="w-3.5 h-3.5 text-orange-400" />
            <span>Dawn (Sunrise)</span>
          </div>
        );
      case 'dusk':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <Sunset className="w-3.5 h-3.5 text-purple-400" />
            <span>Dusk (Sunset)</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Day</span>
          </div>
        );
    }
  };

  const renderSolarIcon = (state?: 'day' | 'night' | 'dawn' | 'dusk') => {
    switch (state) {
      case 'day':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'night':
        return <Moon className="w-4 h-4 text-cyan-400" />;
      case 'dawn':
        return <Sunrise className="w-4 h-4 text-orange-400" />;
      case 'dusk':
        return <Sunset className="w-4 h-4 text-purple-400" />;
      default:
        return <Sun className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start w-full">
      {/* 1. Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-cyan-500/10 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

        <div className="text-center space-y-4 max-w-3xl mx-auto mb-10 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive 3D Globe & 100% In-House Time Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Global Time,{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">
              Synchronized & Orbiting.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Compare timezones worldwide in real time with our 3D interactive globe. Access precision time offsets, solar
            day/night cycles, and business overlaps via our developer REST API.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/register" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold glow-btn">
              <span>Get Free API Key</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/compare"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Full Comparison Studio</span>
            </Link>
          </div>
        </div>

        {/* 2. Interactive Globe & Dual Comparison Card Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-6">
          {/* Left Column: 3D Globe */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <GlobeCanvas
              primaryLocation={{ lat: cityA.lat, lng: cityA.lng, label: cityA.city }}
              secondaryLocation={{ lat: cityB.lat, lng: cityB.lng, label: cityB.city }}
            />
            <p className="text-[11px] text-gray-400 text-center -mt-2">
              💡 Drag to freely rotate the globe. Real-time pins synchronize with your selected cities.
            </p>
          </div>

          {/* Right Column: Live Comparison Cards */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6">
              {/* Selectors and Swap */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* City A Selector */}
                <div className="w-full sm:flex-1 space-y-1.5">
                  <label className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Location A (Primary Pin)</span>
                  </label>
                  <select
                    value={cityA.id}
                    onChange={(e) => {
                      const found = CITIES.find((c) => c.id === e.target.value);
                      if (found) setCityA(found);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-medium bg-[#080d1e]"
                  >
                    {CITIES.map((c) => (
                      <option key={`a-${c.id}`} value={c.id}>
                        {c.flag} {c.city}, {c.country} ({c.timezone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <button
                  onClick={handleSwap}
                  title="Swap locations"
                  className="p-3 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all hover:rotate-180 duration-300"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>

                {/* City B Selector */}
                <div className="w-full sm:flex-1 space-y-1.5">
                  <label className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Location B (Target Pin)</span>
                  </label>
                  <select
                    value={cityB.id}
                    onChange={(e) => {
                      const found = CITIES.find((c) => c.id === e.target.value);
                      if (found) setCityB(found);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-medium bg-[#080d1e]"
                  >
                    {CITIES.map((c) => (
                      <option key={`b-${c.id}`} value={c.id}>
                        {c.flag} {c.city}, {c.country} ({c.timezone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dual Digital Clocks Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Clock Card A */}
                <div className="glass-card rounded-2xl p-5 border border-cyan-500/30 bg-cyan-950/20 space-y-4 shadow-xl shadow-cyan-950/20">
                  {/* Top Bar: Flag, City, Country, Country Code & Solar Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{cityA.flag}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-white text-base leading-tight">{cityA.city}</h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-cyan-200 border border-white/10">
                            {cityA.countryCode}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">{cityA.country}</p>
                      </div>
                    </div>
                    {renderSolarBadge(timeA?.solarState)}
                  </div>

                  {/* Main Time Readout */}
                  <div className="text-3xl sm:text-4xl font-extrabold text-cyan-300 font-mono tracking-tight text-glow-cyan py-1">
                    {timeA?.currentTime || '--:--:--'}
                  </div>

                  {/* Middle Info Row: Date, Timezone Abbreviation, UTC Offset Pill */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-white/10 pt-3">
                    <span className="text-gray-300 font-medium">{timeA?.currentDate}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-gray-300 font-semibold">
                        {getTimezoneAbbrev(cityA.timezone)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-xs font-mono font-bold text-cyan-300 shadow-sm shadow-cyan-500/20">
                        {timeA?.utcOffset || 'UTC+00:00'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Metadata Details: Coordinates & Daylight Saving */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/30 rounded-xl p-2.5 border border-white/5">
                    <div className="space-y-0.5">
                      <span className="text-gray-400 text-[10px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400" /> Coordinates
                      </span>
                      <p className="font-mono text-cyan-200/90 font-medium">
                        {formatCoordinates(cityA.lat, cityA.lng)}
                      </p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-gray-400 text-[10px] flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" /> Daylight Saving
                      </span>
                      <p className="font-medium text-gray-300">
                        {timeA?.isDST ? 'Active (DST)' : 'Standard Time'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clock Card B */}
                <div className="glass-card rounded-2xl p-5 border border-purple-500/30 bg-purple-950/20 space-y-4 shadow-xl shadow-purple-950/20">
                  {/* Top Bar: Flag, City, Country, Country Code & Solar Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{cityB.flag}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-white text-base leading-tight">{cityB.city}</h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-purple-200 border border-white/10">
                            {cityB.countryCode}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">{cityB.country}</p>
                      </div>
                    </div>
                    {renderSolarBadge(timeB?.solarState)}
                  </div>

                  {/* Main Time Readout */}
                  <div className="text-3xl sm:text-4xl font-extrabold text-purple-300 font-mono tracking-tight text-glow-purple py-1">
                    {timeB?.currentTime || '--:--:--'}
                  </div>

                  {/* Middle Info Row: Date, Timezone Abbreviation, UTC Offset Pill */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-white/10 pt-3">
                    <span className="text-gray-300 font-medium">{timeB?.currentDate}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-gray-300 font-semibold">
                        {getTimezoneAbbrev(cityB.timezone)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-xs font-mono font-bold text-purple-300 shadow-sm shadow-purple-500/20">
                        {timeB?.utcOffset || 'UTC+00:00'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Metadata Details: Coordinates & Daylight Saving */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/30 rounded-xl p-2.5 border border-white/5">
                    <div className="space-y-0.5">
                      <span className="text-gray-400 text-[10px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-purple-400" /> Coordinates
                      </span>
                      <p className="font-mono text-purple-200/90 font-medium">
                        {formatCoordinates(cityB.lat, cityB.lng)}
                      </p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-gray-400 text-[10px] flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-purple-400" /> Daylight Saving
                      </span>
                      <p className="font-medium text-gray-300">
                        {timeB?.isDST ? 'Active (DST)' : 'Standard Time'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Time Difference & Overlap Banner */}
              {comparison && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-purple-950/20 to-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>{comparison.formattedDifference}</span>
                  </div>

                  <p className="text-xs text-gray-300">
                    {comparison.workingHoursOverlap.advice}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Developer REST API Code Snippet */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span>Call this comparison in your own apps:</span>
                </div>

                <button
                  onClick={() =>
                    copySnippet(
                      `fetch('https://timeorbit.vercel.app/api/v1/compare?from=${cityA.id}&to=${cityB.id}', {\n  headers: { 'x-api-key': 'to_live_YOUR_KEY' }\n})`
                    )
                  }
                  className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-white"
                >
                  {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 overflow-x-auto">
                GET /api/v1/compare?from={cityA.id}&to={cityB.id}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Popular World Clocks Grid */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Globe2 className="w-6 h-6 text-cyan-400" />
            <span>Global World Clocks Directory</span>
          </h2>
          <p className="text-xs text-gray-400">
            Real-time live clocks across major tech and financial hubs
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CITIES.slice(0, 8).map((city) => {
            const time = getCityTime(city);
            return (
              <div
                key={city.id}
                onClick={() => setCityB(city)}
                className="glass-card rounded-xl p-4 border border-white/10 hover:border-cyan-500/40 cursor-pointer space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{city.flag}</span>
                    <span className="text-xs font-bold text-white">{city.city}</span>
                  </div>
                  {renderSolarIcon(time.solarState)}
                </div>

                <div className="text-xl font-bold text-cyan-300 font-mono tracking-tight">
                  {time.currentTime.replace(/:\d\d\s/, ' ')}
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>{city.country}</span>
                  <span className="font-mono text-gray-500">{time.utcOffset}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
