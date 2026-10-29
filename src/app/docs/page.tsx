'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Key,
  Copy,
  Check,
  ExternalLink,
  Clock,
  ArrowRightLeft,
  Globe2,
  ShieldCheck,
  Terminal,
  Code,
  Activity,
} from 'lucide-react';

export default function DocsPage() {
  const [endpoint, setEndpoint] = useState<'/api/v1/compare' | '/api/v1/time' | '/api/v1/zones' | '/api/analytics'>('/api/v1/compare');
  const [fromParam, setFromParam] = useState('Tokyo');
  const [toParam, setToParam] = useState('London');
  const [locationParam, setLocationParam] = useState('New_York');
  const [zonesQuery, setZonesQuery] = useState('');
  const [analyticsScope, setAnalyticsScope] = useState<'me' | 'global'>('me');
  const [analyticsRange, setAnalyticsRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [responseJson, setResponseJson] = useState<string | null>(null);
  const [statusBadge, setStatusBadge] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [activeCodeLang, setActiveCodeLang] = useState<'curl' | 'javascript' | 'python'>('curl');

  const handleRunRequest = async () => {
    try {
      setLoading(true);
      const start = Date.now();

      let url = endpoint as string;
      if (endpoint === '/api/v1/compare') {
        url = `/api/v1/compare?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}`;
      } else if (endpoint === '/api/v1/time') {
        url = `/api/v1/time?location=${encodeURIComponent(locationParam)}`;
      } else if (endpoint === '/api/v1/zones') {
        url = zonesQuery ? `/api/v1/zones?q=${encodeURIComponent(zonesQuery)}` : '/api/v1/zones';
      } else if (endpoint === '/api/analytics') {
        url = `/api/analytics?scope=${analyticsScope}&range=${analyticsRange}`;
      }

      const headers: Record<string, string> = {};
      if (apiKeyInput.trim()) {
        headers['x-api-key'] = apiKeyInput.trim();
      }

      const res = await fetch(url, { headers });
      const elapsed = Date.now() - start;
      const data = await res.json();

      setStatusBadge(res.status);
      setResponseTime(elapsed);
      setResponseJson(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setResponseJson(JSON.stringify({ error: message }, null, 2));
      setStatusBadge(500);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const codeSnippets = {
    curl: `# 1. Fetch current time & solar phase for Tokyo
curl -X GET "https://timeorbit-chi.vercel.app/api/v1/time?location=Tokyo" \\
  -H "x-api-key: YOUR_API_KEY"

# 2. Compare planetary coordinates between Tokyo & London
curl -X GET "https://timeorbit-chi.vercel.app/api/v1/compare?from=Tokyo&to=London" \\
  -H "x-api-key: YOUR_API_KEY"

# 3. Query supported metropolitan hubs (Public)
curl -X GET "https://timeorbit-chi.vercel.app/api/v1/zones?q=paris"`,
    javascript: `// Query TimeOrbit API with async/await
const API_KEY = 'to_live_your_api_key_here';

async function fetchCityTime(location) {
  const response = await fetch(
    \`https://timeorbit-chi.vercel.app/api/v1/time?location=\${encodeURIComponent(location)}\`,
    {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json'
      }
    }
  );

  const data = await response.json();
  console.log(data);
  return data;
}

fetchCityTime('Tokyo');`,
    python: `import requests

API_KEY = "to_live_your_api_key_here"
BASE_URL = "https://timeorbit-chi.vercel.app/api/v1"

headers = {
    "x-api-key": API_KEY,
    "Accept": "application/json"
}

# Fetch time and solar phase
response = requests.get(
    f"{BASE_URL}/time",
    params={"location": "Tokyo"},
    headers=headers
)

data = response.json()
print("Current Time:", data["data"]["time"])
print("Solar Elevation:", data["data"]["solar"]["elevation"])`,
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-16">
      {/* Page Header */}
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-widest uppercase text-[#fea082]">
          <Terminal className="w-3.5 h-3.5" />
          <span>Developer Platform • REST API v1</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-[0.25em] uppercase text-white">
          API Documentation
        </h1>
        <p className="text-xs sm:text-sm font-light tracking-[0.2em] uppercase text-zinc-400 max-w-2xl mx-auto">
          High-throughput planetary time, astronomical solar positions, and timezone synchronization services.
        </p>
      </div>

      {/* ============================================================ */}
      {/* 1. INTERACTIVE API TESTING SANDBOX                           */}
      {/* ============================================================ */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-[#fea082]" />
            <h2 className="text-xs font-light tracking-[0.22em] uppercase text-white">
              Interactive Request Sandbox
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Live In-Browser Testing
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Endpoints & Request Builder */}
          <div className="lg:col-span-6 space-y-6">
            {/* Authentication Banner */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-light tracking-wider uppercase text-xs text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#fea082]" />
                  API Key Authentication
                </span>
                <Link
                  href="/dashboard"
                  className="text-[11px] text-[#fea082] hover:text-white font-light uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  <span>Get API Key</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-xs text-zinc-400 font-light leading-relaxed">
                Provide your approved live key in the{' '}
                <code className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[11px]">
                  x-api-key
                </code>{' '}
                header. For public endpoints like <code className="text-white font-mono text-[11px]">/zones</code>, authentication is optional.
              </p>
              <input
                type="text"
                placeholder="Paste your to_live_... key here"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none"
              />
            </div>

            {/* Request Configurator */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-xs font-light tracking-[0.2em] uppercase text-zinc-400">Select Target Endpoint</h3>

              {/* Endpoint Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: '/api/v1/compare', label: '/compare' },
                  { id: '/api/v1/time', label: '/time' },
                  { id: '/api/v1/zones', label: '/zones' },
                  { id: '/api/analytics', label: '/analytics' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEndpoint(item.id as typeof endpoint)}
                    className={`py-2 px-2.5 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer text-center ${
                      endpoint === item.id
                        ? 'bg-white/20 text-white border border-white/30 font-medium'
                        : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Parameter Forms */}
              {endpoint === '/api/v1/compare' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-light">from (Origin City)</label>
                    <input
                      type="text"
                      value={fromParam}
                      onChange={(e) => setFromParam(e.target.value)}
                      placeholder="e.g. Tokyo"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-light">to (Target City)</label>
                    <input
                      type="text"
                      value={toParam}
                      onChange={(e) => setToParam(e.target.value)}
                      placeholder="e.g. London"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none"
                    />
                  </div>
                </div>
              )}

              {endpoint === '/api/v1/time' && (
                <div className="pt-2">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-light">location (City or Timezone)</label>
                  <input
                    type="text"
                    value={locationParam}
                    onChange={(e) => setLocationParam(e.target.value)}
                    placeholder="e.g. New_York or Paris"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none"
                  />
                </div>
              )}

              {endpoint === '/api/v1/zones' && (
                <div className="pt-2">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-light">q (Optional Search Filter)</label>
                  <input
                    type="text"
                    value={zonesQuery}
                    onChange={(e) => setZonesQuery(e.target.value)}
                    placeholder="e.g. tokyo or asia"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none"
                  />
                </div>
              )}

              {endpoint === '/api/analytics' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-light">scope</label>
                    <select
                      value={analyticsScope}
                      onChange={(e) => setAnalyticsScope(e.target.value as 'me' | 'global')}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none cursor-pointer"
                    >
                      <option value="me">me (Current User)</option>
                      <option value="global">global (Admin Only)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-light">range</label>
                    <select
                      value={analyticsRange}
                      onChange={(e) => setAnalyticsRange(e.target.value as '24h' | '7d' | '30d' | 'all')}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none cursor-pointer"
                    >
                      <option value="24h">24h (Last 24 Hours)</option>
                      <option value="7d">7d (Last 7 Days)</option>
                      <option value="30d">30d (Last 30 Days)</option>
                      <option value="all">all (Full History)</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunRequest}
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-xs font-medium glow-btn flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Execute Request</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Response Viewer */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-light tracking-wider uppercase text-xs text-white">Payload Output</span>
                <div className="flex items-center gap-3">
                  {statusBadge && (
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono ${
                        statusBadge === 200
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      HTTP {statusBadge}
                    </span>
                  )}
                  {responseTime !== null && (
                    <span className="text-xs text-zinc-500 font-mono">{responseTime} ms</span>
                  )}
                  {responseJson && (
                    <button
                      onClick={() => copyToClipboard(responseJson, 'json')}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                      title="Copy response JSON"
                    >
                      {copiedSnippet === 'json' ? <Check className="w-4 h-4 text-[#fea082]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-black rounded-xl p-4 font-mono text-xs text-zinc-300 border border-white/10 max-h-[480px] overflow-y-auto">
                {responseJson ? (
                  <pre>{responseJson}</pre>
                ) : (
                  <div className="text-zinc-600 text-center py-16 font-light tracking-wider uppercase text-xs">
                    Select an endpoint and click Execute to test live API responses
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. CORE REST ENDPOINTS DETAILED REFERENCE                    */}
      {/* ============================================================ */}
      <section className="space-y-8">
        <div className="border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-[#fea082]" />
            <h2 className="text-xs font-light tracking-[0.22em] uppercase text-white">
              Core Endpoints Reference
            </h2>
          </div>
          <p className="text-[11px] text-zinc-400 font-light uppercase tracking-wider mt-1">
            Standardized JSON Envelopes, HTTP Status Codes & Parameters
          </p>
        </div>

        <div className="space-y-8">
          {/* Endpoint 1: GET /api/v1/time */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8] text-xs font-mono font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  GET
                </span>
                <span className="font-mono text-white text-sm">/api/v1/time</span>
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                Auth Required
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-light leading-relaxed">
              Calculates real-time astronomical and standard time data for any supported world location. Includes civil dawn, solar noon, sunset, solar elevation angle, and day/night status.
            </p>

            {/* Query Parameters */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2 pr-4">Parameter</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Required</th>
                    <th className="py-2">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  <tr>
                    <td className="py-2.5 pr-4 font-mono text-[#fea082]">location</td>
                    <td className="py-2.5 pr-4 font-mono text-zinc-400">string</td>
                    <td className="py-2.5 pr-4 text-emerald-400 font-mono">Yes</td>
                    <td className="py-2.5">Target city name (e.g. <code className="text-white font-mono">Tokyo</code>, <code className="text-white font-mono">New_York</code>) or IANA timezone.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Example Response */}
            <div className="bg-black/80 rounded-xl p-4 border border-white/10">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">Example 200 OK Response</span>
              <pre className="text-xs font-mono text-zinc-300 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "location": "Tokyo",
    "country": "Japan",
    "timezone": "Asia/Tokyo",
    "time": "4:30:15 PM",
    "date": "Sat, Oct 24, 2026",
    "utcOffset": "UTC+09:00",
    "coordinates": { "lat": 35.6762, "lng": 139.6503 },
    "solar": {
      "state": "night",
      "elevation": -38.4,
      "dawn": "5:32 AM",
      "noon": "11:28 AM",
      "dusk": "5:02 PM"
    }
  }
}`}
              </pre>
            </div>
          </div>

          {/* Endpoint 2: GET /api/v1/compare */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8] text-xs font-mono font-medium flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  GET
                </span>
                <span className="font-mono text-white text-sm">/api/v1/compare</span>
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                Auth Required
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-light leading-relaxed">
              Computes synchronized planetary timeline comparison between two locations, calculating precise difference in hours, working-hour overlaps (09:00–18:00), and day boundary shifts.
            </p>

            {/* Query Parameters */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2 pr-4">Parameter</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Required</th>
                    <th className="py-2">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  <tr>
                    <td className="py-2.5 pr-4 font-mono text-[#fea082]">from</td>
                    <td className="py-2.5 pr-4 font-mono text-zinc-400">string</td>
                    <td className="py-2.5 pr-4 text-emerald-400 font-mono">Yes</td>
                    <td className="py-2.5">Origin city (e.g. <code className="text-white font-mono">Tokyo</code>).</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono text-[#fea082]">to</td>
                    <td className="py-2.5 pr-4 font-mono text-zinc-400">string</td>
                    <td className="py-2.5 pr-4 text-emerald-400 font-mono">Yes</td>
                    <td className="py-2.5">Target city to compare against (e.g. <code className="text-white font-mono">London</code>).</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Example Response */}
            <div className="bg-black/80 rounded-xl p-4 border border-white/10">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">Example 200 OK Response</span>
              <pre className="text-xs font-mono text-zinc-300 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "from": { "city": "Tokyo", "time": "4:30:15 PM", "offset": "UTC+09:00" },
    "to": { "city": "London", "time": "8:30:15 AM", "offset": "UTC+01:00" },
    "differenceHours": -8,
    "formattedDifference": "London is 8 hours behind Tokyo",
    "workingHoursOverlap": {
      "overlapHours": 2,
      "mutualWindowFrom": "17:00",
      "mutualWindowTo": "18:00"
    }
  }
}`}
              </pre>
            </div>
          </div>

          {/* Endpoint 3: GET /api/v1/zones */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8] text-xs font-mono font-medium flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5" />
                  GET
                </span>
                <span className="font-mono text-white text-sm">/api/v1/zones</span>
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                Public / Free
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-light leading-relaxed">
              Returns the full catalog of 48 supported global metropolitan hubs across 6 continental regions with geographic coordinates, IANA identifiers, and UTC offsets.
            </p>

            <div className="bg-black/80 rounded-xl p-4 border border-white/10">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">Query Filter</span>
              <p className="text-xs font-mono text-zinc-300">
                GET /api/v1/zones?q=paris
              </p>
            </div>
          </div>

          {/* Endpoint 4: GET /api/analytics */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8] text-xs font-mono font-medium flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  GET
                </span>
                <span className="font-mono text-white text-sm">/api/analytics</span>
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                Dual Auth (JWT / API Key)
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-light leading-relaxed">
              Provides granular telemetry: request volume, latency distributions, status code breakdowns, and endpoint allocations over 24-hour, 7-day, or 30-day timeframes.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. CODE INTEGRATION EXAMPLES                                 */}
      {/* ============================================================ */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#fea082]" />
            <h2 className="text-xs font-light tracking-[0.22em] uppercase text-white">
              Integration Code Examples
            </h2>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-lg border border-white/10">
            {(['curl', 'javascript', 'python'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveCodeLang(lang)}
                className={`px-3 py-1 rounded text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  activeCodeLang === lang
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-white/10 relative">
          <button
            onClick={() => copyToClipboard(codeSnippets[activeCodeLang], activeCodeLang)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            title="Copy code snippet"
          >
            {copiedSnippet === activeCodeLang ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#fea082]" />
                <span className="text-[#fea082]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <pre className="font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto p-2">
            {codeSnippets[activeCodeLang]}
          </pre>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. RATE LIMITING & SECURITY SPECIFICATION                    */}
      {/* ============================================================ */}
      <section className="glass-panel rounded-2xl p-8 border border-white/10 space-y-6">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <ShieldCheck className="w-4 h-4 text-[#fea082]" />
          <h2 className="text-xs font-light tracking-[0.22em] uppercase text-white">
            Rate Limiting & Security Protocols
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-300 font-light">
          <div className="space-y-2">
            <h3 className="font-mono text-[#fea082] uppercase text-[11px] tracking-wider">60 Requests / Minute</h3>
            <p className="leading-relaxed text-zinc-400">
              Each API key is allocated 60 requests per rolling 60-second window. Requests exceeding the allowance receive HTTP 429 Too Many Requests.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-mono text-[#fea082] uppercase text-[11px] tracking-wider">Telemetry Headers</h3>
            <p className="leading-relaxed text-zinc-400">
              Every authenticated response includes <code className="text-white font-mono text-[10px]">x-ratelimit-limit</code>, <code className="text-white font-mono text-[10px]">x-ratelimit-remaining</code>, and <code className="text-white font-mono text-[10px]">x-ratelimit-reset</code>.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-mono text-[#fea082] uppercase text-[11px] tracking-wider">Cryptographic Security</h3>
            <p className="leading-relaxed text-zinc-400">
              Keys are generated with a secure prefix (<code className="text-white font-mono text-[10px]">to_live_</code>) and persisted strictly as deterministic SHA-256 hashes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}