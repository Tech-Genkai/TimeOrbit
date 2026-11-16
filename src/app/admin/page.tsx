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
        if (data.range === telemetryRange) {
          setTelemetryData(data);
        }
      }
    } catch (err) {
      console.error('Failed to load global telemetry:', err);
    } finally {
      setTelemetryLoading(false);
    }
  }, [telemetryRange]);

  const checkAdminAndLoad = useCallback(async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();

      if (!meRes.ok || !meData.user) {
        router.push('/login');
        return;
      }

      if (meData.user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setCurrentUser(meData.user);

      // Load admin key queue & stats
      const [keysRes, statsRes] = await Promise.all([
        fetch('/api/admin/keys'),
        fetch('/api/admin/stats'),
      ]);

      if (keysRes.ok) {
        const kData = await keysRes.json();
        setKeys(kData.keys || []);
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.stats || null);
      }
    } catch (err) {
      console.error('Admin loading error:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      checkAdminAndLoad();
    });
  }, [checkAdminAndLoad]);

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();

    async function fetchTelemetry() {
      try {
        setTelemetryLoading(true);
        const res = await fetch(`/api/analytics?scope=global&range=${telemetryRange}`, {
          signal: controller.signal,
        });
        if (res.ok && isCurrent) {
          const data = await res.json();
          if (data.range === telemetryRange) {
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
          <div className="w-8 h-8 border-2 border-white/20 border-t-[#fea082] rounded-full animate-spin" />
          <p className="text-xs font-light tracking-[0.2em] uppercase text-zinc-400">Loading Observatory Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Admin Top Header */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-black/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-[#fea082] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-light tracking-[0.2em] uppercase text-white">
                  API Key Approval Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-white/10 text-[#fea082] border border-[#fea082]/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-light mt-1">
                Authenticated as <strong className="text-white font-mono">{currentUser?.email}</strong>. Review, provision, and calibrate developer API quotas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={checkAdminAndLoad}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-light tracking-wider uppercase text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Global Key Status Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-8 pt-6 border-t border-white/10">
          <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-light tracking-wider uppercase text-zinc-400">Total Registered Users</span>
            <div className="text-xl font-light font-mono text-white mt-1">{stats?.totalUsers ?? 0}</div>
          </div>

          <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-light tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#fea082]" />
              Pending Approvals
            </span>
            <div className="text-xl font-light font-mono text-[#fea082] mt-1">{stats?.pendingKeys ?? 0}</div>
          </div>

          <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-light tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Active Approved Keys
            </span>
            <div className="text-xl font-light font-mono text-white mt-1">{stats?.approvedKeys ?? 0}</div>
          </div>

          <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-light tracking-wider uppercase text-zinc-400 flex items-center gap-1.5">
              <XCircle className="w-3 h-3 text-zinc-500" />
              Rejected Keys
            </span>
            <div className="text-xl font-light font-mono text-zinc-400 mt-1">{stats?.rejectedKeys ?? 0}</div>
          </div>

          <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between col-span-2 lg:col-span-1">
            <span className="text-[10px] font-light tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#38bdf8]" />
              Total API Requests
            </span>
            <div className="text-xl font-light font-mono text-white mt-1">{stats?.totalRequests ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Global API Telemetry & Traffic Insights */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-light tracking-[0.25em] uppercase text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#fea082]" />
              <span>Global Platform Telemetry & System Traffic</span>
            </h2>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Platform-wide API throughput, latency distribution, endpoint utilization, and error rate monitoring.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 p-1 bg-black/60 rounded-xl border border-white/10">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTelemetryRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-light tracking-wider uppercase transition-all cursor-pointer ${
                    telemetryRange === r
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
              onClick={() => loadTelemetry(telemetryRange)}
              disabled={telemetryLoading}
              title="Refresh platform telemetry"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-light tracking-wider uppercase text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${telemetryLoading ? 'animate-spin text-[#fea082]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl p-4 border border-white/10 relative overflow-hidden bg-black/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">Global Requests</span>
              <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-light font-mono text-white">
              {telemetryData?.summary.totalRequests ?? 0}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">Window: {telemetryRange}</div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-white/10 relative overflow-hidden bg-black/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">Platform Latency</span>
              <Gauge className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-light font-mono text-white">
              {telemetryData?.summary.avgResponseTimeMs ?? 0} <span className="text-xs font-light text-zinc-400 font-sans">ms</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              Min: {telemetryData?.summary.minResponseTimeMs ?? 0}ms · Max: {telemetryData?.summary.maxResponseTimeMs ?? 0}ms
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-white/10 relative overflow-hidden bg-black/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">System Success Rate</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-light font-mono text-emerald-400">
              {telemetryData?.summary.successRate ?? 0}%
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">HTTP 2xx & 3xx status</div>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-white/10 relative overflow-hidden bg-black/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-light uppercase tracking-wider">Endpoints Active</span>
              <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-light font-mono text-white">
              {telemetryData?.endpointBreakdown.length ?? 0}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">Active routes</div>
          </div>
        </div>

        {/* Visual Charts & Breakdown */}
        {telemetryData && telemetryData.summary.totalRequests > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Requests Over Time Bar Chart */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4 bg-black/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-[#fea082]" />
                    <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">Platform Throughput Over Time</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Daily Traffic</span>
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
                    <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">Route & Status Distribution</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Platform Health</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-light tracking-wider uppercase text-zinc-400">Route Distribution</span>
                    <div className="space-y-2 mt-2">
                      {telemetryData.endpointBreakdown.map((ep) => (
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
                    <span className="text-[10px] font-light tracking-wider uppercase text-zinc-400">Global Status Codes</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {telemetryData.statusDistribution.map((st) => {
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

            {/* Global Recent API Logs Table */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3 bg-black/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#fea082]" />
                  <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">Global Real-Time API Stream</h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Last 10 platform requests</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-500 text-[10px] font-light uppercase tracking-wider">
                      <th className="pb-2">Endpoint</th>
                      <th className="pb-2">Method</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Latency</th>
                      <th className="pb-2">IP Address</th>
                      <th className="pb-2 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {telemetryData.recentLogs.map((log) => {
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
                          <td className="py-2.5 text-zinc-500">{log.ipAddress || 'unknown'}</td>
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
            <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">No Global Platform Traffic in this Window</h3>
            <p className="text-xs text-zinc-400 font-light max-w-md mx-auto">
              Platform-wide API requests will appear here once developers begin consuming the TimeOrbit REST endpoints.
            </p>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-light tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-white/15 text-white border border-white/20 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#fea082]" />
            <span>Pending Review</span>
            {stats && stats.pendingKeys > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#fea082] text-black font-semibold">
                {stats.pendingKeys}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('approved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-light tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
              filterStatus === 'approved'
                ? 'bg-white/15 text-white border border-white/20 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Approved</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('rejected')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-light tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
              filterStatus === 'rejected'
                ? 'bg-white/15 text-white border border-white/20 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Rejected</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-light tracking-wider uppercase transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white/15 text-white border border-white/20 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Keys
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search developer, email, or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3.5 py-1.5 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-light focus:border-[#fea082] outline-none"
          />
        </div>
      </div>

      {/* Requests Table / Card List */}
      {filteredKeys.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-3 border border-dashed border-white/10 bg-black/40">
          <CheckCircle2 className="w-10 h-10 text-zinc-500 mx-auto" />
          <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">No Keys in this category</h3>
          <p className="text-xs text-zinc-400 font-light">
            {filterStatus === 'pending'
              ? 'No pending API key requests waiting for review.'
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
                className="glass-panel rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all bg-black/60"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Developer & Key Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-light tracking-wider uppercase text-white text-sm">{key.name}</span>

                      {/* Status Badge */}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/5 text-[#fea082] border border-[#fea082]/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/5 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/5 text-zinc-400 border border-white/15 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Declined
                        </span>
                      )}

                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black border border-white/10 text-zinc-300">
                        {key.keyPrefix}...{key.lastFour}
                      </span>

                      <span className="text-[11px] text-zinc-400 font-mono">
                        ⚡ {key.rateLimit} req/min
                      </span>
                    </div>

                    {/* Developer Info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300 font-light">
                      <div className="flex items-center gap-1.5 text-white">
                        <UserIcon className="w-3.5 h-3.5 text-[#fea082]" />
                        <span>{key.userId?.name || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
                        <Mail className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{key.userId?.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Requested: {new Date(key.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Use Case */}
                    {key.useCase && (
                      <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-xs text-zinc-300 font-light">
                        <span className="text-zinc-400 uppercase tracking-wider text-[10px] block mb-0.5">Stated Use Case: </span>
                        <span>{key.useCase}</span>
                      </div>
                    )}

                    {/* Rejection Note */}
                    {isRejected && key.rejectionReason && (
                      <div className="text-xs text-zinc-400 italic font-light">
                        Rejection reason: &quot;{key.rejectionReason}&quot;
                      </div>
                    )}
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKey(key);
                            setCustomRateLimit(key.rateLimit || 60);
                            setActionType('approve');
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wider bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Key</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKey(key);
                            setActionType('reject');
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-light uppercase tracking-wider bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/15 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKey(key);
                            setCustomRateLimit(key.rateLimit || 60);
                            setActionType('rateLimit');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-light uppercase tracking-wider text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-[#fea082]" />
                          <span>Adjust Limits</span>
                        </button>

                        {isApproved && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKey(key);
                              setActionType('reject');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-light uppercase tracking-wider text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 max-w-md w-full border border-white/15 space-y-5 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">
                {actionType === 'approve'
                  ? 'Approve API Key Request'
                  : actionType === 'reject'
                  ? 'Decline API Key Request'
                  : 'Adjust Rate Limit'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedKey(null);
                  setActionType(null);
                }}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1 font-light">
              <div className="font-normal text-white uppercase tracking-wider">{selectedKey.name}</div>
              <div className="text-zinc-400 font-mono text-[11px]">Developer: {selectedKey.userId?.name} ({selectedKey.userId?.email})</div>
            </div>

            {actionType === 'approve' && (
              <div className="space-y-3">
                <label className="block text-xs font-light tracking-wider uppercase text-zinc-300">
                  Assign Rate Limit (requests per minute)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 120, 300, 1000].map((limit) => (
                    <button
                      key={limit}
                      type="button"
                      onClick={() => setCustomRateLimit(limit)}
                      className={`py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                        customRateLimit === limit
                          ? 'bg-white text-black font-semibold shadow'
                          : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {limit}/min
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-400 font-light">
                  Approving this key will immediately unlock the developer&apos;s REST API access.
                </p>
              </div>
            )}

            {actionType === 'reject' && (
              <div className="space-y-3">
                <label className="block text-xs font-light tracking-wider uppercase text-zinc-300">
                  Feedback / Reason for Rejection (Visible to developer)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please provide more details regarding your intended application use case."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-light focus:border-[#fea082] outline-none resize-none"
                />
              </div>
            )}

            {actionType === 'rateLimit' && (
              <div className="space-y-3">
                <label className="block text-xs font-light tracking-wider uppercase text-zinc-300">
                  New Rate Limit (requests per minute)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={customRateLimit}
                  onChange={(e) => setCustomRateLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none"
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
                className="px-4 py-2 rounded-xl text-xs font-light uppercase tracking-wider text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleActionSubmit}
                className={`px-5 py-2 rounded-xl text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  actionType === 'reject'
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/60'
                    : 'bg-[#fea082] text-black hover:bg-[#ffb69f]'
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
