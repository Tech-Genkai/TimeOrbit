'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  User as UserIcon,
  Search,
  Check,
  X,
  Sliders,
  RefreshCw,
  Zap,
  Mail,
  Calendar,
  Activity,
  BarChart3,
  TrendingUp,
  Gauge,
} from 'lucide-react';
import { IApiKey, IUser } from '@/types';

interface PopulatedApiKey extends Omit<IApiKey, 'userId'> {
  userId: {
    _id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

interface AdminStats {
  totalUsers: number;
  totalKeys: number;
  pendingKeys: number;
  approvedKeys: number;
  rejectedKeys: number;
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

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [keys, setKeys] = useState<PopulatedApiKey[]>([]);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Global telemetry state
  const [telemetryRange, setTelemetryRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [telemetryData, setTelemetryData] = useState<AnalyticsData | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Action modals
  const [selectedKey, setSelectedKey] = useState<PopulatedApiKey | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'rateLimit' | null>(null);
  const [customRateLimit, setCustomRateLimit] = useState<number>(60);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadTelemetry = useCallback(async (range: '24h' | '7d' | '30d') => {
    try {
      setTelemetryLoading(true);
      const res = await fetch(`/api/analytics?scope=global&range=${range}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.range === range) {
          setTelemetryData(data);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Admin telemetry load error:', err);
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  const checkAdminAndLoad = useCallback(async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();

      if (!meData.user || meData.user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setCurrentUser(meData.user);

      // Load stats
      const statsRes = await fetch('/api/admin/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Load keys
      const keysRes = await fetch(`/api/admin/keys?status=${filterStatus}`);
      const keysData = await keysRes.json();
      if (keysData.success) {
        setKeys(keysData.keys);
      }
    } catch (err) {
      console.error('Admin page load error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, router]);

  useEffect(() => {
    queueMicrotask(() => {
      checkAdminAndLoad();
    });
  }, [checkAdminAndLoad]);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function fetchTelemetry() {
      try {
        setTelemetryLoading(true);
        const res = await fetch(`/api/analytics?scope=global&range=${telemetryRange}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && isCurrent && data.range === telemetryRange) {
            setTelemetryData(data);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Admin telemetry load error:', err);
      } finally {
        if (isCurrent) {
          setTelemetryLoading(false);
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
  }, [telemetryRange]);

  const handleActionSubmit = async () => {
    if (!selectedKey || !actionType) return;

    try {
      setActionLoading(true);
      let payload: Record<string, unknown> = {};

      if (actionType === 'approve') {
        payload = { action: 'approve', rateLimit: customRateLimit };
      } else if (actionType === 'reject') {
        payload = { action: 'reject', rejectionReason };
      } else if (actionType === 'rateLimit') {
        payload = { action: 'update_limit', rateLimit: customRateLimit };
      }

      const res = await fetch(`/api/admin/keys/${selectedKey._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSelectedKey(null);
        setActionType(null);
        setRejectionReason('');
        checkAdminAndLoad();
      }
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredKeys = keys.filter((k) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      k.name.toLowerCase().includes(q) ||
      k.userId?.email?.toLowerCase().includes(q) ||
      k.userId?.name?.toLowerCase().includes(q) ||
      k.keyPrefix?.toLowerCase().includes(q) ||
      k.useCase?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading admin command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Admin Top Header */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-purple-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-600/30 text-white">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">API Key Approval Control Center</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Logged in as <strong className="text-cyan-300">{currentUser?.email}</strong>. Review, approve, and manage developer API access.
              </p>
            </div>
          </div>

          <button
            onClick={checkAdminAndLoad}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Global Telemetry Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
            <span className="text-[11px] text-gray-400 font-medium">Total Registered Users</span>
            <div className="text-xl font-bold text-white mt-1">{stats?.totalUsers ?? 0}</div>
          </div>

          <div className="bg-amber-500/10 rounded-xl p-3.5 border border-amber-500/30">
            <span className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Pending Approvals
            </span>
            <div className="text-xl font-bold text-amber-400 mt-1">{stats?.pendingKeys ?? 0}</div>
          </div>

          <div className="bg-emerald-500/10 rounded-xl p-3.5 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active Approved Keys
            </span>
            <div className="text-xl font-bold text-emerald-400 mt-1">{stats?.approvedKeys ?? 0}</div>
          </div>

          <div className="bg-rose-500/10 rounded-xl p-3.5 border border-rose-500/20">
            <span className="text-[11px] text-rose-300 font-medium flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              Rejected Keys
            </span>
            <div className="text-xl font-bold text-rose-400 mt-1">{stats?.rejectedKeys ?? 0}</div>
          </div>

          <div className="bg-purple-500/10 rounded-xl p-3.5 border border-purple-500/20 col-span-2 lg:col-span-1">
            <span className="text-[11px] text-purple-300 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Total API Requests
            </span>
            <div className="text-xl font-bold text-purple-400 mt-1">{stats?.totalRequests ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Global API Telemetry & Traffic Insights */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Global Platform Telemetry & System Traffic
            </h2>
            <p className="text-sm text-gray-400">
              Platform-wide API throughput, latency distribution, endpoint utilization, and error rate monitoring.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/10">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTelemetryRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    telemetryRange === r
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={() => loadTelemetry(telemetryRange)}
              disabled={telemetryLoading}
              title="Refresh platform telemetry"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${telemetryLoading ? 'animate-spin text-purple-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl p-4 border border-purple-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Global Requests</span>
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              {telemetryData?.summary.totalRequests ?? 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Window: {telemetryRange}</div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-cyan-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyan-300 font-medium">Platform Latency</span>
              <Gauge className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-300 mt-2">
              {telemetryData?.summary.avgResponseTimeMs ?? 0} <span className="text-sm font-normal text-gray-400">ms</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Min: {telemetryData?.summary.minResponseTimeMs ?? 0}ms · Max: {telemetryData?.summary.maxResponseTimeMs ?? 0}ms
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-emerald-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-300 font-medium">System Success Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">
              {telemetryData?.summary.successRate ?? 0}%
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-1">HTTP 2xx & 3xx status</div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-amber-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-300 font-medium">Endpoints Active</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-2">
              {telemetryData?.endpointBreakdown.length ?? 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Active routes</div>
          </div>
        </div>

        {/* Visual Charts & Breakdown */}
        {telemetryData && telemetryData.summary.totalRequests > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Requests Over Time Bar Chart */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Platform Throughput Over Time</h3>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">Daily Traffic</span>
                </div>

                <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-white/10 overflow-x-auto">
                  {telemetryData.requestsOverTime.map((item) => {
                    const maxCount = Math.max(...telemetryData.requestsOverTime.map((r) => r.count), 1);
                    const heightPct = Math.max(14, Math.round((item.count / maxCount) * 100));

                    return (
                      <div
                        key={item.date}
                        className="flex-1 min-w-[2.5rem] flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-purple-500/40 rounded-lg px-2 py-1 text-[10px] text-purple-300 whitespace-nowrap pointer-events-none z-20 shadow-xl">
                          <div>Date: {item.date}</div>
                          <div>Requests: {item.count}</div>
                          <div>Avg: {item.avgLatency}ms</div>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[2rem] rounded-t-lg bg-gradient-to-t from-purple-600/30 via-purple-500/60 to-cyan-400 group-hover:to-cyan-300 group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all"
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
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Global Route & Status Distribution</h3>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">Platform Health</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-gray-400 font-medium">Route Distribution</span>
                    <div className="space-y-2 mt-2">
                      {telemetryData.endpointBreakdown.map((ep) => (
                        <div key={ep.endpoint} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-purple-300">{ep.endpoint}</span>
                            <span className="text-gray-400">
                              {ep.count} reqs ({ep.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, ep.percentage)}%` }}
                              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10">
                    <span className="text-xs text-gray-400 font-medium">Global Status Codes</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {telemetryData.statusDistribution.map((st) => {
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

            {/* Global Recent API Logs Table */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Global Real-Time API Stream</h3>
                </div>
                <span className="text-xs text-gray-500 font-mono">Last 10 platform requests</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="pb-2 font-medium">Endpoint</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Latency</th>
                      <th className="pb-2 font-medium">IP Address</th>
                      <th className="pb-2 font-medium text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {telemetryData.recentLogs.map((log) => {
                      const isSuccess = log.statusCode >= 200 && log.statusCode < 400;
                      return (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 font-mono text-purple-300">{log.endpoint}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">
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
                          <td className="py-2.5 font-mono text-gray-400">{log.ipAddress || 'unknown'}</td>
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
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">No Global Platform Traffic in this Window</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Platform-wide API requests will appear here once developers begin consuming the TimeOrbit REST endpoints.
            </p>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 overflow-x-auto">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterStatus === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            {stats && stats.pendingKeys > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-extrabold">
                {stats.pendingKeys}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterStatus === 'approved'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </button>

          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterStatus === 'rejected'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </button>

          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'all'
                ? 'bg-white/15 text-white border border-white/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Keys
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search developer, email, or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3.5 py-1.5 rounded-xl glass-input text-xs"
          />
        </div>
      </div>

      {/* Requests Table / Card List */}
      {filteredKeys.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-3 border border-dashed border-white/10">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Keys in this category</h3>
          <p className="text-xs text-gray-400">
            {filterStatus === 'pending'
              ? 'Great job! There are no pending API key requests waiting for approval.'
              : 'No matching keys found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKeys.map((key) => {
            const isPending = key.status === 'pending';
            const isApproved = key.status === 'approved';
            const isRejected = key.status === 'rejected';

            return (
              <div
                key={key._id}
                className={`glass-panel rounded-xl p-5 border transition-all ${
                  isPending
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : isApproved
                    ? 'border-emerald-500/20'
                    : 'border-white/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Developer & Key Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-bold text-white text-base">{key.name}</span>

                      {/* Status Badge */}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Declined
                        </span>
                      )}

                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-cyan-300">
                        {key.keyPrefix}...{key.lastFour}
                      </span>

                      <span className="text-xs text-gray-400 font-mono">
                        ⚡ {key.rateLimit} req/min
                      </span>
                    </div>

                    {/* Developer Info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>{key.userId?.name || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{key.userId?.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Requested: {new Date(key.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Use Case */}
                    {key.useCase && (
                      <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs text-gray-300">
                        <span className="text-gray-400 font-semibold">Stated Project Use Case: </span>
                        <span>{key.useCase}</span>
                      </div>
                    )}

                    {/* Rejection Note */}
                    {isRejected && key.rejectionReason && (
                      <div className="text-xs text-rose-300 italic">
                        Rejection reason given: &quot;{key.rejectionReason}&quot;
                      </div>
                    )}
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedKey(key);
                            setCustomRateLimit(key.rateLimit || 60);
                            setActionType('approve');
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve Key</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedKey(key);
                            setActionType('reject');
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedKey(key);
                            setCustomRateLimit(key.rateLimit || 60);
                            setActionType('rateLimit');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Adjust Limits</span>
                        </button>

                        {isApproved && (
                          <button
                            onClick={() => {
                              setSelectedKey(key);
                              setActionType('reject');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                          >
                            <span>Revoke</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Modal (Approve / Reject / Change Limit) */}
      {selectedKey && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 max-w-md w-full border border-white/15 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {actionType === 'approve'
                  ? 'Approve API Key Request'
                  : actionType === 'reject'
                  ? 'Decline API Key Request'
                  : 'Adjust Rate Limit'}
              </h3>
              <button
                onClick={() => {
                  setSelectedKey(null);
                  setActionType(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
              <div className="font-semibold text-white">{selectedKey.name}</div>
              <div className="text-gray-400">Developer: {selectedKey.userId?.name} ({selectedKey.userId?.email})</div>
            </div>

            {actionType === 'approve' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-300">
                  Assign Rate Limit (requests per minute)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 120, 300, 1000].map((limit) => (
                    <button
                      key={limit}
                      type="button"
                      onClick={() => setCustomRateLimit(limit)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        customRateLimit === limit
                          ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {limit}/min
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">
                  Approving this key will immediately unlock the developer&apos;s REST API access.
                </p>
              </div>
            )}

            {actionType === 'reject' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-300">
                  Feedback / Reason for Rejection (Visible to developer)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please provide more details regarding your intended application use case."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs resize-none"
                />
              </div>
            )}

            {actionType === 'rateLimit' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-300">
                  New Rate Limit (requests per minute)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={customRateLimit}
                  onChange={(e) => setCustomRateLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedKey(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleActionSubmit}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  actionType === 'reject'
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                }`}
              >
                {actionLoading ? 'Saving...' : actionType === 'approve' ? 'Confirm Approval' : actionType === 'reject' ? 'Confirm Decline' : 'Save Limit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
