'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Clock,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronDown,
  Globe,
  Bell,
  BellOff,
} from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { CITIES, resolveUserCity } from '@/lib/cities';
import { getCityTime, getSolarElevationAndShadow, calculateSolarState } from '@/lib/timeEngine';
import { CityData, IStopwatchLap } from '@/types';
import { useToast } from '@/context/ToastContext';

type ClockTab = 'clock' | 'stopwatch' | 'timer';

export default function DigitalClockPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ClockTab>('clock');
  const [is12Hour, setIs12Hour] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityData>(resolveUserCity());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedIso, setCopiedIso] = useState(false);
  const [hourlyChimeEnabled, setHourlyChimeEnabled] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setHourlyChimeEnabled(audioEngine.getHourlyChimeState());
    });
  }, []);

  const handleToggleHourlyChime = () => {
    const next = !hourlyChimeEnabled;
    setHourlyChimeEnabled(next);
    audioEngine.setHourlyChimeState(next);
    if (next) {
      toast.celestial('Hourly Observatory Chime enabled (chimes on every hour).', 'Chime Active');
    } else {
      toast.info('Hourly Observatory Chime muted.', 'Chime Muted');
    }
  };

  // Live wall clock states
  const [now, setNow] = useState<Date>(() => new Date());

  // Stopwatch states
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchElapsedMs, setStopwatchElapsedMs] = useState(0);
  const [laps, setLaps] = useState<IStopwatchLap[]>([]);
  const stopwatchStartRef = useRef<number>(0);
  const stopwatchAccumulatedRef = useRef<number>(0);
  const stopwatchAnimRef = useRef<number | null>(null);

  // Timer states
  const [timerDurationSec, setTimerDurationSec] = useState<number>(25 * 60); // Default 25 min Pomodoro
  const [timerRemainingSec, setTimerRemainingSec] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<string>('25');
  const [customSeconds, setCustomSeconds] = useState<string>('00');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. Live Wall Clock Ticker (Optimized: Throttled to ~30fps & pauses when tab inactive or on stopwatch/timer) ---
  useEffect(() => {
    if (activeTab !== 'clock') return;
    let animId: number;
    let lastTick = 0;

    const tick = (nowTime: number) => {
      // Throttle to 33ms (~30fps) for crisp, ultra-efficient millisecond rendering without CPU spikes
      if (nowTime - lastTick >= 33) {
        lastTick = nowTime;
        if (typeof document === 'undefined' || !document.hidden) {
          setNow(new Date());
        }
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [activeTab]);

  // --- 2. Stopwatch Logic with Performance.now() for zero-drift accuracy ---
  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchStartRef.current = performance.now();
      const updateStopwatch = () => {
        const delta = performance.now() - stopwatchStartRef.current;
        setStopwatchElapsedMs(stopwatchAccumulatedRef.current + delta);
        stopwatchAnimRef.current = requestAnimationFrame(updateStopwatch);
      };
      stopwatchAnimRef.current = requestAnimationFrame(updateStopwatch);
    } else {
      if (stopwatchAnimRef.current) {
        cancelAnimationFrame(stopwatchAnimRef.current);
      }
    }
    return () => {
      if (stopwatchAnimRef.current) {
        cancelAnimationFrame(stopwatchAnimRef.current);
      }
    };
  }, [stopwatchRunning]);

  const handleStartPauseStopwatch = useCallback(() => {
    if (stopwatchRunning) {
      // Pause
      const delta = performance.now() - stopwatchStartRef.current;
      stopwatchAccumulatedRef.current += delta;
      setStopwatchElapsedMs(stopwatchAccumulatedRef.current);
      setStopwatchRunning(false);
    } else {
      // Start/Resume
      setStopwatchRunning(true);
    }
  }, [stopwatchRunning]);

  // --- 2b. Keyboard Event Listener: Start/Stop Stopwatch with Spacebar ---
  useEffect(() => {
    if (activeTab !== 'stopwatch') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleStartPauseStopwatch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleStartPauseStopwatch]);

  const handleResetStopwatch = () => {
    setStopwatchRunning(false);
    stopwatchAccumulatedRef.current = 0;
    setStopwatchElapsedMs(0);
    setLaps([]);
  };

  const handleRecordLap = () => {
    if (!stopwatchRunning && stopwatchElapsedMs === 0) return;
    const currentOverall = stopwatchElapsedMs;
    const previousOverall = laps.length > 0 ? laps[0].overallTime : 0;
    const lapTime = currentOverall - previousOverall;

    const newLap: IStopwatchLap = {
      id: laps.length + 1,
      lapTime,
      overallTime: currentOverall,
    };
    setLaps([newLap, ...laps]);
    toast.celestial(`Split: ${(lapTime / 1000).toFixed(2)}s recorded`, `Lap #${newLap.id}`);
  };

  // --- 3. Synthesized Web Audio API Alarm (Rich 5.5s repeating celestial alarm) ---
  const playAlarmSound = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    audioEngine.playTimerAlarm(4); // 4 repeating cycles (~5.5 seconds)
  }, [soundEnabled]);

  // --- 4. CountDown Timer Logic ---
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerRemainingSec((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setTimerRunning(false);
            setTimerCompleted(true);
            playAlarmSound();
            toast.warning('Observatory countdown timer reached zero!', 'Timer Complete');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning, playAlarmSound, toast]);

  const handleStartPauseTimer = () => {
    if (timerCompleted) {
      setTimerCompleted(false);
      setTimerRemainingSec(timerDurationSec);
      setTimerRunning(true);
      return;
    }
    setTimerRunning(!timerRunning);
  };

  const handleResetTimer = (newDurationSec?: number) => {
    setTimerRunning(false);
    setTimerCompleted(false);
    const duration = newDurationSec !== undefined ? newDurationSec : timerDurationSec;
    setTimerDurationSec(duration);
    setTimerRemainingSec(duration);
  };

  const handleApplyPreset = (minutes: number) => {
    const sec = minutes * 60;
    handleResetTimer(sec);
    setCustomMinutes(String(minutes));
    setCustomSeconds('00');
  };

  const handleApplyCustomTime = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(0, parseInt(customMinutes, 10) || 0);
    const secs = Math.max(0, Math.min(59, parseInt(customSeconds, 10) || 0));
    const total = mins * 60 + secs;
    if (total > 0) {
      handleResetTimer(total);
    }
  };

interface VendorFullscreenDoc extends Document {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
}

interface VendorFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
}

  // --- 5. Fullscreen Toggle (Cross-Platform Mobile & Desktop) ---
  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;

    // Toggle CSS-based fullscreen immediately for mobile devices, iOS Safari & Android WebViews
    setIsFullscreen((prev) => !prev);

    // Also attempt native browser requestFullscreen if supported
    try {
      const doc = document as VendorFullscreenDoc;
      const docEl = document.documentElement as VendorFullscreenElement;
      const isNativeFs = Boolean(document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement);

      if (!isNativeFs) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        }
      }
    } catch {}
  };

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as VendorFullscreenDoc;
      const isNativeFs = Boolean(document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement);
      if (isNativeFs) {
        setIsFullscreen(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Keyboard shortcut: Escape exits fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // --- 6. Time Formatting Computations ---
  const cityTime = useMemo(() => {
    return getCityTime(selectedCity, now);
  }, [selectedCity, now]);

  const solarData = useMemo(() => {
    return getSolarElevationAndShadow(selectedCity.lat, selectedCity.lng, now);
  }, [selectedCity, now]);

  const solarState = useMemo(() => {
    return calculateSolarState(selectedCity.lat, selectedCity.lng, now);
  }, [selectedCity, now]);

  // Milliseconds formatted (00 - 99)
  const msStr = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');

  // Digital clock digits
  const { hoursStr, minutesStr, secondsStr, periodStr } = useMemo(() => {
    let hours = cityTime.hour24;
    let period = '';
    if (is12Hour) {
      period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
    }
    return {
      hoursStr: String(hours).padStart(2, '0'),
      minutesStr: String(cityTime.minutes).padStart(2, '0'),
      secondsStr: String(now.getSeconds()).padStart(2, '0'),
      periodStr: period,
    };
  }, [cityTime, is12Hour, now]);

  // Stopwatch formatted string
  const formatStopwatch = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  };

  // Timer formatted string
  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Julian date calculation
  const julianDate = useMemo(() => {
    return (now.getTime() / 86400000 + 2440587.5).toFixed(4);
  }, [now]);

  // Day of year
  const dayOfYear = useMemo(() => {
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [now]);

  // Fastest and slowest lap calculation
  const { fastestLapId, slowestLapId } = useMemo(() => {
    if (laps.length < 2) return { fastestLapId: null, slowestLapId: null };
    let minTime = Infinity;
    let maxTime = -Infinity;
    let fastestId = laps[0].id;
    let slowestId = laps[0].id;

    for (const lap of laps) {
      if (lap.lapTime < minTime) {
        minTime = lap.lapTime;
        fastestId = lap.id;
      }
      if (lap.lapTime > maxTime) {
        maxTime = lap.lapTime;
        slowestId = lap.id;
      }
    }
    return { fastestLapId: fastestId, slowestLapId: slowestId };
  }, [laps]);

  const copyIsoTimestamp = () => {
    navigator.clipboard.writeText(cityTime.iso);
    setCopiedIso(true);
    toast.success('ISO 8601 observatory timestamp copied to clipboard.', 'Copied');
    setTimeout(() => setCopiedIso(false), 2000);
  };

  return (
    <div
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-[999] w-screen h-[100dvh] bg-black p-4 sm:p-8 flex flex-col justify-between overflow-hidden select-none'
          : 'min-h-[calc(100dvh-4rem)] bg-[#07090e] text-zinc-100 flex flex-col justify-between selection:bg-[#fea082]/30 p-3 sm:p-8'
      }`}
    >
      {/* Floating Exit Fullscreen Button when in Fullscreen Mode */}
      {isFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[1000] px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono text-white backdrop-blur-md shadow-2xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          title="Exit Fullscreen (Esc)"
        >
          <Minimize2 className="w-4 h-4 text-[#fea082]" />
          <span>Exit Full Screen</span>
        </button>
      )}

      {/* ========================================================= */}
      {/* FULLSCREEN OBSERVATORY VIEWS                              */}
      {/* ========================================================= */}
      {isFullscreen && activeTab === 'clock' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
          {/* Location & Solar Status */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono tracking-[0.25em] uppercase text-zinc-400 font-light">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8] animate-pulse" />
            <span>{selectedCity.city}, {selectedCity.country}</span>
            <span className="text-[#fea082]">({cityTime.utcOffset})</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono tracking-widest uppercase bg-white/10 border border-white/15 text-zinc-300">
              {solarState.toUpperCase()}
            </span>
          </div>

          {/* Giant Minimalist Digital Clock Digits */}
          <div className="flex items-baseline justify-center gap-0.5 sm:gap-2 select-none max-w-full overflow-hidden">
            <span className="text-5xl sm:text-8xl md:text-9xl lg:text-[11rem] font-extralight font-mono tracking-tight text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.25)]">
              {hoursStr}
            </span>
            <span className="text-4xl sm:text-7xl md:text-8xl lg:text-[10rem] font-thin font-mono text-[#fea082] animate-pulse">
              :
            </span>
            <span className="text-5xl sm:text-8xl md:text-9xl lg:text-[11rem] font-extralight font-mono tracking-tight text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.25)]">
              {minutesStr}
            </span>
            <span className="text-4xl sm:text-7xl md:text-8xl lg:text-[10rem] font-thin font-mono text-[#fea082] animate-pulse">
              :
            </span>
            <span className="text-5xl sm:text-8xl md:text-9xl lg:text-[11rem] font-extralight font-mono tracking-tight text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.25)]">
              {secondsStr}
            </span>

            {/* Milliseconds Fraction + AM/PM Indicator */}
            <div className="flex flex-col items-start ml-2 sm:ml-4 text-left">
              {is12Hour && (
                <span className="text-sm sm:text-3xl font-mono font-medium tracking-widest text-[#fea082]">
                  {periodStr}
                </span>
              )}
              <span className="text-lg sm:text-4xl font-mono font-light text-zinc-500">
                .{msStr}
              </span>
            </div>
          </div>

          {/* Clean Calendar Date Line */}
          <div className="text-sm sm:text-xl font-light font-mono text-zinc-400 tracking-[0.2em] uppercase">
            {cityTime.currentDate}
          </div>
        </div>
      ) : isFullscreen && activeTab === 'stopwatch' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 px-4">
          {/* Status & Lap Telemetry Pill */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs sm:text-sm font-mono tracking-[0.25em] uppercase text-zinc-400 font-light">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                stopwatchRunning
                  ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse'
                  : stopwatchElapsedMs > 0
                  ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                  : 'bg-zinc-600'
              }`}
            />
            <span className={stopwatchRunning ? 'text-emerald-300' : stopwatchElapsedMs > 0 ? 'text-amber-300' : 'text-zinc-400'}>
              {stopwatchRunning
                ? 'High-Frequency Chronograph Active'
                : stopwatchElapsedMs > 0
                ? 'Chronograph Paused'
                : 'Precision Chronograph Ready'}
            </span>
            {laps.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-white/10 border border-white/15 text-[#38bdf8]">
                {laps.length} {laps.length === 1 ? 'Lap' : 'Laps'}
              </span>
            )}
          </div>

          {/* Giant Minimalist Stopwatch Digits */}
          <div className="text-5xl xs:text-7xl sm:text-8xl md:text-9xl lg:text-[11rem] font-extralight font-mono tracking-tight text-white select-none drop-shadow-[0_0_45px_rgba(254,160,130,0.3)]">
            {formatStopwatch(stopwatchElapsedMs)}
          </div>

          {/* Centered Ergonomic Action Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4">
            <button
              type="button"
              onClick={handleStartPauseStopwatch}
              title="Start / Pause (Spacebar)"
              className={`flex items-center justify-center gap-2 px-6 sm:px-10 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-mono tracking-widest uppercase transition-all shadow-2xl cursor-pointer active:scale-95 border ${
                stopwatchRunning
                  ? 'bg-amber-500/25 text-amber-200 border-amber-500/50 hover:bg-amber-500/35 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                  : 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50 hover:bg-emerald-500/35 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
              }`}
            >
              {stopwatchRunning ? <Pause className="w-5 h-5 shrink-0" /> : <Play className="w-5 h-5 shrink-0" />}
              <span>{stopwatchRunning ? 'Pause' : stopwatchElapsedMs > 0 ? 'Resume' : 'Start'}</span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/50 border border-white/20 text-zinc-300 ml-1">
                Space
              </span>
            </button>

            <button
              type="button"
              onClick={handleRecordLap}
              disabled={!stopwatchRunning}
              className={`flex items-center justify-center gap-2 px-4 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-mono tracking-wider uppercase transition-all border cursor-pointer active:scale-95 ${
                stopwatchRunning
                  ? 'bg-white/10 text-white border-white/25 hover:bg-white/20 shadow-lg'
                  : 'opacity-30 cursor-not-allowed bg-transparent text-zinc-600 border-white/10'
              }`}
            >
              <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-[#38bdf8] shrink-0" />
              <span>Lap Split</span>
            </button>

            <button
              type="button"
              onClick={handleResetStopwatch}
              disabled={stopwatchElapsedMs === 0}
              className={`flex items-center justify-center gap-2 px-4 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-mono tracking-wider uppercase transition-all border cursor-pointer active:scale-95 ${
                stopwatchElapsedMs > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 shadow-lg'
                  : 'opacity-30 cursor-not-allowed bg-transparent text-zinc-600 border-white/10'
              }`}
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Reset</span>
            </button>
          </div>

          {/* Floating Recent Lap Telemetry HUD */}
          {laps.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-xs font-mono text-zinc-300">
              <span className="text-zinc-500">
                Latest Lap #{laps[0].id}: <strong className="text-white">+{formatStopwatch(laps[0].lapTime)}</strong>
              </span>
              {fastestLapId && (
                <span className="text-emerald-400">
                  Fastest: #{fastestLapId} (+{formatStopwatch(laps.find((l) => l.id === fastestLapId)?.lapTime || 0)})
                </span>
              )}
              {slowestLapId && laps.length > 1 && (
                <span className="text-rose-400">
                  Slowest: #{slowestLapId} (+{formatStopwatch(laps.find((l) => l.id === slowestLapId)?.lapTime || 0)})
                </span>
              )}
            </div>
          )}

          {/* Desktop Hotkey Legend */}
          <div className="hidden sm:flex items-center justify-center gap-2 text-xs font-mono text-zinc-500">
            <span>Press</span>
            <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-zinc-300 text-[10px]">Space</kbd>
            <span>to start / pause</span>
            <span className="mx-2">•</span>
            <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-zinc-300 text-[10px]">Esc</kbd>
            <span>to exit fullscreen</span>
          </div>
        </div>
      ) : isFullscreen && activeTab === 'timer' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 px-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono tracking-[0.25em] uppercase text-zinc-400 font-light">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                timerRunning
                  ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse'
                  : timerCompleted
                  ? 'bg-rose-400 shadow-[0_0_12px_#fb7185] animate-ping'
                  : 'bg-zinc-600'
              }`}
            />
            <span className={timerCompleted ? 'text-rose-400 font-bold' : timerRunning ? 'text-emerald-300' : 'text-zinc-400'}>
              {timerCompleted
                ? 'Countdown Session Complete!'
                : timerRunning
                ? 'Precision Countdown Running'
                : 'Countdown Timer Ready'}
            </span>
          </div>

          {/* Giant Countdown Digits */}
          <div
            className={`text-5xl xs:text-7xl sm:text-8xl md:text-9xl lg:text-[11rem] font-extralight font-mono tracking-tight select-none transition-all ${
              timerCompleted
                ? 'text-rose-400 animate-pulse drop-shadow-[0_0_50px_rgba(244,63,94,0.5)]'
                : 'text-white drop-shadow-[0_0_45px_rgba(56,189,248,0.3)]'
            }`}
          >
            {formatTimer(timerRemainingSec)}
          </div>

          {/* Progress Bar in Fullscreen */}
          <div className="w-full max-w-md h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                timerCompleted ? 'bg-rose-500' : 'bg-gradient-to-r from-[#38bdf8] to-[#fea082]'
              }`}
              style={{
                width: `${timerDurationSec > 0 ? ((timerDurationSec - timerRemainingSec) / timerDurationSec) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Centered Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4">
            <button
              type="button"
              onClick={handleStartPauseTimer}
              className={`flex items-center justify-center gap-2 px-6 sm:px-10 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-mono tracking-widest uppercase transition-all shadow-2xl cursor-pointer active:scale-95 border ${
                timerRunning
                  ? 'bg-amber-500/25 text-amber-200 border-amber-500/50 hover:bg-amber-500/35 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                  : 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50 hover:bg-emerald-500/35 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
              }`}
            >
              {timerRunning ? <Pause className="w-5 h-5 shrink-0" /> : <Play className="w-5 h-5 shrink-0" />}
              <span>{timerCompleted ? 'Restart' : timerRunning ? 'Pause' : 'Start'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleResetTimer(timerDurationSec)}
              className="flex items-center justify-center gap-2 px-4 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-mono tracking-wider uppercase transition-all border border-white/20 bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => handleResetTimer(timerRemainingSec + 60)}
              className="px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-mono tracking-wider uppercase border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer active:scale-95"
            >
              +1 Min
            </button>

            <button
              type="button"
              onClick={() => handleResetTimer(timerRemainingSec + 300)}
              className="px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-mono tracking-wider uppercase border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer active:scale-95"
            >
              +5 Min
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto w-full space-y-4 sm:space-y-6">
          {/* --- Top Bar & Navigation Header --- */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-[#fea082] shadow-[0_0_15px_rgba(254,160,130,0.15)] shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-light tracking-[0.2em] uppercase text-white flex items-center gap-2">
                  Digital Chronometer
                  <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    Precision Live
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-mono tracking-wider">
                  Planetary Observatory Timekeeping & Chronometrics
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl max-w-full overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('clock')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono tracking-wider uppercase transition-all shrink-0 cursor-pointer ${
                  activeTab === 'clock'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                <span>Digital Clock</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stopwatch')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono tracking-wider uppercase transition-all shrink-0 cursor-pointer ${
                  activeTab === 'stopwatch'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Timer className="w-3.5 h-3.5 text-[#fea082] shrink-0" />
                <span>Stopwatch</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timer')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono tracking-wider uppercase transition-all shrink-0 cursor-pointer ${
                  activeTab === 'timer'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Timer</span>
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5 shrink-0 cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Observatory Mode'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-[#fea082]" /> : <Maximize2 className="w-4 h-4 text-zinc-300" />}
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: DIGITAL CLOCK                                      */}
          {/* ========================================================= */}
          {activeTab === 'clock' && (
            <div className="space-y-6">
              {/* Control Bar: City Selector & 12h/24h Toggle */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2.5 min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-2 shrink-0">
                    <Globe className="w-4 h-4 text-[#38bdf8] shrink-0" />
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Observatory Timezone:</span>
                  </div>
                  <div className="relative w-full sm:w-72 md:w-80 min-w-0">
                    <select
                      value={selectedCity.id}
                      onChange={(e) => {
                        const found = CITIES.find((c) => c.id === e.target.value);
                        if (found) setSelectedCity(found);
                      }}
                      className="w-full appearance-none bg-white/5 border border-white/15 rounded-lg pl-3 pr-8 py-1.5 text-xs font-mono font-medium text-white tracking-wider uppercase cursor-pointer hover:border-white/30 focus:outline-none truncate"
                    >
                      {CITIES.map((c) => (
                        <option key={c.id} value={c.id} className="bg-zinc-950 text-white">
                          {c.city}, {c.country} ({c.timezone})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIs12Hour(!is12Hour)}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider uppercase bg-white/5 hover:bg-white/15 border border-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer text-center whitespace-nowrap active:scale-95"
                  >
                    Format: <span className="text-[#fea082] font-semibold">{is12Hour ? '12-Hour' : '24-Hour'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleHourlyChime}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider uppercase border transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                      hourlyChimeEnabled
                        ? 'bg-[#38bdf8]/20 border-[#38bdf8]/50 text-white shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                        : 'bg-white/5 border-white/15 text-zinc-400 hover:text-white'
                    }`}
                    title="Toggle Observatory Chime at the top of every hour"
                  >
                    {hourlyChimeEnabled ? <Bell className="w-3.5 h-3.5 text-[#38bdf8]" /> : <BellOff className="w-3.5 h-3.5" />}
                    <span>{hourlyChimeEnabled ? 'Chime: ON' : 'Chime: OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyIsoTimestamp}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider uppercase bg-white/5 hover:bg-white/15 border border-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    title="Copy ISO 8601 Timestamp"
                  >
                    {copiedIso ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIso ? 'Copied' : 'ISO 8601'}</span>
                  </button>
                </div>
              </div>

              {/* Giant Monospace Observatory Digital Chronometer Display */}
              <div className="relative rounded-3xl bg-black/80 border border-white/15 p-6 sm:p-12 text-center backdrop-blur-2xl shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-radial from-[#38bdf8]/5 via-transparent to-transparent pointer-events-none" />

                {/* Sub-header: Location & Solar State Indicator */}
                <div className="relative z-10 flex items-center justify-center gap-3 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8] animate-pulse" />
                  <span className="text-xs sm:text-sm font-mono tracking-[0.25em] uppercase text-zinc-300 font-light">
                    {selectedCity.city}, {selectedCity.country}
                  </span>
                  <span className="text-xs font-mono text-[#fea082]">
                    {cityTime.utcOffset}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono tracking-widest uppercase bg-white/10 border border-white/15 text-zinc-300">
                    {solarState.toUpperCase()}
                  </span>
                </div>

                {/* Giant Digits */}
                <div className="relative z-10 flex items-baseline justify-center gap-0.5 sm:gap-2 select-none max-w-full overflow-hidden">
                  <span className="text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight font-mono tracking-tight text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]">
                    {hoursStr}
                  </span>
                  <span className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-thin font-mono text-[#fea082] animate-pulse">
                    :
                  </span>
                  <span className="text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight font-mono tracking-tight text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]">
                    {minutesStr}
                  </span>
                  <span className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-thin font-mono text-[#fea082] animate-pulse">
                    :
                  </span>
                  <span className="text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight font-mono tracking-tight text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]">
                    {secondsStr}
                  </span>

                  {/* Milliseconds Fraction + AM/PM Indicator */}
                  <div className="flex flex-col items-start ml-2 sm:ml-4 text-left">
                    {is12Hour && (
                      <span className="text-sm sm:text-2xl font-mono font-medium tracking-widest text-[#fea082]">
                        {periodStr}
                      </span>
                    )}
                    <span className="text-lg sm:text-3xl font-mono font-light text-zinc-500">
                      .{msStr}
                    </span>
                  </div>
                </div>

                {/* Date & Astronomical Ephemeris Line */}
                <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-around gap-4 text-xs font-mono text-zinc-400">
                  <div>
                    <span className="text-zinc-500 uppercase tracking-widest block text-[9px]">Calendar Date</span>
                    <span className="text-white text-sm">{cityTime.currentDate}</span>
                  </div>

                  <div>
                    <span className="text-zinc-500 uppercase tracking-widest block text-[9px]">Solar Elevation</span>
                    <span className="text-[#38bdf8] text-sm">
                      {solarData.altitudeDeg.toFixed(1)}° ({solarData.azimuthCompass})
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-500 uppercase tracking-widest block text-[9px]">Julian Day</span>
                    <span className="text-white text-sm">{julianDate}</span>
                  </div>

                  <div>
                    <span className="text-zinc-500 uppercase tracking-widest block text-[9px]">Day of Year</span>
                    <span className="text-[#fea082] text-sm">Day {dayOfYear} / 365</span>
                  </div>

                  <div>
                    <span className="text-zinc-500 uppercase tracking-widest block text-[9px]">Shadow Factor</span>
                    <span className="text-white text-sm">
                      {solarData.shadowLengthFactor !== null ? `${solarData.shadowLengthFactor.toFixed(2)}x` : 'In Night Shadow'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* ========================================================= */}
        {/* TAB 2: PRECISION STOPWATCH                                */}
        {/* ========================================================= */}
        {activeTab === 'stopwatch' && (
          <div className="space-y-6">
            {/* Stopwatch Hero Card */}
            <div className="rounded-3xl bg-black/80 border border-white/15 p-4 xs:p-6 sm:p-12 text-center backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-[#fea082] mb-3">
                High-Frequency Millisecond Chronograph
              </div>

              {/* Big Stopwatch Readout */}
              <div className="text-5xl xs:text-6xl sm:text-8xl md:text-9xl font-extralight font-mono tracking-tight text-white select-none drop-shadow-[0_0_30px_rgba(254,160,130,0.2)]">
                {formatStopwatch(stopwatchElapsedMs)}
              </div>

              {/* Stopwatch Action Buttons */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm sm:max-w-md mx-auto sm:flex sm:items-center sm:justify-center sm:gap-4 mt-6 sm:mt-8">
                <button
                  type="button"
                  onClick={handleStartPauseStopwatch}
                  title="Start / Pause Stopwatch (Press Spacebar)"
                  className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-mono tracking-wider sm:tracking-widest uppercase transition-all shadow-xl cursor-pointer active:scale-95 w-full sm:w-auto ${
                    stopwatchRunning
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {stopwatchRunning ? <Pause className="w-4 h-4 shrink-0" /> : <Play className="w-4 h-4 shrink-0" />}
                  <span>{stopwatchRunning ? 'Pause' : stopwatchElapsedMs > 0 ? 'Resume' : 'Start'}</span>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/15 text-zinc-300 ml-1">
                    Space
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleRecordLap}
                  disabled={!stopwatchRunning}
                  className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-mono tracking-wider sm:tracking-widest uppercase transition-all border cursor-pointer active:scale-95 w-full sm:w-auto ${
                    stopwatchRunning
                      ? 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                      : 'opacity-40 cursor-not-allowed bg-transparent text-zinc-500 border-white/10'
                  }`}
                >
                  <Flag className="w-4 h-4 text-[#38bdf8] shrink-0" />
                  <span>
                    <span className="hidden xs:inline">Lap </span>Split
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleResetStopwatch}
                  disabled={stopwatchElapsedMs === 0}
                  className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-mono tracking-wider sm:tracking-widest uppercase transition-all border cursor-pointer active:scale-95 w-full sm:w-auto ${
                    stopwatchElapsedMs > 0
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                      : 'opacity-40 cursor-not-allowed bg-transparent text-zinc-500 border-white/10'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Spacebar hotkey hint */}
              <div className="hidden sm:flex items-center justify-center gap-2 mt-4 text-[11px] font-mono text-zinc-500">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-zinc-300 text-[10px] shadow-sm">
                  Space
                </kbd>
                <span>to start / pause chronograph</span>
              </div>
            </div>

            {/* Lap Times History Table */}
            {laps.length > 0 && (
              <div className="rounded-2xl bg-black/60 border border-white/10 p-5 backdrop-blur-md space-y-3">
                <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-zinc-400 border-b border-white/10 pb-3">
                  <span>Recorded Laps ({laps.length})</span>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Fastest
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Slowest
                    </span>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {laps.map((lap) => {
                    const isFastest = lap.id === fastestLapId;
                    const isSlowest = lap.id === slowestLapId;
                    return (
                      <div
                        key={lap.id}
                        className={`flex justify-between items-center px-4 py-2 rounded-xl text-xs font-mono transition-colors ${
                          isFastest
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : isSlowest
                            ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                            : 'bg-white/5 border border-white/10 text-zinc-300'
                        }`}
                      >
                        <span className="font-semibold">Lap {String(lap.id).padStart(2, '0')}</span>
                        <span className="tracking-wider">+{formatStopwatch(lap.lapTime)}</span>
                        <span className="text-zinc-400">{formatStopwatch(lap.overallTime)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: COUNTDOWN TIMER                                    */}
        {/* ========================================================= */}
        {activeTab === 'timer' && (
          <div className="space-y-6">
            <div className={`rounded-3xl bg-black/80 border p-4 xs:p-6 sm:p-12 text-center backdrop-blur-2xl shadow-2xl relative overflow-hidden transition-all ${
              timerCompleted
                ? 'border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.3)] animate-pulse'
                : 'border-white/15'
            }`}>
              {/* Audio Chime Notification Toggle & Preview */}
              <div className="flex flex-wrap items-center justify-end gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => playAlarmSound()}
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono tracking-wider bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Test & Preview Alarm Sound (5.5s)"
                >
                  Preview Alarm
                </button>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono tracking-wider transition-all cursor-pointer ${
                    soundEnabled
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-white/5 text-zinc-500 border border-white/10'
                  }`}
                  title="Toggle Audio Alarm Chime"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
                  <span>{soundEnabled ? 'Alarm Sound: ON' : 'Alarm Sound: MUTED'}</span>
                </button>
              </div>

              {/* Circular Progress Display */}
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="transparent"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="4"
                  />
                  {/* Active Progress Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="transparent"
                    stroke={timerCompleted ? '#34d399' : '#fea082'}
                    strokeWidth="4"
                    strokeDasharray={276.46}
                    strokeDashoffset={
                      276.46 * (1 - (timerDurationSec > 0 ? timerRemainingSec / timerDurationSec : 0))
                    }
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-linear"
                  />
                </svg>

                {/* Inner Digits */}
                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                  <div className="text-5xl sm:text-7xl font-extralight font-mono tracking-tight text-white">
                    {formatTimer(timerRemainingSec)}
                  </div>
                  <div className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 mt-2">
                    {timerCompleted ? (
                      <span className="text-emerald-400 font-bold animate-bounce">Session Finished!</span>
                    ) : timerRunning ? (
                      'Counting Down'
                    ) : (
                      'Ready'
                    )}
                  </div>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mt-6 sm:mt-8">
                <button
                  type="button"
                  onClick={handleStartPauseTimer}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-mono tracking-wider sm:tracking-widest uppercase transition-all shadow-xl cursor-pointer active:scale-95 ${
                    timerCompleted
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/35'
                      : timerRunning
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{timerCompleted ? 'Restart' : timerRunning ? 'Pause' : 'Start'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleResetTimer()}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-mono tracking-wider sm:tracking-widest uppercase bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Quick Presets & Custom Input Bar */}
            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Precision Timing Presets:
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { label: 'Pomodoro', mins: 25 },
                  { label: 'Deep Focus', mins: 45 },
                  { label: 'Short Break', mins: 5 },
                  { label: 'Long Break', mins: 15 },
                  { label: 'Sprint', mins: 1 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset.mins)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      timerDurationSec === preset.mins * 60
                        ? 'bg-[#fea082]/15 border-[#fea082]/50 text-white'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-mono font-medium text-white">{preset.mins} min</div>
                    <div className="text-[10px] text-zinc-500">{preset.label}</div>
                  </button>
                ))}
              </div>

              {/* Custom Duration Form */}
              <form onSubmit={handleApplyCustomTime} className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                <span className="text-xs font-mono text-zinc-400">Custom Duration:</span>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="MM"
                  className="w-16 px-2 py-1 bg-white/5 border border-white/15 rounded-lg text-xs font-mono text-center text-white focus:outline-none focus:border-[#fea082]"
                />
                <span className="text-xs font-mono text-zinc-400">m</span>

                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(e.target.value)}
                  placeholder="SS"
                  className="w-16 px-2 py-1 bg-white/5 border border-white/15 rounded-lg text-xs font-mono text-center text-white focus:outline-none focus:border-[#fea082]"
                />
                <span className="text-xs font-mono text-zinc-400">s</span>

                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
                >
                  Set Custom Timer
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Footer System Telemetry */}
      {!isFullscreen && (
        <footer className="mt-8 text-center text-[10px] font-mono text-zinc-600 tracking-widest uppercase">
          TimeOrbit Precision Frequency Generator • Synced to Coordinated Universal Time (UTC)
        </footer>
      )}
    </div>
  );
}
