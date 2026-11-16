'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Download,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  X,
  AlertCircle,
  CalendarDays,
  ArrowUpRight,
  Bell,
} from 'lucide-react';
import {
  calculateAnniversaryMilestone,
  calculateBirthdayMilestone,
  getDaysUntil,
  generateCalendarEventIcs,
  getAstronomicalEvents,
  getHolidaysAndFestivals,
} from '@/lib/timeEngine';
import { CalendarEventType, ICalendarEvent } from '@/types';
import { useToast } from '@/context/ToastContext';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [events, setEvents] = useState<ICalendarEvent[]>([]);
  const [filterType, setFilterType] = useState<CalendarEventType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for creating a new event
  const [formType, setFormType] = useState<CalendarEventType>('birthday');
  const [formTitle, setFormTitle] = useState('');
  const [formPersonName, setFormPersonName] = useState('');
  const [formDate, setFormDate] = useState(selectedDateStr);
  const [formTime, setFormTime] = useState('');
  const [formYearStarted, setFormYearStarted] = useState<string>('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Load user's real events from localStorage on mount (no dummy data)
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem('timeorbit_calendar_events_v3');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((e: ICalendarEvent) => !e.id.startsWith('init-'));
            setEvents(cleaned);
            return;
          }
        }
        // Clean up any legacy cache containing dummy events
        const legacyStored = localStorage.getItem('timeorbit_calendar_events_v2');
        if (legacyStored) {
          const parsed = JSON.parse(legacyStored);
          if (Array.isArray(parsed)) {
            const userOnly = parsed.filter((e: ICalendarEvent) => !e.id.startsWith('init-'));
            setEvents(userOnly);
            localStorage.setItem('timeorbit_calendar_events_v3', JSON.stringify(userOnly));
            localStorage.removeItem('timeorbit_calendar_events_v2');
            return;
          }
        }
        setEvents([]);
      } catch {
        setEvents([]);
      }
    });
  }, []);

  // Save to localStorage whenever user modifies events
  const saveEvents = (updated: ICalendarEvent[]) => {
    setEvents(updated);
    try {
      localStorage.setItem('timeorbit_calendar_events_v3', JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
  };

  // Combine user events with auto-generated celestial and holiday/festival events for current year
  const allCombinedEvents = useMemo(() => {
    const astroEvents = getAstronomicalEvents(currentDate.getFullYear());
    const holidayEvents = getHolidaysAndFestivals(currentDate.getFullYear());
    return [...events, ...astroEvents, ...holidayEvents];
  }, [events, currentDate]);

  // Calendar month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleTodayJump = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  };

  // Month grid days computation
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNumber: d, isCurrentMonth: true });
    }

    // Next month padding to fill complete grid of 35 or 42 cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }

    return cells;
  }, [currentDate]);

  // Event dots lookup by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, ICalendarEvent[]> = {};
    for (const ev of allCombinedEvents) {
      // For recurring events (birthdays/anniversaries), match MM-DD
      const [, m, d] = ev.date.split('-');
      const recurringKey = `${m}-${d}`;

      // Also map exact date
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);

      // If recurring, populate matching day in the active month
      if (ev.type === 'birthday' || ev.type === 'anniversary') {
        const activeMonthKey = `${currentDate.getFullYear()}-${recurringKey}`;
        if (activeMonthKey !== ev.date) {
          if (!map[activeMonthKey]) map[activeMonthKey] = [];
          map[activeMonthKey].push(ev);
        }
      }
    }
    return map;
  }, [allCombinedEvents, currentDate]);

  // Merged: Upcoming milestones + live search & category filtering
  const mergedSearchUpcomingEvents = useMemo(() => {
    const list = allCombinedEvents
      .map((ev) => {
        const isRecurring = ev.type === 'birthday' || ev.type === 'anniversary';
        const countdown = getDaysUntil(ev.date, isRecurring, new Date());
        return {
          ...ev,
          countdown,
        };
      })
      .filter((ev) => {
        const matchesType = filterType === 'all' || ev.type === filterType;
        const matchesSearch =
          !searchQuery.trim() ||
          ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ev.personName && ev.personName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          ev.date.includes(searchQuery.trim());
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (a.countdown.daysRemaining >= 0 && b.countdown.daysRemaining >= 0) {
          return a.countdown.daysRemaining - b.countdown.daysRemaining;
        }
        return b.countdown.daysRemaining - a.countdown.daysRemaining;
      });

    return searchQuery.trim() || filterType !== 'all'
      ? list.slice(0, 25)
      : list.filter((e) => e.countdown.daysRemaining >= 0).slice(0, 8);
  }, [allCombinedEvents, filterType, searchQuery]);

  // Quick Navigate to any event date across months and years
  const handleQuickNavigate = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const [yearStr, monthStr] = dateStr.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    setCurrentDate(new Date(y, m, 1));
  };

  // Selected date events for Focused Date card
  const selectedDateEvents = useMemo(() => {
    return eventsByDate[selectedDateStr] || [];
  }, [eventsByDate, selectedDateStr]);

  // Handle Event Creation
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please enter an event title.');
      return;
    }
    if (!formDate) {
      setFormError('Please select a valid date.');
      return;
    }

    const newEvent: ICalendarEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: formTitle.trim(),
      type: formType,
      date: formDate,
      time: formTime || undefined,
      personName: formPersonName.trim() || undefined,
      yearStarted: formYearStarted ? parseInt(formYearStarted, 10) : undefined,
      priority: formType === 'reminder' ? formPriority : undefined,
      isCompleted: formType === 'reminder' ? false : undefined,
      description: formDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    saveEvents([newEvent, ...events]);
    setIsModalOpen(false);

    toast.success(`"${newEvent.title}" was scheduled on ${newEvent.date}.`, 'Event Created');

    // Reset Form
    setFormTitle('');
    setFormPersonName('');
    setFormDescription('');
    setFormYearStarted('');
    setFormTime('');
    setFormError(null);
  };

  // Toggle Reminder Completed
  const handleToggleComplete = (id: string) => {
    const updated = events.map((ev) => {
      if (ev.id === id) {
        const nextState = !ev.isCompleted;
        if (nextState) {
          toast.celestial(`Reminder marked complete: "${ev.title}"`, 'Done');
        }
        return { ...ev, isCompleted: nextState };
      }
      return ev;
    });
    saveEvents(updated);
  };

  // Delete Event with Undo Toast
  const handleDeleteEvent = (id: string) => {
    const target = events.find((ev) => ev.id === id);
    const updated = events.filter((ev) => ev.id !== id);
    saveEvents(updated);

    if (target) {
      toast.showToast({
        title: 'Event Deleted',
        message: `"${target.title}" was removed from the calendar.`,
        type: 'warning',
        durationMs: 6000,
        action: {
          label: 'Undo',
          onClick: () => {
            saveEvents([target, ...updated]);
            toast.success(`Restored "${target.title}" to calendar.`, 'Restored');
          },
        },
      });
    }
  };

  // Download .ics for single event
  const handleDownloadIcs = (event: ICalendarEvent) => {
    const { icsContent, fileName } = generateCalendarEventIcs(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.celestial(`iCalendar exported: ${fileName}`, 'Downloaded');
  };

  // Export all events to a combined .ics calendar bundle
  const handleExportAllIcs = () => {
    if (events.length === 0) {
      toast.info('No custom events to export.', 'Empty Calendar');
      return;
    }
    const bodyLines = events.map((ev) => {
      const { icsContent } = generateCalendarEventIcs(ev);
      // Extract VEVENT block
      const startIdx = icsContent.indexOf('BEGIN:VEVENT');
      const endIdx = icsContent.indexOf('END:VEVENT') + 'END:VEVENT'.length;
      return icsContent.substring(startIdx, endIdx);
    });

    const fullIcs = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TimeOrbit//Chrono Calendar Master Export//EN',
      'CALSCALE:GREGORIAN',
      ...bodyLines,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([fullIcs], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `timeorbit-all-events-${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Successfully exported batch of ${events.length} milestones.`, 'Batch Export Ready');
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 p-4 sm:p-8 space-y-8 selection:bg-[#fea082]/30">
      {/* Top Header & Quick Action Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-[#fea082] shadow-[0_0_20px_rgba(254,160,130,0.15)]">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-light tracking-[0.2em] uppercase text-white flex items-center gap-2">
              Chrono Calendar & Milestones
            </h1>
            <p className="text-xs text-zinc-400 font-mono tracking-wider">
              Birthdays • Anniversaries • Priority Reminders • Celestial Solstices
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportAllIcs}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono tracking-wider uppercase bg-white/5 hover:bg-white/15 border border-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Export all events into an iCalendar (.ics) bundle"
          >
            <Download className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="hidden sm:inline">Export .ICS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormDate(selectedDateStr);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase glow-btn cursor-pointer shadow-lg active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Side Month Grid + Right Side Detail Deck */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: INTERACTIVE MONTH CALENDAR (7 cols)         */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl bg-black/75 border border-white/15 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl space-y-4">
            {/* Month & Year Navigation Deck */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-light font-mono tracking-wider text-white">
                  {monthLabel}
                </h2>
                <button
                  type="button"
                  onClick={handleTodayJump}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs uppercase tracking-wider text-zinc-500 pb-1">
              {WEEKDAY_NAMES.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {monthGrid.map((cell) => {
                const dayEvents = eventsByDate[cell.dateStr] || [];
                const isSelected = cell.dateStr === selectedDateStr;
                const isToday = cell.dateStr === todayStr;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`min-h-[64px] sm:min-h-[76px] p-1.5 rounded-2xl flex flex-col justify-between items-start transition-all cursor-pointer text-left relative group ${
                      isSelected
                        ? 'bg-[#fea082]/20 border-2 border-[#fea082] shadow-[0_0_15px_rgba(254,160,130,0.25)]'
                        : isToday
                        ? 'bg-white/10 border border-emerald-400/50'
                        : cell.isCurrentMonth
                        ? 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/25'
                        : 'bg-transparent border border-white/5 text-zinc-600 hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-mono font-medium ${
                          isToday
                            ? 'text-emerald-400 font-bold'
                            : isSelected
                            ? 'text-white'
                            : cell.isCurrentMonth
                            ? 'text-zinc-300'
                            : 'text-zinc-600'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>

                    {/* Event Badges / Dots */}
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1 w-full overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => {
                          let dotColor = 'bg-[#38bdf8]';
                          if (ev.type === 'holiday') dotColor = 'bg-amber-300';
                          if (ev.type === 'birthday') dotColor = 'bg-rose-400';
                          if (ev.type === 'anniversary') dotColor = 'bg-[#fea082]';
                          if (ev.type === 'celestial') dotColor = 'bg-emerald-400';

                          return (
                            <span
                              key={ev.id}
                              className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`}
                              title={ev.title}
                            />
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] font-mono text-zinc-400">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Category Color Legend */}
            <div className="flex flex-wrap items-center justify-around gap-2 pt-3 border-t border-white/10 text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-300" /> Holiday / Festival
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Birthday
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#fea082]" /> Anniversary
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Reminder
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Celestial Event
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: SELECTED DAY EVENTS & UPCOMING TICKER      */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Selected Date Header Deck */}
          <div className="rounded-3xl bg-black/80 border border-white/15 p-5 backdrop-blur-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                  Focused Date
                </span>
                <h3 className="text-base sm:text-lg font-mono font-light text-white">
                  {selectedDateStr} {selectedDateStr === todayStr && <span className="text-emerald-400 text-xs">(Today)</span>}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormDate(selectedDateStr);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add To Day</span>
              </button>
            </div>

            {/* List of Events on Selected Day */}
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 font-mono text-xs space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto text-zinc-600" />
                <p>No events scheduled for {selectedDateStr}.</p>
                <button
                  type="button"
                  onClick={() => {
                    setFormDate(selectedDateStr);
                    setIsModalOpen(true);
                  }}
                  className="text-xs text-[#fea082] hover:underline"
                >
                  Create an event for this date →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((ev) => {
                  const isRecurring = ev.type === 'birthday' || ev.type === 'anniversary';
                  const countdown = getDaysUntil(ev.date, isRecurring, new Date());
                  const currentYear = new Date().getFullYear();

                  let subtitle = '';
                  if (ev.type === 'birthday' && ev.yearStarted) {
                    const bday = calculateBirthdayMilestone(ev.yearStarted, currentYear);
                    subtitle = `${bday.formattedLabel} • Born ${ev.yearStarted}`;
                  } else if (ev.type === 'anniversary' && ev.yearStarted) {
                    const anni = calculateAnniversaryMilestone(ev.yearStarted, currentYear);
                    subtitle = anni.formattedLabel;
                  } else if (ev.type === 'reminder') {
                    subtitle = `${ev.time ? `At ${ev.time}` : 'All Day'} • Priority: ${ev.priority?.toUpperCase()}`;
                  }

                  return (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {ev.type === 'reminder' ? (
                            <button
                              type="button"
                              onClick={() => handleToggleComplete(ev.id)}
                              className="mt-0.5 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                              title={ev.isCompleted ? 'Mark pending' : 'Mark completed'}
                            >
                              {ev.isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                          ) : ev.type === 'birthday' ? (
                            <Gift className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                          ) : ev.type === 'anniversary' ? (
                            <Heart className="w-4 h-4 text-[#fea082] mt-0.5 shrink-0" />
                          ) : ev.type === 'holiday' ? (
                            <Sparkles className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          )}

                          <div className="min-w-0">
                            <h4
                              className={`text-sm font-medium tracking-wide text-white truncate ${
                                ev.isCompleted ? 'line-through text-zinc-500' : ''
                              }`}
                            >
                              {ev.title}
                            </h4>
                            {subtitle && (
                              <p className="text-[11px] font-mono text-[#fea082] tracking-wider">
                                {subtitle}
                              </p>
                            )}
                            {ev.description && (
                              <p className="text-xs text-zinc-400 mt-1 font-light leading-relaxed">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadIcs(ev)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Download .ics file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!ev.id.startsWith('astro-') && !ev.id.startsWith('fest-') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono text-zinc-500">
                        <span>Countdown: <strong className="text-white">{countdown.formatted}</strong></span>
                        <span className="uppercase">{ev.type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* MERGED: UPCOMING MILESTONES & QUICK SEARCH WITH DIRECT NAV */}
          {/* ========================================================= */}
          <div className="rounded-3xl bg-black/75 border border-white/15 p-5 backdrop-blur-2xl shadow-2xl space-y-3.5">
            {/* Header: Title + Result Count */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#fea082]" />
                <span>Upcoming Milestones & Search</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                {mergedSearchUpcomingEvents.length} Events
              </span>
            </div>

            {/* Merged Search Input Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search events, holidays, festivals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#fea082] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'holiday', label: '🎉 Holidays' },
                  { id: 'birthday', label: '🎂 Birthdays' },
                  { id: 'anniversary', label: '💍 Anniversaries' },
                  { id: 'reminder', label: '🔔 Reminders' },
                  { id: 'celestial', label: '🚀 Celestial' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono tracking-wider transition-all cursor-pointer ${
                    filterType === tab.id
                      ? 'bg-[#fea082]/20 border border-[#fea082] text-white font-medium shadow-[0_0_10px_rgba(254,160,130,0.2)]'
                      : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Navigation Tip */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 px-0.5 pt-1">
              <span>{searchQuery.trim() ? 'Matching Results' : 'Nearest Milestones'}</span>
              <span className="text-[#38bdf8] flex items-center gap-1">
                <span>Click event to jump to date</span>
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>

            {/* Quick Navigate Event List */}
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {mergedSearchUpcomingEvents.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                  No events found matching your criteria.
                </div>
              ) : (
                mergedSearchUpcomingEvents.map((ev) => (
                  <div
                    key={`quick-nav-${ev.id}`}
                    onClick={() => handleQuickNavigate(ev.date)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      selectedDateStr === ev.date
                        ? 'bg-[#fea082]/15 border-[#fea082] shadow-[0_0_15px_rgba(254,160,130,0.2)]'
                        : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                    title={`Click to jump to ${ev.date} on the calendar`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {ev.type === 'birthday' ? (
                        <Gift className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : ev.type === 'anniversary' ? (
                        <Heart className="w-4 h-4 text-[#fea082] shrink-0" />
                      ) : ev.type === 'holiday' ? (
                        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                      ) : ev.type === 'reminder' ? (
                        <Bell className="w-4 h-4 text-[#38bdf8] shrink-0" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate group-hover:text-[#fea082] transition-colors flex items-center gap-1.5">
                          <span className="truncate">{ev.title}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#38bdf8] text-[9px] shrink-0">
                            ↗ Jump
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          {ev.date} {ev.time ? `• ${ev.time}` : ''}
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                      {ev.countdown.formatted}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ADD NEW EVENT MODAL                                      */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-white/20 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-mono uppercase tracking-wider text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#fea082]" />
                <span>Create Calendar Milestone</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateEvent} className="space-y-4">
              {/* Event Type Switcher */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'holiday', label: '🎉 Holiday' },
                  { id: 'birthday', label: '🎂 Birthday' },
                  { id: 'anniversary', label: '💍 Anniversary' },
                  { id: 'reminder', label: '🔔 Reminder' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormType(t.id as CalendarEventType)}
                    className={`py-2 px-2 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer border ${
                      formType === t.id
                        ? 'bg-[#fea082]/20 border-[#fea082] text-white font-medium'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formType === 'holiday'
                      ? 'e.g. Festival or holiday name'
                      : formType === 'birthday'
                      ? "e.g. Birthday celebration"
                      : formType === 'anniversary'
                      ? 'e.g. Wedding Anniversary'
                      : 'e.g. Milestone task or reminder'
                  }
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#fea082]"
                />
              </div>

              {/* Person Name (for Birthday / Anniversary) */}
              {(formType === 'birthday' || formType === 'anniversary') && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    {formType === 'birthday' ? 'Person Name' : 'Couple / Partner Names'}
                  </label>
                  <input
                    type="text"
                    placeholder={formType === 'birthday' ? 'Name' : 'Partner names'}
                    value={formPersonName}
                    onChange={(e) => setFormPersonName(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#fea082]"
                  />
                </div>
              )}

              {/* Date & Starting Year Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#fea082]"
                  />
                </div>

                {formType === 'reminder' ? (
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#fea082]"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      {formType === 'birthday' ? 'Birth Year (Optional)' : 'Year Started (Optional)'}
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1998"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={formYearStarted}
                      onChange={(e) => setFormYearStarted(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#fea082]"
                    />
                  </div>
                )}
              </div>

              {/* Priority Selector for Reminders */}
              {formType === 'reminder' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Priority Level
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormPriority(p)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono tracking-wider uppercase transition-all border cursor-pointer ${
                          formPriority === p
                            ? p === 'high'
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                              : p === 'medium'
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-zinc-500'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional milestone notes or agenda..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#fea082] resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider glow-btn cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
