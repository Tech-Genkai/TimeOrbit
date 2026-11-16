'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  X,
  Layers,
  Trash2,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'celestial';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface IToastItem {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  durationMs: number;
  action?: ToastAction;
  createdAt: number;
}

export interface ToastInput {
  title?: string;
  message: string;
  type?: ToastType;
  durationMs?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: IToastItem[];
  showToast: (input: ToastInput | string, type?: ToastType) => string;
  showBatch: (items: (ToastInput | string)[], defaultType?: ToastType) => string[];
  dismissToast: (id: string) => void;
  dismissAll: () => void;
  // Shortcut helpers
  success: (message: string, titleOrOptions?: string | Partial<ToastInput>) => string;
  error: (message: string, titleOrOptions?: string | Partial<ToastInput>) => string;
  warning: (message: string, titleOrOptions?: string | Partial<ToastInput>) => string;
  info: (message: string, titleOrOptions?: string | Partial<ToastInput>) => string;
  celestial: (message: string, titleOrOptions?: string | Partial<ToastInput>) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<IToastItem[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Dismiss a single toast
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  // Core showToast method
  const showToast = useCallback(
    (input: ToastInput | string, explicitType?: ToastType): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const isString = typeof input === 'string';

      const item: IToastItem = {
        id,
        message: isString ? input : input.message,
        title: isString ? undefined : input.title,
        type: explicitType || (isString ? 'info' : input.type || 'info'),
        durationMs: isString ? DEFAULT_DURATION : input.durationMs || DEFAULT_DURATION,
        action: isString ? undefined : input.action,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        // Limit max active toasts to 6 to prevent screen overflow
        const sliced = prev.length >= 6 ? prev.slice(prev.length - 5) : prev;
        return [...sliced, item];
      });

      // Auto dismiss timer
      if (item.durationMs > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, item.durationMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  // Batch Toast Method (Fires multiple toasts stacked or queued)
  const showBatch = useCallback(
    (items: (ToastInput | string)[], defaultType: ToastType = 'info'): string[] => {
      const generatedIds: string[] = [];

      items.forEach((item, index) => {
        setTimeout(() => {
          const id = showToast(
            typeof item === 'string'
              ? { message: item, type: defaultType }
              : { ...item, type: item.type || defaultType }
          );
          generatedIds.push(id);
        }, index * 120); // 120ms staggered cascade animation
      });

      return generatedIds;
    },
    [showToast]
  );

  // Helper shortcuts
  const success = useCallback(
    (message: string, titleOrOptions?: string | Partial<ToastInput>) => {
      const opts = typeof titleOrOptions === 'string' ? { title: titleOrOptions } : titleOrOptions;
      return showToast({ message, type: 'success', ...opts });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, titleOrOptions?: string | Partial<ToastInput>) => {
      const opts = typeof titleOrOptions === 'string' ? { title: titleOrOptions } : titleOrOptions;
      return showToast({ message, type: 'error', durationMs: 6000, ...opts });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, titleOrOptions?: string | Partial<ToastInput>) => {
      const opts = typeof titleOrOptions === 'string' ? { title: titleOrOptions } : titleOrOptions;
      return showToast({ message, type: 'warning', ...opts });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, titleOrOptions?: string | Partial<ToastInput>) => {
      const opts = typeof titleOrOptions === 'string' ? { title: titleOrOptions } : titleOrOptions;
      return showToast({ message, type: 'info', ...opts });
    },
    [showToast]
  );

  const celestial = useCallback(
    (message: string, titleOrOptions?: string | Partial<ToastInput>) => {
      const opts = typeof titleOrOptions === 'string' ? { title: titleOrOptions } : titleOrOptions;
      return showToast({ message, type: 'celestial', ...opts });
    },
    [showToast]
  );

  // Pause timer on hover
  const handleMouseEnter = (id: string) => {
    setHoveredId(id);
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  };

  const handleMouseLeave = (id: string, durationMs: number) => {
    setHoveredId(null);
    if (durationMs > 0) {
      const timer = setTimeout(() => {
        dismissToast(id);
      }, durationMs);
      timersRef.current.set(id, timer);
    }
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showBatch,
        dismissToast,
        dismissAll,
        success,
        error,
        warning,
        info,
        celestial,
      }}
    >
      {children}

      {/* Toast Notification Container */}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
        role="region"
      >
        {/* Dismiss All Header when multiple toasts are visible */}
        {toasts.length >= 2 && (
          <div className="flex items-center justify-between pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#fea082]" />
              <span>
                {toasts.length} Notifications Queued
              </span>
            </span>
            <button
              onClick={dismissAll}
              className="text-[11px] font-mono text-[#fea082] hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}

        {/* Individual Toast Cards */}
        {toasts.map((toast) => {
          const typeConfig = getTypeConfig(toast.type);
          const Icon = typeConfig.icon;

          return (
            <div
              key={toast.id}
              onMouseEnter={() => handleMouseEnter(toast.id)}
              onMouseLeave={() => handleMouseLeave(toast.id, toast.durationMs)}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-zinc-950/90 border ${typeConfig.border} backdrop-blur-2xl shadow-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 hover:translate-y-[-2px]`}
            >
              {/* Top Glowing Ambient Pill */}
              <div
                className={`absolute top-0 left-0 right-0 h-[2px] ${typeConfig.glowBar}`}
              />

              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-xl ${typeConfig.iconBg} border ${typeConfig.iconBorder} flex items-center justify-center shrink-0 mt-0.5`}
                >
                  <Icon className={`w-4 h-4 ${typeConfig.iconColor}`} />
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  {toast.title && (
                    <h4 className="text-xs font-medium text-white tracking-wide mb-0.5">
                      {toast.title}
                    </h4>
                  )}
                  <p className="text-xs text-zinc-300 font-light leading-relaxed break-words">
                    {toast.message}
                  </p>

                  {toast.action && (
                    <button
                      onClick={() => {
                        toast.action?.onClick();
                        dismissToast(toast.id);
                      }}
                      className="mt-2 text-[11px] font-mono text-[#fea082] hover:text-white underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Smooth Progress Shrink Bar */}
              {toast.durationMs > 0 && hoveredId !== toast.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white/5">
                  <div
                    className={`h-full ${typeConfig.progressBar}`}
                    style={{
                      animation: `shrinkWidth ${toast.durationMs}ms linear forwards`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// Hook to access toast methods anywhere in the app
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return context;
}

function getTypeConfig(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle2,
        iconBg: 'bg-emerald-500/10',
        iconBorder: 'border-emerald-500/30',
        iconColor: 'text-emerald-400',
        border: 'border-emerald-500/25',
        glowBar: 'bg-emerald-400',
        progressBar: 'bg-emerald-400/80',
      };
    case 'error':
      return {
        icon: AlertCircle,
        iconBg: 'bg-rose-500/10',
        iconBorder: 'border-rose-500/30',
        iconColor: 'text-rose-400',
        border: 'border-rose-500/25',
        glowBar: 'bg-rose-500',
        progressBar: 'bg-rose-500/80',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        iconBg: 'bg-amber-500/10',
        iconBorder: 'border-amber-500/30',
        iconColor: 'text-amber-400',
        border: 'border-amber-500/25',
        glowBar: 'bg-amber-400',
        progressBar: 'bg-amber-400/80',
      };
    case 'celestial':
      return {
        icon: Sparkles,
        iconBg: 'bg-[#fea082]/10',
        iconBorder: 'border-[#fea082]/40',
        iconColor: 'text-[#fea082]',
        border: 'border-[#fea082]/30',
        glowBar: 'bg-[#fea082]',
        progressBar: 'bg-[#fea082]/80',
      };
    case 'info':
    default:
      return {
        icon: Info,
        iconBg: 'bg-sky-500/10',
        iconBorder: 'border-sky-500/30',
        iconColor: 'text-sky-400',
        border: 'border-sky-500/25',
        glowBar: 'bg-sky-400',
        progressBar: 'bg-sky-400/80',
      };
  }
}
