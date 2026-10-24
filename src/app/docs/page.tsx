'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Play,
  Key,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

export default function DocsPage() {
  const [endpoint, setEndpoint] = useState<'/api/v1/compare' | '/api/v1/time' | '/api/v1/zones'>('/api/v1/compare');
  const [fromParam, setFromParam] = useState('Tokyo');
  const [toParam, setToParam] = useState('London');
  const [locationParam, setLocationParam] = useState('New_York');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [responseJson, setResponseJson] = useState<string | null>(null);
  const [statusBadge, setStatusBadge] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const handleRunRequest = async () => {
    try {
      setLoading(true);
      const start = Date.now();

      let url = endpoint as string;
      if (endpoint === '/api/v1/compare') {
        url = `/api/v1/compare?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}`;
      } else if (endpoint === '/api/v1/time') {
        url = `/api/v1/time?location=${encodeURIComponent(locationParam)}`;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 font-semibold">
          <Code2 className="w-3.5 h-3.5" />
          <span>Developer REST API Reference</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          TimeOrbit REST API & Sandbox
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Integrate multi-city global time comparisons, precision UTC offsets, and solar cycle data directly into your
          applications with our high-speed, 100% in-house calculation engine.
        </p>
      </div>

      {/* Interactive Sandbox & Documentation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Endpoints & Request Builder */}
        <div className="lg:col-span-6 space-y-6">
          {/* Authentication Banner */}
          <div className="glass-panel rounded-2xl p-5 border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                API Key Authentication
              </span>
              <Link
                href="/dashboard"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <span>Get API Key</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-gray-400">
              Pass your approved API key via the{' '}
              <code className="text-cyan-300 font-mono bg-white/5 px-1 py-0.5 rounded">x-api-key</code> request header.
            </p>
            <input
              type="text"
              placeholder="Paste your approved to_live_... key here to test"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          {/* Request Configurator */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white">Endpoint Request Builder</h2>

            {/* Select Endpoint */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Choose Endpoint</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEndpoint('/api/v1/compare')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    endpoint === '/api/v1/compare'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  /compare
                </button>
                <button
                  type="button"
                  onClick={() => setEndpoint('/api/v1/time')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    endpoint === '/api/v1/time'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  /time
                </button>
                <button
                  type="button"
                  onClick={() => setEndpoint('/api/v1/zones')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    endpoint === '/api/v1/zones'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  /zones
                </button>
              </div>
            </div>

            {/* Parameters */}
            {endpoint === '/api/v1/compare' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400">from (City A)</label>
                  <input
                    type="text"
                    value={fromParam}
                    onChange={(e) => setFromParam(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400">to (City B)</label>
                  <input
                    type="text"
                    value={toParam}
                    onChange={(e) => setToParam(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>
            )}

            {endpoint === '/api/v1/time' && (
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-gray-400">location</label>
                <input
                  type="text"
                  value={locationParam}
                  onChange={(e) => setLocationParam(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl glass-input text-xs"
                />
              </div>
            )}

            <button
              onClick={handleRunRequest}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold glow-btn flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute API Request</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Response Viewer */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Response Payload</span>
              <div className="flex items-center gap-3">
                {statusBadge && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                      statusBadge === 200
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    HTTP {statusBadge}
                  </span>
                )}
                {responseTime !== null && (
                  <span className="text-xs text-gray-400 font-mono">{responseTime} ms</span>
                )}
                {responseJson && (
                  <button
                    onClick={() => copyToClipboard(responseJson)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                  >
                    {copiedSnippet ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#030611] rounded-xl p-4 font-mono text-xs text-cyan-300 border border-white/10 max-h-[480px] overflow-y-auto">
              {responseJson ? (
                <pre>{responseJson}</pre>
              ) : (
                <div className="text-gray-500 text-center py-16">
                  Click &quot;Execute API Request&quot; to test this endpoint live and inspect the JSON output.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
