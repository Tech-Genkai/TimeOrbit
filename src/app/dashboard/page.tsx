'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Key,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Code2,
  ExternalLink,
  RefreshCw,
  Activity,
  BarChart3,
  TrendingUp,
  Gauge,
} from 'lucide-react';
import { IApiKey, IUser } from '@/types';
import { useToast } from '@/context/ToastContext';

interface DashboardStats {
  totalKeys: number;
  approvedKeys: number;
  pendingKeys: number;
  totalRequests: number;
}

interface AnalyticsSummary {
  totalRequests: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  successRate: number;
}

interface RequestOverTime {
  date: string;
  count: number;
  avgLatency: number;
  avgResponseTime?: number;
}

interface EndpointStat {
  endpoint: string;
  count: number;
  percentage: number;
  avgResponseTimeMs?: number;
}

interface StatusStat {
  status: number;
  statusCode: number;
  count: number;
  percentage: number;
}

interface RecentLogItem {
  id: string;
  _id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string;
  createdAt: string;
}

interface AnalyticsData {
  success: boolean;
  scope: string;
  range: string;
  summary: AnalyticsSummary;
  requestsOverTime: RequestOverTime[];
  endpointBreakdown: EndpointStat[];
  statusDistribution: StatusStat[];
  recentLogs: RecentLogItem[];
}

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<IUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [keys, setKeys] = useState<IApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Telemetry state
  const [analyticsRange, setAnalyticsRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Request Key Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [useCase, setUseCase] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reveal Key Modal
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (!res.ok || !data.user) {
        router.push('/login');
        return;
      }

      setUser(data.user);

      // Fetch user's keys
      const keysRes = await fetch('/api/keys');
      if (keysRes.ok) {
        const kData = await keysRes.json();
        setKeys(kData.keys || []);
        if (kData.stats) {
          setStats(kData.stats);
        }
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadAnalytics = useCallback(async (range: '24h' | '7d' | '30d') => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`/api/analytics?scope=me&range=${range}`);
      if (res.ok) {
        const data = await res.json();
        if (data.range === analyticsRange) {
          setAnalyticsData(data);
        }
      }
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsRange]);

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
    });
  }, [loadData]);

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();

    async function fetchUserTelemetry() {
      try {
        setAnalyticsLoading(true);
        const res = await fetch(`/api/analytics?scope=me&range=${analyticsRange}`, {
          signal: controller.signal,
        });
        if (res.ok && isCurrent) {
          const data = await res.json();
          if (data.range === analyticsRange) {
            setAnalyticsData(data);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('User telemetry load error:', err);
      } finally {
        if (isCurrent) {
          setAnalyticsLoading(false);
        }
      }
    }

    queueMicrotask(() => {
      fetchUserTelemetry();
    });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [analyticsRange]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName, useCase }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to request key');
        return;
      }

      // Close request modal and open reveal modal
      setIsModalOpen(false);
      setKeyName('');
      setUseCase('');
      setRevealedKey(data.rawKey);

      if (data.key?.status === 'approved') {
        toast.success('API Key generated and activated immediately.', 'Key Active');
      } else {
        toast.info('API Key request submitted for Administrator approval.', 'Pending Review');
      }

      // Reload keys list
      loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke and delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys(keys.filter((k) => k._id !== id));
        toast.warning('API key was revoked and purged from telemetry records.', 'Key Revoked');
        loadData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.celestial('API key copied to clipboard. Keep it secret!', 'Copied');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-[#fea082] rounded-full animate-spin" />
          <p className="text-xs font-light tracking-[0.2em] uppercase text-zinc-400">Loading Developer Profile...</p>
        </div>
      </div>
    );
  }

  const activeKey = keys.find((k) => k.status === 'approved');

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* 1. User Profile Header Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-black/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-lg font-mono text-[#fea082] shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-light tracking-[0.2em] uppercase text-white">{user?.name}</h1>
                {user?.role === 'admin' ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/10 text-[#fea082] border border-[#fea082]/30">
                    <Shield className="w-3 h-3 text-[#fea082]" />
                    Super Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/10 text-[#38bdf8] border border-[#38bdf8]/30">
                    <Sparkles className="w-3 h-3 text-[#38bdf8]" />
                    Developer
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-1">{user?.email}</p>
              <p className="text-[11px] text-zinc-500 font-light mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-500" />
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-light tracking-wider uppercase text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-[#fea082]" />
                <span>Admin Panel</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium tracking-wider uppercase bg-[#fea082] text-black hover:bg-[#ffb69f] transition-all cursor-pointer shadow-lg shadow-[#fea082]/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Request API Key</span>
            </button>
          </div>
        </div>

        {/* 2. Profile Telemetry Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10">
          <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-light tracking-wider uppercase text-zinc-400">Total Keys Requested</span>
            <div className="text-xl font-light font-mono text-white mt-1">{stats?.totalKeys ?? keys.length}</div>
          </div>

          <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-light tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Active & Approved
            </span>
            <div className="text-xl font-light font-mono text-white mt-1">
              {stats?.approvedKeys ?? keys.filter((k) => k.status === 'approved').length}
            </div>
          </div>

          <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-light tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#fea082]" />
              Pending Approval
            </span>
            <div className="text-xl font-light font-mono text-[#fea082] mt-1">
              {stats?.pendingKeys ?? keys.filter((k) => k.status === 'pending').length}
            </div>
          </div>

          <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-light tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
              <Code2 className="w-3 h-3 text-[#38bdf8]" />
              Total API Requests
            </span>
            <div className="text-xl font-light font-mono text-white mt-1">{stats?.totalRequests ?? 0}</div>
          </div>
        </div>
      </div>

      {/* 2.5 API Telemetry & Analytics Hub */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-light tracking-[0.25em] uppercase text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#fea082]" />
              <span>API Telemetry & Performance Hub</span>
            </h2>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Real-time usage telemetry, response latency distributions, and endpoint traffic breakdown.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 p-1 bg-black/60 rounded-xl border border-white/10">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAnalyticsRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-light tracking-wider uppercase transition-all cursor-pointer ${
                    analyticsRange === r
                      ? 'bg-white/15 text-white border border-white/25 font-medium shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => loadAnalytics(analyticsRange)}
              disabled={analyticsLoading}
              title="Refresh telemetry"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-light tracking-wider uppercase text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin text-[#fea082]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl p-4 border border-white/10 relative overflow-hidden bg-black/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">Period Requests</span>
              <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-light font-mono text-white">
              {analyticsData?.summary.totalRequests ?? 0}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">Window: {analyticsRange}</div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-white/10 relative overflow-hidden bg-black/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">Average Latency</span>
              <Gauge className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-light font-mono text-white">
              {analyticsData?.summary.avgResponseTimeMs ?? 0} <span className="text-xs font-light text-zinc-400 font-sans">ms</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              Min: {analyticsData?.summary.minResponseTimeMs ?? 0}ms · Max: {analyticsData?.summary.maxResponseTimeMs ?? 0}ms
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-white/10 relative overflow-hidden bg-black/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">Success Rate</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-light font-mono text-emerald-400">
              {analyticsData?.summary.successRate ?? 0}%
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">HTTP 2xx & 3xx status</div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-white/10 relative overflow-hidden bg-black/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">Active Endpoints</span>
              <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-light font-mono text-white">
              {analyticsData?.endpointBreakdown.length ?? 0}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">Queried routes</div>
          </div>
        </div>

        {/* Visual Charts & Breakdown */}
        {analyticsData && analyticsData.summary.totalRequests > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Requests Over Time Bar Chart */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4 bg-black/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-[#fea082]" />
                    <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">Requests Over Time</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Daily Volume</span>
                </div>

                <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-white/10 overflow-x-auto">
                  {analyticsData.requestsOverTime.map((item) => {
                    const maxCount = Math.max(...analyticsData.requestsOverTime.map((r) => r.count), 1);
                    const heightPct = Math.max(14, Math.round((item.count / maxCount) * 100));

                    return (
                      <div
                        key={item.date}
                        className="flex-1 min-w-[2.5rem] flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black/95 border border-white/20 rounded-lg px-2.5 py-1 text-[10px] text-white whitespace-nowrap pointer-events-none z-20 shadow-xl font-mono">
                          <div>Date: {item.date}</div>
                          <div>Requests: {item.count}</div>
                          <div>Avg: {item.avgLatency}ms</div>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[2rem] rounded-t bg-gradient-to-t from-white/10 via-white/25 to-[#fea082] group-hover:brightness-125 transition-all"
                        />
                        <span className="text-[9px] text-zinc-500 font-mono mt-1">
                          {item.date && item.date.length > 5 ? item.date.slice(5) : (item.date || 'N/A')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Endpoint Breakdown & Status Distribution */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4 bg-black/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#fea082]" />
                    <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">Endpoints & Status Distribution</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Traffic Mix</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-light tracking-wider uppercase text-zinc-400">Endpoint Breakdown</span>
                    <div className="space-y-2 mt-2">
                      {analyticsData.endpointBreakdown.map((ep) => (
                        <div key={ep.endpoint} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-zinc-300">{ep.endpoint}</span>
                            <span className="text-zinc-500 font-mono text-[11px]">
                              {ep.count} reqs ({ep.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, ep.percentage)}%` }}
                              className="h-full bg-gradient-to-r from-zinc-600 to-[#fea082] rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10">
                    <span className="text-[10px] font-light tracking-wider uppercase text-zinc-400">HTTP Status Distribution</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {analyticsData.statusDistribution.map((st) => {
                        const isSuccess = st.statusCode >= 200 && st.statusCode < 400;
                        const isClientError = st.statusCode >= 400 && st.statusCode < 500;
                        return (
                          <div
                            key={st.statusCode}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                              isSuccess
                                ? 'bg-white/5 border-emerald-500/30 text-emerald-400'
                                : isClientError
                                ? 'bg-white/5 border-[#fea082]/30 text-[#fea082]'
                                : 'bg-white/5 border-rose-500/30 text-rose-400'
                            }`}
                          >
                            <span className="font-semibold">{st.statusCode}</span>
                            <span className="text-zinc-500">
                              ({st.percentage}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent API Logs Table */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3 bg-black/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#fea082]" />
                  <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">Recent API Requests</h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Last 10 queries</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-500 text-[10px] font-light uppercase tracking-wider">
                      <th className="pb-2">Endpoint</th>
                      <th className="pb-2">Method</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Latency</th>
                      <th className="pb-2 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {analyticsData.recentLogs.map((log) => {
                      const isSuccess = log.statusCode >= 200 && log.statusCode < 400;
                      return (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 text-zinc-300">{log.endpoint}</td>
                          <td className="py-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 text-[10px]">
                              {log.method}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                isSuccess
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-950/40 text-[#fea082] border border-[#fea082]/20'
                              }`}
                            >
                              {log.statusCode}
                            </span>
                          </td>
                          <td className="py-2.5 text-zinc-400">{log.responseTimeMs} ms</td>
                          <td className="py-2.5 text-right text-zinc-500">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-8 text-center space-y-3 border border-dashed border-white/10 bg-black/40">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/15 text-[#fea082] flex items-center justify-center mx-auto">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">No Telemetry Recorded in this Window</h3>
            <p className="text-xs text-zinc-400 font-light max-w-md mx-auto">
              Execute a request with your approved API key (via curl or the API Docs sandbox) to see live response latency, traffic trends, and endpoint breakdowns.
            </p>
          </div>
        )}
      </div>

      {/* 3. API Key Management Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-light tracking-[0.25em] uppercase text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-[#fea082]" />
              <span>API Key Approvals & Credentials</span>
            </h2>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Manage your credentials and track real-time admin approval status for the TimeOrbit REST API.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Refresh status"
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-light tracking-wider uppercase text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Approval Flow Info Notice */}
        <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#fea082] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-300 leading-relaxed font-light">
            <span className="font-normal text-white uppercase tracking-wider text-[11px]">Approval Policy: </span>
            When you request an API key, it enters <strong className="text-[#fea082] font-mono">Pending Review</strong>. The platform admin reviews your intended use case and assigns a standard quota of 60 req/min (or customized higher-tier limits). Once approved, your key activates automatically!
          </div>
        </div>

        {/* Keys List */}
        {keys.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center space-y-4 border border-dashed border-white/15 bg-black/40">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/15 text-[#fea082] flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">No API Keys Requested Yet</h3>
              <p className="text-xs text-zinc-400 font-light max-w-md mx-auto mt-1">
                You haven&apos;t requested any API keys. Request your first key to start consuming the TimeOrbit REST API in your applications.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium tracking-wider uppercase bg-[#fea082] text-black hover:bg-[#ffb69f] transition-all cursor-pointer shadow-lg shadow-[#fea082]/10"
            >
              <Plus className="w-4 h-4" />
              <span>Request First API Key</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {keys.map((key) => {
              const isApproved = key.status === 'approved';
              const isPending = key.status === 'pending';
              const isRejected = key.status === 'rejected';
              const isRevoked = key.status === 'revoked';

              return (
                <div
                  key={key._id}
                  className="glass-panel rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all bg-black/60"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info & Status */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-light tracking-wider uppercase text-white text-sm">{key.name}</span>

                        {/* Approval Status Badge */}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/5 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Approved & Active
                          </span>
                        )}

                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/5 text-[#fea082] border border-[#fea082]/30">
                            <Clock className="w-3 h-3" />
                            Pending Admin Approval
                          </span>
                        )}

                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/5 text-zinc-400 border border-white/15">
                            <XCircle className="w-3 h-3" />
                            Request Declined
                          </span>
                        )}

                        {isRevoked && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/5 text-zinc-500 border border-white/10">
                            Revoked
                          </span>
                        )}

                        {/* Rate Limit Pill */}
                        {isApproved && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-black border border-white/10 text-zinc-400 font-mono">
                            ⚡ {key.rateLimit} req/min
                          </span>
                        )}
                      </div>

                      {/* Use Case Description */}
                      {key.useCase && (
                        <p className="text-xs text-zinc-400 font-light italic">
                          Project use case: &quot;{key.useCase}&quot;
                        </p>
                      )}

                      {/* Rejection Note */}
                      {isRejected && key.rejectionReason && (
                        <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2 font-light">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-normal text-white uppercase text-[10px] block">Admin feedback:</span> {key.rejectionReason}
                          </div>
                        </div>
                      )}

                      {/* Pending Helper Notice */}
                      {isPending && (
                        <p className="text-[11px] text-[#fea082] flex items-center gap-1.5 font-light">
                          <Clock className="w-3 h-3" />
                          Admin has been notified. This key will activate immediately upon review.
                        </p>
                      )}

                      {/* Timestamps */}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-500 font-mono pt-1">
                        <span>Requested: {new Date(key.createdAt).toLocaleDateString()}</span>
                        {key.approvedAt && (
                          <span className="text-emerald-400">
                            Approved: {new Date(key.approvedAt).toLocaleDateString()}
                          </span>
                        )}
                        {key.lastUsedAt && (
                          <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Key Token & Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black border border-white/10 font-mono text-xs text-zinc-300">
                        <span>{key.keyPrefix}</span>
                        <span className="text-zinc-600">...</span>
                        <span className="text-white font-medium">{key.lastFour}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteKey(key._id)}
                        disabled={deletingId === key._id}
                        className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition-all cursor-pointer"
                        title="Delete Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Quick API Integration Snippet */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 bg-black/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white text-xs font-light tracking-[0.2em] uppercase">
            <Code2 className="w-4 h-4 text-[#fea082]" />
            <span>How to use your API Key</span>
          </div>

          <Link
            href="/docs"
            className="flex items-center gap-1 text-[11px] text-[#fea082] hover:text-white font-light uppercase tracking-wider transition-colors"
          >
            <span>Full API Docs & Sandbox</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <p className="text-xs text-zinc-400 font-light">
          Once your key is approved, include it in your HTTP request headers as{' '}
          <code className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[11px]">x-api-key</code> or{' '}
          <code className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[11px]">
            Authorization: Bearer &lt;key&gt;
          </code>
          .
        </p>

        {/* Code Block */}
        <div className="relative rounded-xl bg-black p-4 font-mono text-xs text-zinc-300 border border-white/10 overflow-x-auto">
          <pre>{`curl -X GET "${typeof window !== 'undefined' ? window.location.origin : 'https://timeorbit-chi.vercel.app'}/api/v1/compare?from=Tokyo&to=New_York" \\
  -H "x-api-key: ${activeKey ? activeKey.keyPrefix + '...' + activeKey.lastFour : 'to_live_YOUR_APPROVED_KEY'}"`}</pre>
        </div>
      </div>

      {/* Modal 1: Request New API Key */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-white/15 space-y-5 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/15 text-[#fea082] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">Request API Key</h3>
                  <p className="text-[10px] text-zinc-500 font-light uppercase tracking-wider">Requires TimeOrbit admin approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-light">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-light tracking-wider uppercase text-zinc-300 mb-1.5">
                  Key Name / Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Next.js Travel App or Global Scheduler"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-light focus:border-[#fea082] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-light tracking-wider uppercase text-zinc-300 mb-1.5">
                  Project Description / Use Case (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what you are building. This assists the admin in calibrating your quota tier."
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-light focus:border-[#fea082] outline-none resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 font-light leading-relaxed">
                Standard developer keys default to 60 requests/minute. High-volume enterprise integrations may request elevated limits.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-light uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl text-xs font-medium uppercase tracking-wider bg-[#fea082] text-black hover:bg-[#ffb69f] flex items-center gap-2 cursor-pointer"
                >
                  {creating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: One-Time Plaintext Key Reveal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-white/15 space-y-6 shadow-2xl bg-zinc-950">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/15 text-[#fea082] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">Your New API Key</h3>
                <p className="text-[10px] text-[#fea082] font-mono uppercase tracking-wider">Request submitted & key generated</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black border border-white/10 text-xs text-zinc-300 leading-relaxed space-y-1 font-light">
              <div className="font-normal text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-[#fea082]" />
                <span>Save this secret key immediately</span>
              </div>
              <p className="text-zinc-400">
                For security reasons, plaintext keys are never stored on the server and cannot be viewed again once you dismiss this dialog.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-light uppercase tracking-wider text-zinc-400 mb-1.5">
                Plaintext Secret Key
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black border border-white/15">
                <code className="text-xs text-white font-mono flex-1 break-all select-all">
                  {revealedKey}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(revealedKey)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-light uppercase tracking-wider transition-all cursor-pointer ${
                    copiedKey
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/10 text-zinc-300 hover:text-white border border-white/15'
                  }`}
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 font-light space-y-1">
              <span className="font-normal uppercase tracking-wider text-[10px] text-zinc-300 block">Review Notice:</span>
              <p>
                Your key has been submitted for admin review. Once approved, it will activate automatically to query all TimeOrbit REST API endpoints.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRevealedKey(null)}
                className="px-6 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider bg-[#fea082] text-black hover:bg-[#ffb69f] cursor-pointer"
              >
                I Have Saved My Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
