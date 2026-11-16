'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldAlert,
  KeyRound,
  FileQuestion,
  Wrench,
  Flame,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type ErrorPreviewType = '401' | '403' | '404' | '500' | '503';

export default function ErrorAndToastDiagnosticPage() {
  const toast = useToast();
  const [selectedError, setSelectedError] = useState<ErrorPreviewType>('404');

  // Trigger individual toast
  const handleSingleToast = (type: 'success' | 'error' | 'warning' | 'info' | 'celestial') => {
    switch (type) {
      case 'success':
        toast.success('Orbital telemetry synchronized successfully.', 'Telemetry Synced');
        break;
      case 'error':
        toast.error('Failed to communicate with Deep Space Network endpoint.', 'Connection Dropped');
        break;
      case 'warning':
        toast.warning('Atmospheric refraction drift detected. Calibrating sensors...', 'Sensor Drift');
        break;
      case 'celestial':
        toast.celestial('ISS is entering golden hour photography horizon.', 'Celestial Pass');
        break;
      case 'info':
      default:
        toast.info('Solar elevation angle is currently at peak transit.', 'Solar Telemetry');
        break;
    }
  };

  // Trigger 3-item Batch Toast
  const handleBatch3 = () => {
    toast.showBatch([
      {
        title: '🛰️ ISS Orbit',
        message: 'Flyover Radar trajectory updated for New Delhi station.',
        type: 'celestial',
      },
      {
        title: '🔑 API Token',
        message: 'Live cryptographic token authenticated with 60 req/min budget.',
        type: 'success',
      },
      {
        title: '📅 Chrono Calendar',
        message: 'Upcoming Solstice milestones indexed into offline storage.',
        type: 'info',
      },
    ]);
  };

  // Trigger 5-item Massive Batch Toast with staggered cascade
  const handleBatch5 = () => {
    toast.showBatch([
      {
        title: '⚡ Multi-City Sync',
        message: 'Calculated 24h daylight curve for Tokyo, London & New York.',
        type: 'success',
      },
      {
        title: '🌕 Lunar Ephemeris',
        message: 'Moon phase estimated at Waning Gibbous (82% illumination).',
        type: 'celestial',
      },
      {
        title: '⚠️ Atmospheric Alert',
        message: 'High geomagnetic solar wind index recorded at polar cap.',
        type: 'warning',
      },
      {
        title: '🩺 Health Telemetry',
        message: 'Database query ping: 12ms latency across distributed cluster.',
        type: 'info',
      },
      {
        title: '🔔 Priority Reminder',
        message: 'Quarterly celestial observatory backup scheduled in 2 hours.',
        type: 'celestial',
      },
    ]);
  };

  // Trigger Toast with Interactive Action Button
  const handleActionToast = () => {
    toast.showToast({
      title: '🗑️ Calendar Event Deleted',
      message: 'Mission milestone removed from local Chrono timeline.',
      type: 'warning',
      durationMs: 7000,
      action: {
        label: 'Undo Operation',
        onClick: () => {
          toast.success('Calendar event restoration completed.', 'Restored');
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 py-10 px-4 sm:px-6 max-w-7xl mx-auto space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#fea082] uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Diagnostics & Quality Assurance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extralight tracking-wider text-white">
            Error Pages & Batch Toast System
          </h1>
          <p className="text-xs sm:text-sm font-light text-zinc-400 mt-1">
            Test and preview all planetary observatory HTTP error states, layout error boundaries, and batch notification cascades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 transition-all"
          >
            ← Mission Control
          </Link>
        </div>
      </div>

      {/* SECTION 1: BATCH TOAST TEST BENCH */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#fea082]/10 border border-[#fea082]/30 flex items-center justify-center text-[#fea082]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-light text-white tracking-wide">
                Batch Toast Notification Engine
              </h2>
              <p className="text-xs text-zinc-400 font-light">
                Launch individual toast pills or trigger queued batch notifications with auto-dismiss progress bars.
              </p>
            </div>
          </div>

          {toast.toasts.length > 0 && (
            <button
              onClick={toast.dismissAll}
              className="px-3 py-1.5 rounded-full text-xs font-mono text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
            >
              Clear Active ({toast.toasts.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Individual Toast Trigger Card */}
          <div className="p-5 rounded-2xl bg-zinc-950/70 border border-white/10 space-y-4">
            <span className="text-[11px] font-mono tracking-wider text-[#fea082] uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Single Notifications</span>
            </span>
            <p className="text-xs text-zinc-400 font-light">
              Dispatch individual toasts with customized accent colors, icons, and timers:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleSingleToast('success')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Success</span>
              </button>
              <button
                onClick={() => handleSingleToast('error')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Error</span>
              </button>
              <button
                onClick={() => handleSingleToast('warning')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Warning</span>
              </button>
              <button
                onClick={() => handleSingleToast('celestial')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono bg-[#fea082]/10 hover:bg-[#fea082]/20 text-[#fea082] border border-[#fea082]/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Celestial</span>
              </button>
            </div>
          </div>

          {/* Batch Toast Cascades Card */}
          <div className="p-5 rounded-2xl bg-zinc-950/70 border border-[#fea082]/30 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#fea082]/10 rounded-full blur-2xl pointer-events-none" />
            <span className="text-[11px] font-mono tracking-wider text-[#fea082] uppercase flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Batch Cascades (Multi-Toast)</span>
            </span>
            <p className="text-xs text-zinc-400 font-light">
              Fires multiple staggered notifications into the queue with unified dismiss control:
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={handleBatch3}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider uppercase glow-btn transition-all cursor-pointer shadow-md"
              >
                <Layers className="w-4 h-4" />
                <span>Launch 3-Toast Batch</span>
              </button>
              <button
                onClick={handleBatch5}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider uppercase bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#fea082]" />
                <span>Launch 5-Toast Cascade</span>
              </button>
            </div>
          </div>

          {/* Interactive Action Toast Card */}
          <div className="p-5 rounded-2xl bg-zinc-950/70 border border-white/10 space-y-4">
            <span className="text-[11px] font-mono tracking-wider text-[#fea082] uppercase flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Action / Undo Toast</span>
            </span>
            <p className="text-xs text-zinc-400 font-light">
              Toasts equipped with interactive callbacks (such as Undo, View Details, or Re-try):
            </p>
            <div className="pt-1">
              <button
                onClick={handleActionToast}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-mono tracking-wider uppercase bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Trigger Action Toast</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Hover over any active toast to pause its auto-dismiss countdown.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: ERROR PAGES AUDIT & PREVIEW */}
      <section className="space-y-6 pt-4 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-light text-white tracking-wide">
                HTTP & Layout Error Pages
              </h2>
              <p className="text-xs text-zinc-400 font-light">
                Inspect how each error state renders for users across different authorization and system conditions.
              </p>
            </div>
          </div>

          {/* Error Selector Tabs */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 self-start sm:self-auto overflow-x-auto max-w-full">
            {(['401', '403', '404', '500', '503'] as ErrorPreviewType[]).map((code) => (
              <button
                key={code}
                onClick={() => setSelectedError(code)}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                  selectedError === code
                    ? 'bg-[#fea082] text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {code} {code === '401' ? 'Unauthorized' : code === '403' ? 'Forbidden' : code === '404' ? 'Not Found' : code === '500' ? 'Crash' : 'Maintenance'}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Error Page Preview Simulator */}
        <div className="rounded-3xl border border-white/15 bg-zinc-950/80 p-8 min-h-[420px] flex items-center justify-center relative overflow-hidden backdrop-blur-xl">
          {/* Ambient Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#fea082]/5 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 max-w-md w-full text-center space-y-6">
            {selectedError === '401' && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.2)]">
                  <KeyRound className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                    HTTP 401 // Unauthorized
                  </span>
                  <h3 className="text-2xl font-light text-white tracking-wide">
                    Astronaut Credentials Missing
                  </h3>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    Access to programmatic endpoints or secure developer telemetry requires an active session or API key.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href="/login"
                    className="px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider glow-btn"
                  >
                    Authenticate Now
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider bg-white/5 border border-white/15 text-zinc-300 hover:text-white"
                  >
                    Register
                  </Link>
                </div>
              </>
            )}

            {selectedError === '403' && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.2)]">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    HTTP 403 // Forbidden
                  </span>
                  <h3 className="text-2xl font-light text-white tracking-wide">
                    Security Clearance Denied
                  </h3>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    This command sector requires Administrator privileges. Standard mission accounts are restricted from accessing this terminal.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href="/login"
                    className="px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-300"
                  >
                    Switch to Admin
                  </Link>
                  <Link
                    href="/"
                    className="px-4 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider bg-white/5 border border-white/15 text-zinc-300 hover:text-white"
                  >
                    Return Home
                  </Link>
                </div>
              </>
            )}

            {selectedError === '404' && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-[#fea082]/10 border border-[#fea082]/30 flex items-center justify-center text-[#fea082] shadow-[0_0_24px_rgba(254,160,130,0.2)]">
                  <FileQuestion className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#fea082] bg-[#fea082]/10 border border-[#fea082]/20 px-2.5 py-0.5 rounded-full">
                    HTTP 404 // Trajectory Deviation
                  </span>
                  <h3 className="text-2xl font-light text-white tracking-wide">
                    Celestial Coordinate Not Found
                  </h3>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    The requested route or astronomical position has drifted beyond the radar horizon.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href="/"
                    className="px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider glow-btn"
                  >
                    Return to 3D Earth
                  </Link>
                  <Link
                    href="/clock"
                    className="px-4 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider bg-white/5 border border-white/15 text-zinc-300 hover:text-white"
                  >
                    Digital Clock
                  </Link>
                </div>
              </>
            )}

            {selectedError === '500' && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.2)]">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                    HTTP 500 // Internal Subsystem Failure
                  </span>
                  <h3 className="text-2xl font-light text-white tracking-wide">
                    Telemetry Stream Disrupted
                  </h3>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    An unhandled calculation exception was caught by the Next.js Error Boundary. Application memory is safely isolated.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => toast.info('System self-check completed. Subsystems nominal.', 'Re-alignment Success')}
                    className="px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/20 text-white cursor-pointer"
                  >
                    Re-align Subsystems
                  </button>
                  <Link
                    href="/"
                    className="px-4 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider glow-btn"
                  >
                    Home
                  </Link>
                </div>
              </>
            )}

            {selectedError === '503' && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.2)]">
                  <Wrench className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                    HTTP 503 // Orbital Maintenance
                  </span>
                  <h3 className="text-2xl font-light text-white tracking-wide">
                    Sensor Recalibration in Progress
                  </h3>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    Stationary observatories are currently undergoing routine telemetry alignment. Orbital access will resume shortly.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href="/api/health"
                    target="_blank"
                    className="px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center gap-1.5"
                  >
                    <span>Check Health API</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
