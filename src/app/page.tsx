'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Globe2,
  Clock,
  ArrowRightLeft,
  Sun,
  Moon,
  Code2,
  Compass,
  Navigation,
  X,
  Sliders,
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronDown,
} from 'lucide-react';
import GlobeCanvas, { GlobeCanvasHandle } from '@/components/globe/GlobeCanvas';
import { CITIES, findNearestCity, resolveUserCity } from '@/lib/cities';
import {
  getCityTime,
  compareCities,
  getSubsolarPoint,
  getSublunarPoint,
  calculateLocalCelestialPosition,
  LocalCelestialPosition,
} from '@/lib/timeEngine';
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

export default function HomePage() {
  const [cityA, setCityA] = useState<CityData>(CITIES[0]); // Tokyo or auto-detected
  const [cityB, setCityB] = useState<CityData>(CITIES[47] || CITIES[13]); // London
  const [timeA, setTimeA] = useState<TimeDetail | null>(null);
  const [timeB, setTimeB] = useState<TimeDetail | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Active target for Globe camera
  const [focusedTarget, setFocusedTarget] = useState<'primary' | 'secondary' | 'sun' | 'moon' | 'earth'>('primary');
  const globeRef = useRef<GlobeCanvasHandle | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);

  // Slide-out Celestial Observatory Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 24-Hour Scrubber state
  const [scrubberHour, setScrubberHour] = useState<number>(12);

  // Geolocation state
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  // Live celestial state
  const [sun, setSun] = useState<{ lat: number; lng: number } | null>(null);
  const [moon, setMoon] = useState<{
    lat: number;
    lng: number;
    phase: string;
    illumination: number;
    phaseEmoji: string;
  } | null>(null);

  // Local celestial observer positions for selected cities
  const [celestialA, setCelestialA] = useState<LocalCelestialPosition | null>(null);
  const [celestialB, setCelestialB] = useState<LocalCelestialPosition | null>(null);

  // 1. Auto-detect user timezone & closest city on mount
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

  // 2. Update clocks and celestial positions every second
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeA(getCityTime(cityA, now));
      setTimeB(getCityTime(cityB, now));
      setComparison(compareCities(cityA, cityB, now));
      setSun(getSubsolarPoint(now));
      setMoon(getSublunarPoint(now));
      setCelestialA(calculateLocalCelestialPosition(cityA.lat, cityA.lng, now));
      setCelestialB(calculateLocalCelestialPosition(cityB.lat, cityB.lng, now));
    };

    queueMicrotask(update);
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [cityA, cityB]);

  // Handle GPS Geolocation click
  const handleDetectLocation = () => {
    setIsLocating(true);
    setLocationMessage('Accessing orbital coordinates...');

    if (typeof window === 'undefined' || !navigator.geolocation) {
      const fallback = resolveUserCity();
      setCityA(fallback);
      setFocusedTarget('primary');
      setLocationMessage(`Timezone matched: ${fallback.city}, ${fallback.country}`);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = findNearestCity(latitude, longitude);
        setCityA(nearest);
        setFocusedTarget('primary');
        setLocationMessage(
          `Coordinates: ${nearest.city}, ${nearest.country} (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`
        );
        setIsLocating(false);
        setTimeout(() => setLocationMessage(null), 8000);
      },
      (error) => {
        console.warn('Geolocation permission:', error.message);
        const fallback = resolveUserCity();
        setCityA(fallback);
        setFocusedTarget('primary');
        setLocationMessage(`Selected closest timezone hub: ${fallback.city}, ${fallback.country}`);
        setIsLocating(false);
        setTimeout(() => setLocationMessage(null), 8000);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  // Instant swap between first location and second location
  const handleSwap = () => {
    const temp = cityA;
    setCityA(cityB);
    setCityB(temp);
    // Smoothly focus on the newly promoted primary location
    setFocusedTarget('primary');
  };

  // Switch to first location
  const handleSwitchToLocationA = () => {
    setFocusedTarget('primary');
  };

  // Switch to second location
  const handleSwitchToLocationB = () => {
    setFocusedTarget('secondary');
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

  const scrubberTargetTimestamp = calculateScrubberTimestamp(cityA, scrubberHour);
  const scrubbedTimeA = getCityTime(cityA, scrubberTargetTimestamp);
  const scrubbedTimeB = getCityTime(cityB, scrubberTargetTimestamp);

  const primaryLoc = useMemo(
    () => ({ lat: cityA.lat, lng: cityA.lng, label: cityA.city }),
    [cityA.lat, cityA.lng, cityA.city]
  );
  const secondaryLoc = useMemo(
    () => ({ lat: cityB.lat, lng: cityB.lng, label: cityB.city }),
    [cityB.lat, cityB.lng, cityB.city]
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-start w-full bg-black text-white">
      {/* ============================================================ */}
      {/* 1. FULL PAGE IMMERSIVE 3D CELESTIAL STAGE (100VH VIEWPORT)   */}
      {/* ============================================================ */}
      <section className="relative w-full h-[calc(100vh-4rem)] overflow-hidden flex flex-col justify-between">
        {/* Full-Page Interactive 3D Three.js Globe & Space Canvas */}
        <div className="absolute inset-0 w-full h-full z-0">
          <GlobeCanvas
            ref={globeRef}
            primaryLocation={primaryLoc}
            secondaryLocation={secondaryLoc}
            focusedTarget={focusedTarget}
            onFocusChange={setFocusedTarget}
            autoRotate={isAutoRotating}
            className="w-full h-full"
          />
        </div>

        {/* --- Top Header (Directly inspired by attached Solar Explorer .logo) --- */}
        <div className="relative z-10 w-full pt-4 px-4 sm:px-8 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-base sm:text-xl font-light tracking-[0.28em] uppercase text-white drop-shadow">
              TimeOrbit Explorer
            </h1>
            <p className="text-[10px] sm:text-xs font-light tracking-[0.2em] uppercase text-[#fea082]">
              Planetary Time & Celestial Observatory
            </p>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Viewport Zoom & Rotation Controls */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 p-1 shadow-lg">
              <button
                type="button"
                onClick={() => globeRef.current?.zoomIn()}
                className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => globeRef.current?.zoomOut()}
                className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsAutoRotating((prev) => !prev)}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  isAutoRotating ? 'text-[#fea082] bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Earth Auto-Rotation"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isAutoRotating ? 'animate-spin-slow' : ''}`} />
              </button>
            </div>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-light tracking-[0.16em] uppercase text-white bg-black/60 hover:bg-black/80 border border-white/20 hover:border-[#fea082] backdrop-blur-md transition-all cursor-pointer shadow-lg"
            >
              <Compass className="w-3.5 h-3.5 text-[#fea082]" />
              <span className="hidden sm:inline">Celestial Telemetry</span>
              <span className="sm:hidden">Data</span>
            </button>
          </div>
        </div>

        {/* --- Left Side Celestial Navigation Menu (Inspired by attached Solar Explorer menu) --- */}
        <div className="relative z-10 hidden md:flex flex-col gap-2.5 pl-6 pointer-events-none max-w-xs self-start my-auto">
          {/* Earth Overview */}
          <button
            onClick={() => setFocusedTarget('earth')}
            className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all pointer-events-auto cursor-pointer ${
              focusedTarget === 'earth'
                ? 'bg-white/10 border border-white/30 text-white backdrop-blur-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-blue-900/60 border border-blue-400/40 flex items-center justify-center text-xs">
              🌍
            </div>
            <div>
              <div className="text-[11px] font-light tracking-[0.18em] uppercase text-white flex items-center">
                {focusedTarget === 'earth' && <span className="pip" />}
                Earth
              </div>
              <div className="text-[9px] font-mono text-zinc-400">1.0 AU • Home Planet</div>
            </div>
          </button>

          {/* Location A: First Location */}
          <button
            onClick={handleSwitchToLocationA}
            className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all pointer-events-auto cursor-pointer ${
              focusedTarget === 'primary'
                ? 'bg-[#38bdf8]/15 border border-[#38bdf8]/60 text-white backdrop-blur-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-[#38bdf8]/20 border border-[#38bdf8]/50 flex items-center justify-center text-xs">
              📍
            </div>
            <div>
              <div className="text-[11px] font-light tracking-[0.18em] uppercase text-white flex items-center">
                {focusedTarget === 'primary' && <span className="pip" style={{ background: '#38bdf8' }} />}
                {cityA.city}
              </div>
              <div suppressHydrationWarning className="text-[9px] font-mono text-[#38bdf8]">
                Origin • {timeA?.currentTime ? timeA.currentTime.replace(/:\d\d\s/, ' ') : '--:--'}
              </div>
            </div>
          </button>

          {/* Location B: Second Location */}
          <button
            onClick={handleSwitchToLocationB}
            className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all pointer-events-auto cursor-pointer ${
              focusedTarget === 'secondary'
                ? 'bg-[#fea082]/15 border border-[#fea082]/60 text-white backdrop-blur-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-[#fea082]/20 border border-[#fea082]/50 flex items-center justify-center text-xs">
              📍
            </div>
            <div>
              <div className="text-[11px] font-light tracking-[0.18em] uppercase text-white flex items-center">
                {focusedTarget === 'secondary' && <span className="pip" />}
                {cityB.city}
              </div>
              <div suppressHydrationWarning className="text-[9px] font-mono text-[#fea082]">
                Target • {timeB?.currentTime ? timeB.currentTime.replace(/:\d\d\s/, ' ') : '--:--'}
              </div>
            </div>
          </button>

          {/* Quick Swap Button */}
          <button
            onClick={handleSwap}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] tracking-widest uppercase text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all pointer-events-auto cursor-pointer self-start"
            title="Swap Origin and Target Locations"
          >
            <ArrowRightLeft className="w-3 h-3 text-[#fea082]" />
            <span>Swap A ⇄ B</span>
          </button>

          {/* Sun Zenith */}
          <button
            onClick={() => setFocusedTarget('sun')}
            className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all pointer-events-auto cursor-pointer ${
              focusedTarget === 'sun'
                ? 'bg-[#f39041]/15 border border-[#f39041]/60 text-white backdrop-blur-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xs text-amber-300">
              ☀️
            </div>
            <div>
              <div className="text-[11px] font-light tracking-[0.18em] uppercase text-white flex items-center">
                {focusedTarget === 'sun' && <span className="pip" style={{ background: '#f39041' }} />}
                Sun Zenith
              </div>
              <div suppressHydrationWarning className="text-[9px] font-mono text-zinc-400">
                {sun ? formatCoordinates(sun.lat, sun.lng) : 'Computing...'}
              </div>
            </div>
          </button>

          {/* Moon Luna */}
          <button
            onClick={() => setFocusedTarget('moon')}
            className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all pointer-events-auto cursor-pointer ${
              focusedTarget === 'moon'
                ? 'bg-white/10 border border-white/30 text-white backdrop-blur-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs">
              {moon?.phaseEmoji || '🌙'}
            </div>
            <div>
              <div className="text-[11px] font-light tracking-[0.18em] uppercase text-white flex items-center">
                {focusedTarget === 'moon' && <span className="pip" />}
                Moon Orbit
              </div>
              <div suppressHydrationWarning className="text-[9px] font-mono text-zinc-400">
                {moon ? `${moon.phase} (${moon.illumination}%)` : 'Computing...'}
              </div>
            </div>
          </button>
        </div>

        {/* --- Bottom Floating Dual Clocks & Location Switcher Dock --- */}
        <div className="relative z-10 w-full pb-4 px-4 sm:px-8 pointer-events-none">
          <div className="max-w-4xl mx-auto glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-2xl backdrop-blur-xl pointer-events-auto space-y-3">
            {/* Clocks & Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-stretch">
              {/* Location A Column (5 cols) */}
              <div className="md:col-span-5 flex flex-col gap-2.5">
                {/* Location A Clock Card */}
                <div
                  onClick={handleSwitchToLocationA}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex-1 flex flex-col justify-between ${
                    focusedTarget === 'primary'
                      ? 'bg-[#38bdf8]/10 border-[#38bdf8] shadow-md'
                      : 'bg-black/50 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                      <span className="text-xs font-light tracking-[0.18em] uppercase text-white">
                        {cityA.city}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-light">{cityA.country}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {timeA?.utcOffset} • {getTimezoneAbbrev(cityA.timezone)}
                    </span>
                  </div>

                  <div
                    suppressHydrationWarning
                    className="text-2xl sm:text-3xl font-light font-mono text-white tracking-wider py-1"
                  >
                    {timeA?.currentTime || '--:--:--'}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-light">
                    <span suppressHydrationWarning>{timeA?.currentDate}</span>
                    <span className="font-mono">{formatCoordinates(cityA.lat, cityA.lng)}</span>
                  </div>
                </div>

                {/* Location A Selector & GPS Button */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={cityA.id}
                      onChange={(e) => {
                        const found = CITIES.find((c) => c.id === e.target.value);
                        if (found) {
                          setCityA(found);
                          setFocusedTarget('primary');
                        }
                      }}
                      className="w-full appearance-none px-3.5 py-2 pr-9 rounded-xl border border-white/15 text-xs font-light bg-black/80 text-white focus:border-[#38bdf8] outline-none transition-colors cursor-pointer"
                    >
                      {REGION_GROUPS.map((group) => (
                        <optgroup key={`dock-a-${group.label}`} label={group.label} className="bg-zinc-900 text-zinc-400">
                          {group.cities.map((c) => (
                            <option key={`da-${c.id}`} value={c.id} className="text-white">
                              {c.city}, {c.country}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* GPS Auto-Detect Button */}
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-light tracking-wider uppercase text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#38bdf8] transition-all cursor-pointer"
                    title="Detect current location via GPS"
                  >
                    <Navigation className={`w-3.5 h-3.5 text-[#38bdf8] ${isLocating ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'GPS'}</span>
                    <span className="sm:hidden">GPS</span>
                  </button>
                </div>
              </div>

              {/* Center Swap Column (1 col) */}
              <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-[#fea082] border border-white/20 transition-all hover:rotate-180 duration-300 cursor-pointer shadow-md"
                  title="Click to Swap First and Second Location"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Location B Column (5 cols) */}
              <div className="md:col-span-5 flex flex-col gap-2.5">
                {/* Location B Clock Card */}
                <div
                  onClick={handleSwitchToLocationB}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex-1 flex flex-col justify-between ${
                    focusedTarget === 'secondary'
                      ? 'bg-[#fea082]/10 border-[#fea082] shadow-md'
                      : 'bg-black/50 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#fea082]" />
                      <span className="text-xs font-light tracking-[0.18em] uppercase text-white">
                        {cityB.city}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-light">{cityB.country}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {timeB?.utcOffset} • {getTimezoneAbbrev(cityB.timezone)}
                    </span>
                  </div>

                  <div
                    suppressHydrationWarning
                    className="text-2xl sm:text-3xl font-light font-mono text-[#fea082] tracking-wider py-1"
                  >
                    {timeB?.currentTime || '--:--:--'}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-light">
                    <span suppressHydrationWarning>{timeB?.currentDate}</span>
                    <span className="font-mono">{formatCoordinates(cityB.lat, cityB.lng)}</span>
                  </div>
                </div>

                {/* Location B Selector */}
                <div className="relative w-full">
                  <select
                    value={cityB.id}
                    onChange={(e) => {
                      const found = CITIES.find((c) => c.id === e.target.value);
                      if (found) {
                        setCityB(found);
                        setFocusedTarget('secondary');
                      }
                    }}
                    className="w-full appearance-none px-3.5 py-2 pr-9 rounded-xl border border-white/15 text-xs font-light bg-black/80 text-white focus:border-[#fea082] outline-none transition-colors cursor-pointer"
                  >
                    {REGION_GROUPS.map((group) => (
                      <optgroup key={`dock-b-${group.label}`} label={group.label} className="bg-zinc-900 text-zinc-400">
                        {group.cities.map((c) => (
                          <option key={`db-${c.id}`} value={c.id} className="text-white">
                            {c.city}, {c.country}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Time Difference Summary Bar */}
            {comparison && (
              <div className="flex items-center justify-center gap-2 pt-2.5 border-t border-white/10 text-xs font-light tracking-[0.22em] uppercase text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-[#fea082]" />
                <span>{comparison.formattedDifference}</span>
              </div>
            )}

            {locationMessage && (
              <div className="text-[11px] text-[#fea082] font-mono flex items-center gap-1.5 pt-1 border-t border-white/5">
                <Navigation className="w-3 h-3 animate-pulse" />
                <span>{locationMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* --- Slide-Out Celestial Observatory Panel (Exact replica of attached Solar Explorer .panel) --- */}
        {isDrawerOpen && (
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-black/95 backdrop-blur-2xl border-l border-white/15 p-6 overflow-y-auto space-y-6 shadow-2xl animate-fadeIn">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-sm font-light tracking-[0.25em] uppercase text-white">
                  Celestial Telemetry
                </h2>
                <p className="text-[10px] text-[#fea082] font-light tracking-widest uppercase">
                  Real-Time Astronomical Observer Deck
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Location A Sky Position */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs tracking-wider uppercase text-white font-light">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                  {cityA.city} Sky Position
                </span>
                <span className="font-mono text-zinc-400">{formatCoordinates(cityA.lat, cityA.lng)}</span>
              </div>

              <div className="space-y-1.5 text-xs font-light text-zinc-300">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Sun className="w-3.5 h-3.5 text-[#fea082]" /> Sun Altitude:
                  </span>
                  <span suppressHydrationWarning className="font-mono text-white">
                    {celestialA ? `${celestialA.sun.altitudeDeg > 0 ? '+' : ''}${celestialA.sun.altitudeDeg}°` : '...'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span suppressHydrationWarning>{celestialA?.sun.elevationDescription}</span>
                  <span suppressHydrationWarning className="font-mono">
                    Azimuth: {celestialA?.sun.azimuthDeg}° {celestialA?.sun.azimuthCompass}
                  </span>
                </div>

                <div className="flex justify-between border-t border-white/5 pt-2">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Moon className="w-3.5 h-3.5 text-zinc-300" /> Moon Altitude:
                  </span>
                  <span suppressHydrationWarning className="font-mono text-white">
                    {celestialA ? `${celestialA.moon.altitudeDeg > 0 ? '+' : ''}${celestialA.moon.altitudeDeg}°` : '...'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span suppressHydrationWarning>
                    {celestialA?.moon.isVisibleInSky ? 'Visible in Sky' : 'Below Horizon'}
                  </span>
                  <span suppressHydrationWarning className="font-mono">
                    Azimuth: {celestialA?.moon.azimuthDeg}° {celestialA?.moon.azimuthCompass}
                  </span>
                </div>
              </div>
            </div>

            {/* Location B Sky Position */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs tracking-wider uppercase text-white font-light">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#fea082]" />
                  {cityB.city} Sky Position
                </span>
                <span className="font-mono text-zinc-400">{formatCoordinates(cityB.lat, cityB.lng)}</span>
              </div>

              <div className="space-y-1.5 text-xs font-light text-zinc-300">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Sun className="w-3.5 h-3.5 text-[#fea082]" /> Sun Altitude:
                  </span>
                  <span suppressHydrationWarning className="font-mono text-white">
                    {celestialB ? `${celestialB.sun.altitudeDeg > 0 ? '+' : ''}${celestialB.sun.altitudeDeg}°` : '...'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span suppressHydrationWarning>{celestialB?.sun.elevationDescription}</span>
                  <span suppressHydrationWarning className="font-mono">
                    Azimuth: {celestialB?.sun.azimuthDeg}° {celestialB?.sun.azimuthCompass}
                  </span>
                </div>

                <div className="flex justify-between border-t border-white/5 pt-2">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Moon className="w-3.5 h-3.5 text-zinc-300" /> Moon Altitude:
                  </span>
                  <span suppressHydrationWarning className="font-mono text-white">
                    {celestialB ? `${celestialB.moon.altitudeDeg > 0 ? '+' : ''}${celestialB.moon.altitudeDeg}°` : '...'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span suppressHydrationWarning>
                    {celestialB?.moon.isVisibleInSky ? 'Visible in Sky' : 'Below Horizon'}
                  </span>
                  <span suppressHydrationWarning className="font-mono">
                    Azimuth: {celestialB?.moon.azimuthDeg}° {celestialB?.moon.azimuthCompass}
                  </span>
                </div>
              </div>
            </div>

            {/* Global Anchors */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs font-light text-zinc-300">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-normal">
                Subsolar & Sublunar Zenith Points
              </span>
              <div className="flex justify-between">
                <span className="text-zinc-400">Subsolar Point (High Noon):</span>
                <span suppressHydrationWarning className="font-mono text-white">
                  {sun ? formatCoordinates(sun.lat, sun.lng) : '...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Sublunar Point (Moon Zenith):</span>
                <span suppressHydrationWarning className="font-mono text-[#fea082]">
                  {moon ? formatCoordinates(moon.lat, moon.lng) : '...'}
                </span>
              </div>
            </div>

            {/* REST API Snippet */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs tracking-wider uppercase text-zinc-300 font-light">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#fea082]" /> REST API
                </span>
                <button
                  onClick={() =>
                    copySnippet(
                      `fetch('https://timeorbit.vercel.app/api/v1/compare?from=${cityA.id}&to=${cityB.id}')`
                    )
                  }
                  className="text-[10px] text-zinc-400 hover:text-white"
                >
                  {copiedSnippet ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-black font-mono text-[11px] text-zinc-300 border border-white/10 overflow-x-auto">
                GET /api/v1/compare?from={cityA.id}&to={cityB.id}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* 2. 24-HOUR INTERACTIVE SCRUBBER & OVERLAP MATRIX SECTION     */}
      {/* ============================================================ */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10 border-t border-white/10">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-light tracking-[0.25em] uppercase text-white flex items-center justify-center gap-2">
            <Sliders className="w-4 h-4 text-[#fea082]" />
            <span>Interactive 24-Hour Time Scrubber</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light">
            Preview synchronized timeline shifts and coordinate business hours between {cityA.city} and {cityB.city}
          </p>
        </div>

        {/* Scrubber Card */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <span className="text-xs tracking-wider uppercase text-zinc-300 font-light">
              Slide hour to inspect cross-world time
            </span>
            <button
              onClick={() => setScrubberHour(new Date().getHours())}
              className="text-xs uppercase tracking-wider text-zinc-300 hover:text-white font-light px-3 py-1 rounded bg-white/5 border border-white/15 cursor-pointer self-start sm:self-auto"
            >
              Reset to Current Time
            </button>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/50 rounded-xl p-4 border border-white/10">
            <div className="space-y-1">
              <span className="text-xs text-white font-light uppercase tracking-wider">{cityA.city} Time</span>
              <div suppressHydrationWarning className="text-2xl font-light font-mono text-white">
                {scrubbedTimeA.currentTime}
              </div>
              <p suppressHydrationWarning className="text-[11px] text-zinc-400 font-light">
                {scrubbedTimeA.currentDate}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-[#fea082] font-light uppercase tracking-wider">{cityB.city} Time</span>
              <div suppressHydrationWarning className="text-2xl font-light font-mono text-[#fea082]">
                {scrubbedTimeB.currentTime}
              </div>
              <p suppressHydrationWarning className="text-[11px] text-zinc-400 font-light">
                {scrubbedTimeB.currentDate}
              </p>
            </div>
          </div>
        </div>

        {/* 24-Hour Hour-by-Hour Overlap Matrix */}
        {comparison && (
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#fea082]" />
                <span>Full 24-Hour Working Hours Overlap Matrix</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3">Hour</th>
                    <th className="py-2.5 px-3 text-white uppercase">{cityA.city}</th>
                    <th className="py-2.5 px-3 text-[#fea082] uppercase">{cityB.city}</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {comparison.timeline24h.map((slot) => (
                    <tr
                      key={`slot-${slot.hourFrom}`}
                      className={`transition-colors ${
                        slot.isWorkingOverlap ? 'bg-white/5' : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-2 px-3 font-mono text-zinc-500">{slot.hourFrom}:00</td>
                      <td className="py-2 px-3 text-white font-mono">{slot.timeFromFormatted}</td>
                      <td className="py-2 px-3 text-[#fea082] font-mono">{slot.timeToFormatted}</td>
                      <td className="py-2 px-3">
                        {slot.isWorkingOverlap ? (
                          <span className="text-[10px] font-mono uppercase text-white">
                            ● Shared Work Window
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
      </section>

      {/* ============================================================ */}
      {/* 3. FEATURED INTERNATIONAL HUBS DIRECTORY                     */}
      {/* ============================================================ */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xs font-light tracking-[0.25em] uppercase text-white flex items-center justify-center gap-2">
            <Globe2 className="w-4 h-4 text-[#fea082]" />
            <span>Featured Planetary Hubs Directory</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light">
            Click any coordinate hub to instantly assign to Origin (A) or Target (B)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CITIES.slice(0, 16).map((city) => {
            const time = getCityTime(city);
            return (
              <div
                key={city.id}
                className="glass-card rounded-xl p-4 border border-white/10 hover:border-[#fea082]/50 space-y-3 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-light tracking-wider uppercase text-white truncate max-w-[120px]">
                    {city.city}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">{time.utcOffset}</span>
                </div>

                <div suppressHydrationWarning className="text-xl font-light text-white font-mono tracking-wider">
                  {time.currentTime.replace(/:\d\d\s/, ' ')}
                </div>

                <div className="text-[10px] text-zinc-500 font-light truncate">
                  {city.country}
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                  <button
                    onClick={() => {
                      setCityA(city);
                      setFocusedTarget('primary');
                    }}
                    className="flex-1 py-1 text-[10px] uppercase tracking-wider rounded bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    Set A
                  </button>
                  <button
                    onClick={() => {
                      setCityB(city);
                      setFocusedTarget('secondary');
                    }}
                    className="flex-1 py-1 text-[10px] uppercase tracking-wider rounded bg-white/5 hover:bg-white/15 text-[#fea082] transition-all cursor-pointer"
                  >
                    Set B
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
