'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
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
      <div className="space-y-2 text-center">
        <h1 className="text-2xl sm:text-3xl font-light tracking-[0.25em] uppercase text-white">
          API Documentation
        </h1>
        <p className="text-xs sm:text-sm font-light tracking-[0.2em] uppercase text-[#fea082]">
          TimeOrbit REST Endpoints & Sandbox
        </p>
      </div>

      {/* Interactive Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Endpoints & Request Builder */}
        <div className="lg:col-span-6 space-y-6">
          {/* Authentication Banner */}
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-light tracking-wider uppercase text-sm text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#fea082]" />
                API Key Authentication
              </span>
              <Link
                href="/dashboard"
                className="text-xs text-[#fea082] hover:text-white font-light uppercase tracking-wider flex items-center gap-1"
              >
                <span>Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-zinc-400 font-light">
              Include your approved key via the{' '}
              <code className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">
                x-api-key
              </code>{' '}
              header.
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
            <h2 className="text-xs font-light tracking-[0.2em] uppercase text-white">Select Endpoint</h2>

            {/* Select Endpoint */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEndpoint('/api/v1/compare')}
                className={`py-2 px-3 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer ${
                  endpoint === '/api/v1/compare'
                    ? 'bg-white/20 text-white border border-white/30 font-medium'
                    : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                }`}
              >
                /compare
              </button>
              <button
                type="button"
                onClick={() => setEndpoint('/api/v1/time')}
                className={`py-2 px-3 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer ${
                  endpoint === '/api/v1/time'
                    ? 'bg-white/20 text-white border border-white/30 font-medium'
                    : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                }`}
              >
                /time
              </button>
              <button
                type="button"
                onClick={() => setEndpoint('/api/v1/zones')}
                className={`py-2 px-3 rounded-lg text-xs tracking-wider uppercase transition-all cursor-pointer ${
                  endpoint === '/api/v1/zones'
                    ? 'bg-white/20 text-white border border-white/30 font-medium'
                    : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                }`}
              >
                /zones
              </button>
            </div>

            {/* Parameters */}
            {endpoint === '/api/v1/compare' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-light">from (Origin)</label>
                  <input
                    type="text"
                    value={fromParam}
                    onChange={(e) => setFromParam(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-light">to (Target)</label>
                  <input
                    type="text"
                    value={toParam}
                    onChange={(e) => setToParam(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none"
                  />
                </div>
              </div>
            )}

            {endpoint === '/api/v1/time' && (
              <div className="pt-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-light">location</label>
                <input
                  type="text"
                  value={locationParam}
                  onChange={(e) => setLocationParam(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-mono focus:border-[#fea082] outline-none"
                />
              </div>
            )}

            <button
              onClick={handleRunRequest}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-medium glow-btn flex items-center justify-center gap-2 cursor-pointer mt-2"
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
                    onClick={() => copyToClipboard(responseJson)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {copiedSnippet ? <Check className="w-4 h-4 text-[#fea082]" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-black rounded-xl p-4 font-mono text-xs text-zinc-300 border border-white/10 max-h-[480px] overflow-y-auto">
              {responseJson ? (
                <pre>{responseJson}</pre>
              ) : (
                <div className="text-zinc-600 text-center py-16 font-light tracking-wider uppercase text-xs">
                  Awaiting request execution
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
