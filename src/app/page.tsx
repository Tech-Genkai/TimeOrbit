'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
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
  ChevronUp,
  Globe2,
  Plane,
  Calendar,
  Camera,
  Download,
} from 'lucide-react';
import GlobeCanvas, { GlobeCanvasHandle } from '@/components/globe/GlobeCanvas';
import { CITIES, findNearestCity, resolveUserCity } from '@/lib/cities';
import {
  getCityTime,
  compareCities,
  getSubsolarPoint,
  getSublunarPoint,
  calculateLocalCelestialPosition,
  calculateGeodesicDistance,
  getEarthOrbitalTelemetry,
  getLunarDetailedEphemeris,
  getISSOrbitalPosition,
  getPhotographySolarHours,
  generateCalendarMeetingLinks,
  LocalCelestialPosition,
  EarthOrbitalTelemetry,
  LunarDetailedEphemeris,
  ISSPosition,
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
  const [focusedTarget, setFocusedTarget] = useState<'primary' | 'secondary' | 'sun' | 'moon' | 'earth' | 'iss'>('primary');
  const globeRef = useRef<GlobeCanvasHandle | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);

  // Slide-out Celestial Observatory Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Dock collapse toggle state
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

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
  const [issTelemetry, setIssTelemetry] = useState<ISSPosition | null>(null);

  // Local celestial observer positions for selected cities
  const [celestialA, setCelestialA] = useState<LocalCelestialPosition | null>(null);
  const [celestialB, setCelestialB] = useState<LocalCelestialPosition | null>(null);

  // Enhanced Celestial Telemetry State
  const [telemetryTab, setTelemetryTab] = useState<'sky' | 'geodesic' | 'orbit'>('sky');
  const [activeObserver, setActiveObserver] = useState<'A' | 'B'>('A');
  const [earthTelemetry, setEarthTelemetry] = useState<EarthOrbitalTelemetry | null>(null);
  const [lunarEphemeris, setLunarEphemeris] = useState<LunarDetailedEphemeris | null>(null);

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
      setEarthTelemetry(getEarthOrbitalTelemetry(now));
      setLunarEphemeris(getLunarDetailedEphemeris(now));
      setIssTelemetry(getISSOrbitalPosition(now));
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

  // 1-Click Meeting Calendar Invite Export (.ics file)
  const handleDownloadIcs = () => {
    if (!comparison) return;
    const overlapHour = comparison.timeline24h.find((t) => t.isWorkingOverlap)?.hourFrom ?? 14;
    const cal = generateCalendarMeetingLinks(cityA, cityB, overlapHour);
    const blob = new Blob([cal.icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', cal.icsFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1-Click Direct Google Calendar Event Link
  const handleOpenGoogleCalendar = () => {
    if (!comparison) return;
    const overlapHour = comparison.timeline24h.find((t) => t.isWorkingOverlap)?.hourFrom ?? 14;
    const cal = generateCalendarMeetingLinks(cityA, cityB, overlapHour);
    window.open(cal.googleCalendarUrl, '_blank', 'noopener,noreferrer');
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

  const geodesic = useMemo(
    () => calculateGeodesicDistance(cityA.lat, cityA.lng, cityB.lat, cityB.lng),
    [cityA.lat, cityA.lng, cityB.lat, cityB.lng]
  );

  const getRadarCoords = (altDeg?: number, azDeg?: number, radius = 68, cx = 80, cy = 80) => {
    if (altDeg === undefined || azDeg === undefined) return { x: cx, y: cy, visible: false };
    const visible = altDeg >= 0;
    const r = visible ? radius * (1 - Math.min(90, Math.max(0, altDeg)) / 90) : radius * 1.08;
    const azRad = (azDeg * Math.PI) / 180;
    const x = cx + r * Math.sin(azRad);
    const y = cy - r * Math.cos(azRad);
    return { x, y, visible };
  };

  const activeCity = activeObserver === 'A' ? cityA : cityB;
  const activeCelestial = activeObserver === 'A' ? celestialA : celestialB;
  const activeTime = activeObserver === 'A' ? timeA : timeB;
  const activePhoto = useMemo(() => getPhotographySolarHours(activeCity.lat, activeCity.lng), [activeCity]);
  const sunRadar = getRadarCoords(activeCelestial?.sun.altitudeDeg, activeCelestial?.sun.azimuthDeg);
  const moonRadar = getRadarCoords(activeCelestial?.moon.altitudeDeg, activeCelestial?.moon.azimuthDeg);

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
                Solar Noon
              </div>
              <div suppressHydrationWarning className="text-[9px] font-mono text-zinc-400">
                Zenith • {sun ? formatCoordinates(sun.lat, sun.lng) : 'Computing...'}
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

          {/* International Space Station (ISS) Tracker */}
          <button
            onClick={() => setFocusedTarget('iss')}
            className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all pointer-events-auto cursor-pointer ${
              focusedTarget === 'iss'
                ? 'bg-[#38bdf8]/15 border border-[#38bdf8]/60 text-white backdrop-blur-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center text-xs">
              🛰️
            </div>
            <div>
              <div className="text-[11px] font-light tracking-[0.18em] uppercase text-white flex items-center">
                {focusedTarget === 'iss' && <span className="pip" style={{ background: '#38bdf8' }} />}
                ISS Space Station
              </div>
              <div suppressHydrationWarning className="text-[9px] font-mono text-cyan-400">
                {issTelemetry ? `${issTelemetry.altitudeKm} km • ${issTelemetry.speedKmh.toLocaleString()} km/h` : '418 km • Orbit'}
              </div>
            </div>
          </button>
        </div>

        {/* --- Bottom Floating Dual Clocks & Location Switcher Dock --- */}
        <div className="relative z-10 w-full pb-3 px-4 sm:px-8 pointer-events-none">
          {isDockCollapsed ? (
            <div className="max-w-xl mx-auto glass-panel rounded-full px-4 py-2 border border-white/15 shadow-2xl backdrop-blur-xl pointer-events-auto flex items-center justify-between text-xs font-mono transition-all">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={handleSwitchToLocationA}
                  className="flex items-center gap-1.5 text-[#38bdf8] hover:brightness-125 truncate cursor-pointer"
                  title="Focus on Location A"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" />
                  <span className="font-light tracking-wider uppercase text-[11px] truncate">{cityA.city}</span>
                  <span className="text-white text-xs">{timeA?.currentTime ? timeA.currentTime.replace(/:\d\d\s/, ' ') : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-[#fea082] transition-transform hover:rotate-180 duration-300 cursor-pointer shrink-0"
                  title="Swap Locations"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={handleSwitchToLocationB}
                  className="flex items-center gap-1.5 text-[#fea082] hover:brightness-125 truncate cursor-pointer"
                  title="Focus on Location B"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fea082] shrink-0" />
                  <span className="font-light tracking-wider uppercase text-[11px] truncate">{cityB.city}</span>
                  <span className="text-white text-xs">{timeB?.currentTime ? timeB.currentTime.replace(/:\d\d\s/, ' ') : ''}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsDockCollapsed(false)}
                className="text-[10px] uppercase tracking-wider text-zinc-400 hover:text-white ml-3 px-2 py-1 rounded-full bg-white/5 hover:bg-white/15 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                title="Expand Floating Dock"
              >
                <span>Expand</span>
                <ChevronUp className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto glass-panel rounded-2xl p-2.5 sm:p-3 border border-white/10 shadow-2xl backdrop-blur-xl pointer-events-auto space-y-2 transition-all">
              {/* Clocks & Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-2.5 items-stretch">
                {/* Location A Column (5 cols) */}
                <div className="md:col-span-5 p-2.5 rounded-xl border border-white/10 bg-black/60 transition-all flex flex-col justify-between gap-1 shadow-md">
                  {/* Card Header: Dropdown + GPS + UTC Offset */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1 flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" />
                      <div className="relative flex-1 min-w-0">
                        <select
                          value={cityA.id}
                          onChange={(e) => {
                            const found = CITIES.find((c) => c.id === e.target.value);
                            if (found) {
                              setCityA(found);
                              setFocusedTarget('primary');
                            }
                          }}
                          className="w-full appearance-none pr-6 text-xs font-medium tracking-wider uppercase text-white bg-transparent outline-none cursor-pointer truncate"
                        >
                          {REGION_GROUPS.map((group) => (
                            <optgroup key={`dock-a-${group.label}`} label={group.label} className="bg-zinc-950 text-zinc-400">
                              {group.cities.map((c) => (
                                <option key={`da-${c.id}`} value={c.id} className="text-white bg-zinc-900">
                                  {c.city}, {c.country}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isLocating}
                        className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase text-zinc-300 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-[#38bdf8] transition-all cursor-pointer flex items-center gap-1"
                        title="Detect current location via GPS"
                      >
                        <Navigation className={`w-2.5 h-2.5 text-[#38bdf8] ${isLocating ? 'animate-spin' : ''}`} />
                        <span>GPS</span>
                      </button>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {timeA?.utcOffset}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Digital Time (Click to focus on Globe) */}
                  <div
                    onClick={handleSwitchToLocationA}
                    className="cursor-pointer group flex items-baseline justify-between"
                    title="Click to focus 3D Earth on Location A"
                  >
                    <div
                      suppressHydrationWarning
                      className="text-xl sm:text-2xl font-light font-mono text-white tracking-wider group-hover:text-[#38bdf8] transition-colors"
                    >
                      {timeA?.currentTime || '--:--:--'}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline">
                      {getTimezoneAbbrev(cityA.timezone)}
                    </span>
                  </div>

                  {/* Card Footer: Date & Coordinates */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-light border-t border-white/5 pt-1">
                    <span suppressHydrationWarning>{timeA?.currentDate}</span>
                    <span className="font-mono text-[9px]">{formatCoordinates(cityA.lat, cityA.lng)}</span>
                  </div>
                </div>

                {/* Center Swap Column (1 col) */}
                <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#fea082] border border-white/20 transition-all hover:rotate-180 duration-300 cursor-pointer shadow-md"
                    title="Click to Swap Location A and Location B"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Location B Column (5 cols) */}
                <div className="md:col-span-5 p-2.5 rounded-xl border border-white/10 bg-black/60 transition-all flex flex-col justify-between gap-1 shadow-md">
                  {/* Card Header: Dropdown + UTC Offset */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1 flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#fea082] shrink-0" />
                      <div className="relative flex-1 min-w-0">
                        <select
                          value={cityB.id}
                          onChange={(e) => {
                            const found = CITIES.find((c) => c.id === e.target.value);
                            if (found) {
                              setCityB(found);
                              setFocusedTarget('secondary');
                            }
                          }}
                          className="w-full appearance-none pr-6 text-xs font-medium tracking-wider uppercase text-white bg-transparent outline-none cursor-pointer truncate"
                        >
                          {REGION_GROUPS.map((group) => (
                            <optgroup key={`dock-b-${group.label}`} label={group.label} className="bg-zinc-950 text-zinc-400">
                              {group.cities.map((c) => (
                                <option key={`db-${c.id}`} value={c.id} className="text-white bg-zinc-900">
                                  {c.city}, {c.country}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      {timeB?.utcOffset}
                    </span>
                  </div>

                  {/* Card Body: Digital Time (Click to focus on Globe) */}
                  <div
                    onClick={handleSwitchToLocationB}
                    className="cursor-pointer group flex items-baseline justify-between"
                    title="Click to focus 3D Earth on Location B"
                  >
                    <div
                      suppressHydrationWarning
                      className="text-xl sm:text-2xl font-light font-mono text-[#fea082] tracking-wider group-hover:brightness-125 transition-all"
                    >
                      {timeB?.currentTime || '--:--:--'}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline">
                      {getTimezoneAbbrev(cityB.timezone)}
                    </span>
                  </div>

                  {/* Card Footer: Date & Coordinates */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-light border-t border-white/5 pt-1">
                    <span suppressHydrationWarning>{timeB?.currentDate}</span>
                    <span className="font-mono text-[9px]">{formatCoordinates(cityB.lat, cityB.lng)}</span>
                  </div>
                </div>
              </div>

              {/* Time Difference Summary Bar + 1-Click Calendar Export + Collapse Button */}
              <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] sm:text-[11px] font-light tracking-[0.16em] uppercase text-zinc-300 gap-2">
                <div className="flex items-center gap-2 truncate">
                  {comparison && (
                    <>
                      <Clock className="w-3 h-3 text-[#fea082] shrink-0" />
                      <span className="truncate">{comparison.formattedDifference}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* 1-Click Meeting Calendar Invite Quick Buttons */}
                  <button
                    type="button"
                    onClick={handleOpenGoogleCalendar}
                    className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1"
                    title="Add Best Overlap Meeting to Google Calendar"
                  >
                    <Calendar className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">Google Cal</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadIcs}
                    className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1"
                    title="Download .ics Meeting Invite for Outlook / Apple Calendar"
                  >
                    <Download className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">.ICS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDockCollapsed(true)}
                    className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors cursor-pointer"
                    title="Minimize Dock (Clean Full Globe View)"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {locationMessage && (
                <div className="text-[11px] text-[#fea082] font-mono flex items-center gap-1.5 pt-1 border-t border-white/5">
                  <Navigation className="w-3 h-3 animate-pulse" />
                  <span>{locationMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- Slide-Out Celestial Observatory Panel (Enhanced Multi-Tab Deck) --- */}
        {isDrawerOpen && (
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-black/95 backdrop-blur-2xl border-l border-white/15 p-5 sm:p-6 overflow-y-auto space-y-5 shadow-2xl animate-fadeIn">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-light tracking-[0.25em] uppercase text-white">
                    Celestial Telemetry
                  </h2>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-white/10 text-[#fea082] border border-[#fea082]/30">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-[#fea082] font-light tracking-widest uppercase">
                  Astronomical, Geodesic & Lunar Telemetry
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs (Sky Radar / Geodesic / Planetary Orbit) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => setTelemetryTab('sky')}
                className={`py-1.5 text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  telemetryTab === 'sky'
                    ? 'bg-white/15 text-white font-medium border border-white/20 shadow'
                    : 'text-zinc-400 hover:text-white font-light'
                }`}
              >
                🔭 Sky Radar
              </button>
              <button
                type="button"
                onClick={() => setTelemetryTab('geodesic')}
                className={`py-1.5 text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  telemetryTab === 'geodesic'
                    ? 'bg-white/15 text-white font-medium border border-white/20 shadow'
                    : 'text-zinc-400 hover:text-white font-light'
                }`}
              >
                🌐 Geodesic
              </button>
              <button
                type="button"
                onClick={() => setTelemetryTab('orbit')}
                className={`py-1.5 text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  telemetryTab === 'orbit'
                    ? 'bg-white/15 text-white font-medium border border-white/20 shadow'
                    : 'text-zinc-400 hover:text-white font-light'
                }`}
              >
                🪐 Planetary
              </button>
            </div>

            {/* ======================================================== */}
            {/* TAB 1: 🔭 SKY DOME RADAR & LOCAL OBSERVERS               */}
            {/* ======================================================== */}
            {telemetryTab === 'sky' && (
              <div className="space-y-4">
                {/* Observer Switcher (Location A vs Location B) */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveObserver('A')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer ${
                      activeObserver === 'A'
                        ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-medium border border-[#38bdf8]/40 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" />
                    <span className="truncate">{cityA.city} Sky</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveObserver('B')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer ${
                      activeObserver === 'B'
                        ? 'bg-[#fea082]/20 text-[#fea082] font-medium border border-[#fea082]/40 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#fea082] shrink-0" />
                    <span className="truncate">{cityB.city} Sky</span>
                  </button>
                </div>

                {/* 2D Celestial Sky Dome Compass Radar */}
                <div className="p-4 rounded-xl bg-gradient-to-b from-white/10 to-black/80 border border-white/10 flex flex-col items-center gap-3">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3 h-3 text-[#fea082]" />
                      Observer Sky Dome Radar
                    </span>
                    <span className="text-white">{activeCity.city}</span>
                  </div>

                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg viewBox="0 0 160 160" className="w-full h-full select-none">
                      {/* Gradient Definitions */}
                      <defs>
                        <radialGradient id="skyGrad" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                          <stop offset="70%" stopColor="#0f172a" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
                        </radialGradient>
                      </defs>

                      {/* Radar Dome Disc */}
                      <circle cx="80" cy="80" r="68" fill="url(#skyGrad)" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.4" />

                      {/* Altitude Rings: 30° and 60° */}
                      <circle cx="80" cy="80" r="45" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.18" />
                      <circle cx="80" cy="80" r="22" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.18" />

                      {/* Crosshairs: N-S and E-W */}
                      <line x1="80" y1="12" x2="80" y2="148" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.15" />
                      <line x1="12" y1="80" x2="148" y2="80" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.15" />

                      {/* Center Crosshair (Zenith / 90°) */}
                      <circle cx="80" cy="80" r="2.5" fill="#ffffff" fillOpacity="0.7" />
                      <text x="83" y="77" fill="#94a3b8" fontSize="6" fontFamily="monospace">ZENITH 90°</text>

                      {/* Cardinal Compass Labels */}
                      <text x="80" y="8" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">N</text>
                      <text x="156" y="83" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">E</text>
                      <text x="80" y="158" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">S</text>
                      <text x="4" y="83" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">W</text>

                      {/* Sun Position Marker */}
                      {sunRadar && (
                        <g transform={`translate(${sunRadar.x}, ${sunRadar.y})`}>
                          <circle r={sunRadar.visible ? '7' : '5'} fill="#f59e0b" fillOpacity={sunRadar.visible ? '0.4' : '0.15'} />
                          <circle r={sunRadar.visible ? '4' : '3'} fill="#fbbf24" />
                          <text x="0" y="-8" fill="#fbbf24" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            ☀️ {(activeCelestial?.sun?.altitudeDeg ?? 0) > 0 ? `+${activeCelestial?.sun?.altitudeDeg}°` : `${activeCelestial?.sun?.altitudeDeg ?? 0}°`}
                          </text>
                        </g>
                      )}

                      {/* Moon Position Marker */}
                      {moonRadar && (
                        <g transform={`translate(${moonRadar.x}, ${moonRadar.y})`}>
                          <circle r={moonRadar.visible ? '6' : '4'} fill="#94a3b8" fillOpacity={moonRadar.visible ? '0.4' : '0.15'} />
                          <circle r={moonRadar.visible ? '3.5' : '2.5'} fill="#ffffff" />
                          <text x="0" y="12" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            🌙 {(activeCelestial?.moon?.altitudeDeg ?? 0) > 0 ? `+${activeCelestial?.moon?.altitudeDeg}°` : `${activeCelestial?.moon?.altitudeDeg ?? 0}°`}
                          </text>
                        </g>
                      )}
                    </svg>
                  </div>

                  <div className="flex items-center justify-between w-full text-[10px] font-mono text-zinc-400 px-2 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Sun: {activeCelestial?.sun.altitudeDeg}° ({activeCelestial?.sun.azimuthCompass} {activeCelestial?.sun.azimuthDeg}°)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-200" />
                      <span>Moon: {activeCelestial?.moon.altitudeDeg}° ({activeCelestial?.moon.azimuthCompass})</span>
                    </span>
                  </div>
                </div>

                {/* Observer Celestial Position Details Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs tracking-wider uppercase text-white font-light border-b border-white/10 pb-2">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${activeObserver === 'A' ? 'bg-[#38bdf8]' : 'bg-[#fea082]'}`} />
                      <span suppressHydrationWarning>{activeCity.city} • {activeTime?.currentTime || '--:--'}</span>
                    </span>
                    <span className="font-mono text-zinc-400 text-[10px]">{formatCoordinates(activeCity.lat, activeCity.lng)}</span>
                  </div>

                  <div className="space-y-2 text-xs font-light text-zinc-300">
                    {/* Sun Metrics */}
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-zinc-400">
                          <Sun className="w-3.5 h-3.5 text-[#fea082]" /> Solar Elevation:
                        </span>
                        <span suppressHydrationWarning className="font-mono text-white text-sm font-medium">
                          {activeCelestial ? `${activeCelestial.sun.altitudeDeg > 0 ? '+' : ''}${activeCelestial.sun.altitudeDeg}°` : '...'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span suppressHydrationWarning className="text-[#fea082]">{activeCelestial?.sun.elevationDescription}</span>
                        <span suppressHydrationWarning className="font-mono">
                          Azimuth: {activeCelestial?.sun.azimuthDeg}° {activeCelestial?.sun.azimuthCompass}
                        </span>
                      </div>
                    </div>

                    {/* Moon Metrics */}
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-zinc-400">
                          <Moon className="w-3.5 h-3.5 text-zinc-300" /> Lunar Elevation:
                        </span>
                        <span suppressHydrationWarning className="font-mono text-white text-sm font-medium">
                          {activeCelestial ? `${activeCelestial.moon.altitudeDeg > 0 ? '+' : ''}${activeCelestial.moon.altitudeDeg}°` : '...'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span suppressHydrationWarning className={activeCelestial?.moon.isVisibleInSky ? 'text-emerald-400' : 'text-zinc-500'}>
                          {activeCelestial?.moon.isVisibleInSky ? '● Visible in Sky' : '○ Below Horizon'}
                        </span>
                        <span suppressHydrationWarning className="font-mono">
                          Azimuth: {activeCelestial?.moon.azimuthDeg}° {activeCelestial?.moon.azimuthCompass}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Golden Hour & Blue Hour Photography Lighting Planner Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs tracking-wider uppercase text-white font-light border-b border-white/10 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#fea082]" />
                      Photography Lighting Conditions
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-white/10 text-[#fea082]">
                      {activePhoto.currentPhaseLabel}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Atmospheric Light State:</span>
                      <span
                        className={`font-medium ${
                          activePhoto.isGoldenHour
                            ? 'text-amber-400'
                            : activePhoto.isBlueHour
                            ? 'text-cyan-400'
                            : activePhoto.currentPhase === 'daylight'
                            ? 'text-yellow-200'
                            : 'text-indigo-300'
                        }`}
                      >
                        {activePhoto.isGoldenHour
                          ? '🌅 Golden Hour Active'
                          : activePhoto.isBlueHour
                          ? '🌌 Blue Hour Twilight'
                          : activePhoto.currentPhaseLabel}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
                      {activePhoto.isGoldenHour
                        ? 'Optimal soft, warm sunlight with rich long shadows. Ideal for portraiture, architectural facets, and landscape framing.'
                        : activePhoto.isBlueHour
                        ? 'Deep electric blue sky with balanced artificial illumination. Ideal for cityscape, skyline, and long-exposure photography.'
                        : activePhoto.currentPhase === 'daylight'
                        ? 'Direct high-contrast sunlight. Consider polarizing or ND filters for outdoor architectural shoots.'
                        : 'Deep celestial darkness. Optimal for Milky Way astro-photography, satellite tracking, and constellation viewing.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: 🌐 GEODESIC FLIGHT ARC & SPATIAL SEPARATION       */}
            {/* ======================================================== */}
            {telemetryTab === 'geodesic' && (
              <div className="space-y-4">
                {/* Geodesic Summary Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs tracking-wider uppercase text-white font-light border-b border-white/10 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-[#fea082]" />
                      Great-Circle Flight Telemetry
                    </span>
                    <span className="text-[10px] font-mono text-[#fea082]">Mach 0.82 Cruise</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-lg bg-black/50 border border-white/5 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Surface Distance</span>
                      <div className="text-lg font-mono text-white font-light">
                        {geodesic.distanceKm.toLocaleString()} <span className="text-xs text-zinc-500">km</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        {geodesic.distanceMiles.toLocaleString()} miles
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-black/50 border border-white/5 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Est. Flight Time</span>
                      <div className="text-lg font-mono text-[#fea082] font-light">
                        {geodesic.flightTimeFormatted}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        Direct Geodesic
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-black/50 border border-white/5 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Angular Separation</span>
                      <div className="text-lg font-mono text-white font-light">
                        {geodesic.angularDegrees}°
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        of 360° Globe Arc
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-black/50 border border-white/5 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Solar Time Lag</span>
                      <div className="text-lg font-mono text-[#38bdf8] font-light">
                        {geodesic.solarTimeLagHours} <span className="text-xs text-zinc-500">hrs</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        Longitudinal Offset
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subsolar and Sublunar Zenith Ground Anchors */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-normal border-b border-white/10 pb-2">
                    Global Zenith Anchors (Live)
                  </span>

                  <div className="space-y-2 text-xs font-light">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <div>
                          <div className="text-white text-xs">Subsolar Point (Solar Noon)</div>
                          <div className="text-[10px] text-zinc-500 font-mono">Sun 90° directly overhead</div>
                        </div>
                      </div>
                      <span suppressHydrationWarning className="font-mono text-amber-300 text-xs">
                        {sun ? formatCoordinates(sun.lat, sun.lng) : '...'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                        <div>
                          <div className="text-white text-xs">Sublunar Point (Moon Zenith)</div>
                          <div className="text-[10px] text-zinc-500 font-mono">Moon directly overhead</div>
                        </div>
                      </div>
                      <span suppressHydrationWarning className="font-mono text-[#fea082] text-xs">
                        {moon ? formatCoordinates(moon.lat, moon.lng) : '...'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* "Best Meeting Window" AI Optimizer Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs tracking-wider uppercase text-white font-light border-b border-white/10 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      AI Meeting Window Optimizer
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {comparison?.workingHoursOverlap.hasOverlap
                        ? `${comparison.workingHoursOverlap.overlapHours}h Overlap`
                        : 'Async Recommended'}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-300 leading-relaxed font-light">
                    {comparison?.workingHoursOverlap.advice}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenGoogleCalendar}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-light tracking-wider uppercase bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Google Cal</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadIcs}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-light tracking-wider uppercase bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .ICS</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: 🪐 PLANETARY ORBIT & LUNAR EPHEMERIS              */}
            {/* ======================================================== */}
            {telemetryTab === 'orbit' && (
              <div className="space-y-4">
                {/* Lunar Detailed Ephemeris Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs tracking-wider uppercase text-white font-light border-b border-white/10 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-zinc-200" />
                      Lunar Ephemeris Telemetry
                    </span>
                    <span className="text-sm">{lunarEphemeris?.phaseEmoji}</span>
                  </div>

                  <div className="space-y-2.5 text-xs font-light text-zinc-300">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Moon Phase:</span>
                      <span className="font-mono text-white text-sm">{lunarEphemeris?.phase}</span>
                    </div>

                    {/* Illumination Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                        <span>Illumination</span>
                        <span className="text-white">{lunarEphemeris?.illumination}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-[#fea082] transition-all duration-500"
                          style={{ width: `${lunarEphemeris?.illumination || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono">
                      <div className="p-2 rounded bg-black/40 border border-white/5">
                        <span className="text-zinc-500 text-[9px] block uppercase">Distance to Moon</span>
                        <span className="text-white">{lunarEphemeris?.distanceKm} km</span>
                        <span className="text-zinc-500 text-[9px] block">({lunarEphemeris?.lightSeconds} light-sec)</span>
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-white/5">
                        <span className="text-zinc-500 text-[9px] block uppercase">Synodic Cycle Age</span>
                        <span className="text-white">Day {lunarEphemeris?.ageDays}</span>
                        <span className="text-zinc-500 text-[9px] block">of 29.53 days</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-zinc-400 pt-1">
                      <span>Next Full Moon: in {lunarEphemeris?.daysToNextFullMoon}d</span>
                      <span>Next New Moon: in {lunarEphemeris?.daysToNextNewMoon}d</span>
                    </div>
                  </div>
                </div>

                {/* Earth Planetary Orbit Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs tracking-wider uppercase text-white font-light border-b border-white/10 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                      Earth Orbital Mechanics
                    </span>
                    <span className="text-[10px] font-mono text-[#38bdf8]">Heliocentric</span>
                  </div>

                  <div className="space-y-2 text-xs font-light text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Distance to Sun:</span>
                      <span className="font-mono text-white">
                        {earthTelemetry?.sunDistanceAu} AU <span className="text-zinc-500">({earthTelemetry?.sunDistanceKm} km)</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Earth Orbital Velocity:</span>
                      <span className="font-mono text-[#fea082]">
                        {earthTelemetry?.orbitalVelocityKms} km/s <span className="text-zinc-500">({earthTelemetry?.orbitalVelocityKmh} km/h)</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Equator Spin Speed:</span>
                      <span className="font-mono text-white">{earthTelemetry?.equatorSpeedKmh.toLocaleString()} km/h (465 m/s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Axial Obliquity (Tilt):</span>
                      <span className="font-mono text-white">{earthTelemetry?.axialTiltDeg}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Solar Irradiance Constant:</span>
                      <span className="font-mono text-amber-300">{earthTelemetry?.solarConstantWm2} W/m²</span>
                    </div>
                  </div>
                </div>

                {/* ISS Real-Time Spacecraft Telemetry Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs tracking-wider uppercase text-white font-light border-b border-white/10 pb-2">
                    <span className="flex items-center gap-1.5">
                      <span className="text-base">🛰️</span>
                      ISS Space Station Telemetry
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400">Low Earth Orbit</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-zinc-500 uppercase block">Orbital Altitude</span>
                      <span className="font-mono text-white text-sm">{issTelemetry?.altitudeKm} km</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-zinc-500 uppercase block">Orbital Velocity</span>
                      <span className="font-mono text-cyan-300 text-sm">{issTelemetry?.speedKmh.toLocaleString()} km/h</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-zinc-500 uppercase block">Orbit Period</span>
                      <span className="font-mono text-white text-sm">{issTelemetry?.orbitalPeriodMinutes} min</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-zinc-500 uppercase block">Sub-satellite Point</span>
                      <span suppressHydrationWarning className="font-mono text-[#fea082] text-xs">
                        {issTelemetry ? formatCoordinates(issTelemetry.lat, issTelemetry.lng) : '...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REST API Telemetry Snippet */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs tracking-wider uppercase text-zinc-300 font-light">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#fea082]" />
                  <span>Telemetry API</span>
                </span>
                <button
                  onClick={() =>
                    copySnippet(
                      `fetch('https://timeorbit.vercel.app/api/v1/compare?from=${cityA.id}&to=${cityB.id}')`
                    )
                  }
                  className="text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
    </div>
  );
}
