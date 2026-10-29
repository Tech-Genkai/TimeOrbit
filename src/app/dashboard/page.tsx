'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
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
  Zap,
  Activity,
  BarChart3,
  TrendingUp,
  Gauge,
} from 'lucide-react';
import { IApiKey, IUser } from '@/types';

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
  const [user, setUser] = useState<IUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [keys, setKeys] = useState<IApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Telemetry state
  const [analyticsRange, setAnalyticsRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Request modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [useCase, setUseCase] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reveal modal state (for newly generated plaintext key)
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Action state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (range: '24h' | '7d' | '30d') => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`/api/analytics?range=${range}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.range === range) {
          setAnalyticsData(data);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Error loading analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();

      if (!userData.user) {
        router.push('/login?redirect=/dashboard');
        return;
      }

      setUser(userData.user);
      setStats(userData.stats);

      const keysRes = await fetch('/api/keys');
      const keysData = await keysRes.json();
      if (keysData.success) {
        setKeys(keysData.keys);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
    });
  }, [loadData]);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function fetchTelemetry() {
      try {
        setAnalyticsLoading(true);
        const res = await fetch(`/api/analytics?range=${analyticsRange}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && isCurrent && data.range === analyticsRange) {
            setAnalyticsData(data);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Error loading analytics:', err);
      } finally {
        if (isCurrent) {
          setAnalyticsLoading(false);
        }
      }
    }

    queueMicrotask(() => {
      fetchTelemetry();
    });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [analyticsRange]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      setErrorMsg('Please give your API key a descriptive name');
      return;
    }

    try {
      setCreating(true);
      setErrorMsg('');

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

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

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
    setTimeout(() => setCopiedKey(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading developer profile & keys...</p>
        </div>
      </div>
    );
  }

  const activeKey = keys.find((k) => k.status === 'approved');

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* 1. User Profile Header Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#080d1e] rounded-[14px] flex items-center justify-center text-2xl font-bold text-cyan-300">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">{user?.name}</h1>
                {user?.role === 'admin' ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    Super Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Verified Developer
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-purple-200 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 transition-all shadow-lg shadow-purple-900/20"
              >
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Open Admin Approval Panel</span>
              </Link>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold glow-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Request New API Key</span>
            </button>
          </div>
        </div>

        {/* 2. Profile Telemetry Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <span className="text-xs text-gray-400 font-medium">Total Keys Requested</span>
            <div className="text-2xl font-bold text-white mt-1">{stats?.totalKeys ?? keys.length}</div>
          </div>

          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
            <span className="text-xs text-emerald-300 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active & Approved
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {stats?.approvedKeys ?? keys.filter((k) => k.status === 'approved').length}
            </div>
          </div>

          <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
            <span className="text-xs text-amber-300 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Pending Approval
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {stats?.pendingKeys ?? keys.filter((k) => k.status === 'pending').length}
            </div>
          </div>

          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
            <span className="text-xs text-purple-300 font-medium flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5" />
              Total API Requests
            </span>
            <div className="text-2xl font-bold text-purple-400 mt-1">{stats?.totalRequests ?? 0}</div>
          </div>
        </div>
      </div>

      {/* 2.5 API Telemetry & Analytics Hub */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              API Telemetry & Performance Hub
            </h2>
            <p className="text-sm text-gray-400">
              Real-time usage telemetry, response latency distributions, and endpoint traffic breakdown.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/10">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAnalyticsRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    analyticsRange === r
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={() => loadAnalytics(analyticsRange)}
              disabled={analyticsLoading}
              title="Refresh telemetry"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl p-4 border border-cyan-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Period Requests</span>
              <BarChart3 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              {analyticsData?.summary.totalRequests ?? 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Window: {analyticsRange}</div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-purple-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-300 font-medium">Average Latency</span>
              <Gauge className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-300 mt-2">
              {analyticsData?.summary.avgResponseTimeMs ?? 0} <span className="text-sm font-normal text-gray-400">ms</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Min: {analyticsData?.summary.minResponseTimeMs ?? 0}ms · Max: {analyticsData?.summary.maxResponseTimeMs ?? 0}ms
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-emerald-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-300 font-medium">Success Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">
              {analyticsData?.summary.successRate ?? 0}%
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-1">HTTP 2xx & 3xx status</div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-amber-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-300 font-medium">Active Endpoints</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-2">
              {analyticsData?.endpointBreakdown.length ?? 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Queried routes</div>
          </div>
        </div>

        {/* Visual Charts & Breakdown */}
        {analyticsData && analyticsData.summary.totalRequests > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Requests Over Time Bar Chart */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Requests Over Time</h3>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">Daily Volume</span>
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
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-cyan-500/40 rounded-lg px-2 py-1 text-[10px] text-cyan-300 whitespace-nowrap pointer-events-none z-20 shadow-xl">
                          <div>Date: {item.date}</div>
                          <div>Requests: {item.count}</div>
                          <div>Avg: {item.avgLatency}ms</div>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[2rem] rounded-t-lg bg-gradient-to-t from-cyan-600/30 via-cyan-500/60 to-cyan-400 group-hover:to-cyan-300 group-hover:shadow-lg group-hover:shadow-cyan-500/30 transition-all"
                        />
                        <span className="text-[10px] text-gray-400 font-mono mt-1">
                          {item.date && item.date.length > 5 ? item.date.slice(5) : (item.date || 'N/A')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Endpoint Breakdown & Status Distribution */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Endpoints & Status Distribution</h3>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">Traffic Mix</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-gray-400 font-medium">Endpoint Breakdown</span>
                    <div className="space-y-2 mt-2">
                      {analyticsData.endpointBreakdown.map((ep) => (
                        <div key={ep.endpoint} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-cyan-300">{ep.endpoint}</span>
                            <span className="text-gray-400">
                              {ep.count} reqs ({ep.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, ep.percentage)}%` }}
                              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10">
                    <span className="text-xs text-gray-400 font-medium">HTTP Status Distribution</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {analyticsData.statusDistribution.map((st) => {
                        const isSuccess = st.statusCode >= 200 && st.statusCode < 400;
                        const isClientError = st.statusCode >= 400 && st.statusCode < 500;
                        return (
                          <div
                            key={st.statusCode}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                              isSuccess
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : isClientError
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            <span className="font-bold">{st.statusCode}</span>
                            <span className="text-gray-400">
                              {st.count} ({st.percentage}%)
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
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Recent API Requests</h3>
                </div>
                <span className="text-xs text-gray-500 font-mono">Last 10 queries</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="pb-2 font-medium">Endpoint</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Latency</th>
                      <th className="pb-2 font-medium text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {analyticsData.recentLogs.map((log) => {
                      const isSuccess = log.statusCode >= 200 && log.statusCode < 400;
                      return (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 font-mono text-cyan-300">{log.endpoint}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                              {log.method}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                isSuccess
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {log.statusCode}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-gray-300">{log.responseTimeMs} ms</td>
                          <td className="py-2.5 text-right text-gray-500 font-mono">
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
          <div className="glass-panel rounded-2xl p-8 text-center space-y-3 border border-dashed border-white/10">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">No Telemetry Recorded in this Window</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Execute a request with your approved API key (via curl or the API Docs sandbox) to see live response latency, traffic trends, and endpoint breakdowns.
            </p>
          </div>
        )}
      </div>

      {/* 3. API Key Management Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              API Key Approvals & Credentials
            </h2>
            <p className="text-sm text-gray-400">
              Manage your credentials and track real-time admin approval status for the TimeOrbit REST API.
            </p>
          </div>

          <button
            onClick={loadData}
            title="Refresh status"
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Approval Flow Info Notice */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-transparent border border-cyan-500/20 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-300 leading-relaxed">
            <span className="font-semibold text-cyan-300">Manual Approval Process:</span> When you request a new API key,
            it is created in <strong className="text-amber-300">Pending Review</strong> status. Our administrator reviews
            your requested use case and approves it with a standard limit of 60 requests/minute (or customized high-tier
            rates). Once approved, your key activates automatically!
          </div>
        </div>

        {/* Keys List */}
        {keys.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center space-y-4 border border-dashed border-white/15">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">No API Keys Requested Yet</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto mt-1">
                You haven&apos;t requested any API keys. Request your first key to start using the TimeOrbit REST API in your projects.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold glow-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Request First API Key</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {keys.map((key) => {
              const isApproved = key.status === 'approved';
              const isPending = key.status === 'pending';
              const isRejected = key.status === 'rejected';
              const isRevoked = key.status === 'revoked';

              return (
                <div
                  key={key._id}
                  className={`glass-panel rounded-xl p-5 border transition-all ${
                    isApproved
                      ? 'border-emerald-500/30 hover:border-emerald-500/50'
                      : isPending
                      ? 'border-amber-500/30 hover:border-amber-500/50'
                      : isRejected
                      ? 'border-rose-500/30'
                      : 'border-gray-700/50'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info & Status */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-base text-white">{key.name}</span>

                        {/* Approval Status Badge */}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Approved & Active
                          </span>
                        )}

                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                            Pending Admin Approval
                          </span>
                        )}

                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" />
                            Request Declined
                          </span>
                        )}

                        {isRevoked && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            Revoked
                          </span>
                        )}

                        {/* Rate Limit Pill */}
                        {isApproved && (
                          <span className="text-xs px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 font-mono">
                            ⚡ {key.rateLimit} req/min
                          </span>
                        )}
                      </div>

                      {/* Use Case Description */}
                      {key.useCase && (
                        <p className="text-xs text-gray-400 italic">
                          Project use case: &quot;{key.useCase}&quot;
                        </p>
                      )}

                      {/* Rejection Note */}
                      {isRejected && key.rejectionReason && (
                        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Admin feedback:</span> {key.rejectionReason}
                          </div>
                        </div>
                      )}

                      {/* Pending Helper Notice */}
                      {isPending && (
                        <p className="text-xs text-amber-400/90 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Admin has been notified. This key will be active immediately upon approval.
                        </p>
                      )}

                      {/* Timestamps */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                        <span>Requested: {new Date(key.createdAt).toLocaleDateString()}</span>
                        {key.approvedAt && (
                          <span className="text-emerald-400/80">
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
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-cyan-300">
                        <span>{key.keyPrefix}</span>
                        <span className="text-gray-500">...</span>
                        <span className="text-white font-bold">{key.lastFour}</span>
                      </div>

                      <button
                        onClick={() => handleDeleteKey(key._id)}
                        disabled={deletingId === key._id}
                        className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
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
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <span>How to use your API Key</span>
          </div>

          <Link
            href="/docs"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            <span>Full API Docs & Sandbox</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Once your key is approved, include it in your HTTP request header as{' '}
          <code className="text-cyan-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">x-api-key</code> or{' '}
          <code className="text-cyan-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">
            Authorization: Bearer &lt;key&gt;
          </code>
          .
        </p>

        {/* Code Block */}
        <div className="relative rounded-xl bg-[#030611] p-4 font-mono text-xs text-gray-300 border border-white/10 overflow-x-auto">
          <pre>{`curl -X GET "${typeof window !== 'undefined' ? window.location.origin : 'https://timeorbit-chi.vercel.app'}/api/v1/compare?from=Tokyo&to=New_York" \\
  -H "x-api-key: ${activeKey ? activeKey.keyPrefix + '...' + activeKey.lastFour : 'to_live_YOUR_APPROVED_KEY'}"`}</pre>
        </div>
      </div>

      {/* Modal 1: Request New API Key */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-white/15 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Request API Key</h3>
                  <p className="text-xs text-gray-400">Requires TimeOrbit admin approval</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Key Name / Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Next.js Travel App or Meeting Tool"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Project Description / Use Case (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what you are building. This helps our admin review and approve your key faster."
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-300 leading-relaxed">
                ℹ️ <strong>Note:</strong> Regular accounts start with a default rate limit of 60 requests/minute. High
                traffic projects can request elevated limits from the admin.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl text-sm font-semibold glow-btn flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
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
          <div className="glass-panel rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-emerald-500/30 space-y-6 shadow-2xl shadow-emerald-500/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Your New API Key</h3>
                <p className="text-xs text-emerald-400 font-medium">Request submitted & key generated!</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Save this key right now!</span>
              </div>
              <p>
                For security reasons, this secret key is <strong>never stored in plaintext</strong> and cannot be viewed
                again after closing this window.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Plaintext Secret Key
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/60 border border-cyan-500/40">
                <code className="text-xs text-cyan-300 font-mono flex-1 break-all select-all">
                  {revealedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(revealedKey)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copiedKey
                      ? 'bg-emerald-500 text-white'
                      : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30'
                  }`}
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
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

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 space-y-1">
              <span className="font-semibold text-gray-300">Approval Status:</span>
              <p>
                Your key has been submitted for admin review. Once approved in the TimeOrbit Admin Panel, your key will
                be live and ready to query.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setRevealedKey(null)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold glow-btn"
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
