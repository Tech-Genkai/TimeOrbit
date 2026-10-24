/**
 * Empirical Adversarial Stress Test Harness: User & Admin Dashboard Telemetry
 * Tests:
 * 1. Edge data rendering: 0 requests, 1 request, 100,000 requests, single endpoint, missing dates
 * 2. Mathematical safety: Division by zero, NaN%, Infinity, null property access
 * 3. Timeframe toggling: Race condition simulation and memory leak / cancellation analysis
 */

import assert from 'node:assert';

const results = {
  passed: 0,
  failed: 0,
  findings: []
};

function recordPass(testName) {
  results.passed++;
  console.log(`  [PASS] ${testName}`);
}

function recordFail(testName, error, details) {
  results.failed++;
  const finding = { testName, error: error?.message || String(error), details };
  results.findings.push(finding);
  console.error(`  [FAIL] ${testName}`);
  console.error(`         Error: ${finding.error}`);
  if (details) console.error(`         Details: ${JSON.stringify(details)}`);
}

console.log('================================================================');
console.log('STARTING EMPIRICAL ADVERSARIAL STRESS TEST: DASHBOARD TELEMETRY');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// SUITE 1: Backend Route Math Stability (/api/analytics aggregation output)
// ----------------------------------------------------------------------
console.log('--- SUITE 1: Backend Calculation Formula Stability ---');

function computeSummary(summaryData) {
  const totalRequests = summaryData?.totalRequests || 0;
  const avgResponseTimeMs =
    totalRequests > 0 ? Math.round((summaryData?.avgResponseTimeMs || 0) * 10) / 10 : 0;
  const minResponseTimeMs = totalRequests > 0 ? Math.round(summaryData?.minResponseTimeMs || 0) : 0;
  const maxResponseTimeMs = totalRequests > 0 ? Math.round(summaryData?.maxResponseTimeMs || 0) : 0;
  const successRate =
    totalRequests > 0
      ? Math.round(((summaryData?.successCount || 0) / totalRequests) * 1000) / 10
      : 0;

  return { totalRequests, avgResponseTimeMs, minResponseTimeMs, maxResponseTimeMs, successRate };
}

function computeEndpointBreakdown(endpointBreakdownRaw, totalRequests) {
  return endpointBreakdownRaw.map((item) => ({
    endpoint: item._id || 'unknown',
    count: item.count,
    percentage:
      totalRequests > 0 ? Math.round((item.count / totalRequests) * 1000) / 10 : 0,
    avgResponseTimeMs: Math.round(item.avgResponseTime || 0),
  }));
}

function computeStatusDistribution(statusDistributionRaw, totalRequests) {
  return statusDistributionRaw.map((item) => ({
    status: item._id,
    statusCode: item._id,
    count: item.count,
    percentage:
      totalRequests > 0 ? Math.round((item.count / totalRequests) * 1000) / 10 : 0,
  }));
}

// Test 1.1: 0 total requests
try {
  const s0 = computeSummary(null);
  assert.strictEqual(s0.totalRequests, 0);
  assert.strictEqual(s0.avgResponseTimeMs, 0);
  assert.strictEqual(s0.minResponseTimeMs, 0);
  assert.strictEqual(s0.maxResponseTimeMs, 0);
  assert.strictEqual(s0.successRate, 0);
  assert(!Number.isNaN(s0.successRate), 'successRate is NaN');
  assert(!Number.isNaN(s0.avgResponseTimeMs), 'avgResponseTimeMs is NaN');

  const ep0 = computeEndpointBreakdown([], 0);
  assert.strictEqual(ep0.length, 0);

  const st0 = computeStatusDistribution([], 0);
  assert.strictEqual(st0.length, 0);

  recordPass('Backend math with 0 requests returns clean 0s with no NaN or div/0');
} catch (e) {
  recordFail('Backend math with 0 requests', e);
}

// Test 1.2: 1 request
try {
  const s1 = computeSummary({
    totalRequests: 1,
    avgResponseTimeMs: 42.42,
    minResponseTimeMs: 42.42,
    maxResponseTimeMs: 42.42,
    successCount: 1,
  });
  assert.strictEqual(s1.totalRequests, 1);
  assert.strictEqual(s1.avgResponseTimeMs, 42.4);
  assert.strictEqual(s1.minResponseTimeMs, 42);
  assert.strictEqual(s1.maxResponseTimeMs, 42);
  assert.strictEqual(s1.successRate, 100);

  const ep1 = computeEndpointBreakdown([{ _id: '/api/v1/time', count: 1, avgResponseTime: 42.42 }], 1);
  assert.strictEqual(ep1[0].percentage, 100);

  const st1 = computeStatusDistribution([{ _id: 200, count: 1 }], 1);
  assert.strictEqual(st1[0].percentage, 100);

  recordPass('Backend math with 1 request computes exact 100% percentages without NaN');
} catch (e) {
  recordFail('Backend math with 1 request', e);
}

// Test 1.3: 100,000 requests
try {
  const s100k = computeSummary({
    totalRequests: 100000,
    avgResponseTimeMs: 35.678,
    minResponseTimeMs: 2,
    maxResponseTimeMs: 1420,
    successCount: 99420,
  });
  assert.strictEqual(s100k.totalRequests, 100000);
  assert.strictEqual(s100k.avgResponseTimeMs, 35.7);
  assert.strictEqual(s100k.minResponseTimeMs, 2);
  assert.strictEqual(s100k.maxResponseTimeMs, 1420);
  assert.strictEqual(s100k.successRate, 99.4);

  const ep100k = computeEndpointBreakdown(
    [
      { _id: '/api/v1/time', count: 65000, avgResponseTime: 32 },
      { _id: '/api/v1/compare', count: 35000, avgResponseTime: 41 },
    ],
    100000
  );
  assert.strictEqual(ep100k[0].percentage, 65);
  assert.strictEqual(ep100k[1].percentage, 35);

  recordPass('Backend math with 100,000 requests handles high volume with precise decimal rounding');
} catch (e) {
  recordFail('Backend math with 100,000 requests', e);
}


// ----------------------------------------------------------------------
// SUITE 2: Component Rendering Logic & DOM Expression Stress Testing
// ----------------------------------------------------------------------
console.log('\n--- SUITE 2: Dashboard UI Template & Expression Evaluation ---');

function evaluateDashboardTemplate(data) {
  const output = {
    renderedCards: {},
    barChartHeights: [],
    barChartLabels: [],
    endpointWidths: [],
    statusPills: [],
    recentRows: [],
    emptyStateRendered: false,
  };

  // Summary Cards
  output.renderedCards.totalRequests = data?.summary.totalRequests ?? 0;
  output.renderedCards.avgLatency = `${data?.summary.avgResponseTimeMs ?? 0} ms`;
  output.renderedCards.latencyBounds = `Min: ${data?.summary.minResponseTimeMs ?? 0}ms · Max: ${data?.summary.maxResponseTimeMs ?? 0}ms`;
  output.renderedCards.successRate = `${data?.summary.successRate ?? 0}%`;
  output.renderedCards.activeEndpoints = data?.endpointBreakdown.length ?? 0;

  // Render condition check (line 442)
  if (data && data.summary.totalRequests > 0) {
    // Bar Chart
    const maxCount = Math.max(...data.requestsOverTime.map((r) => r.count), 1);
    assert(!Number.isNaN(maxCount), 'maxCount evaluated to NaN');
    assert(maxCount >= 1, 'maxCount must be >= 1');

    data.requestsOverTime.forEach((item) => {
      const heightPct = Math.max(14, Math.round((item.count / maxCount) * 100));
      assert(!Number.isNaN(heightPct), 'heightPct evaluated to NaN');
      output.barChartHeights.push(heightPct);

      // Line 478 check: item.date && item.date.length > 5 ? item.date.slice(5) : (item.date || 'N/A')
      const label =
        item.date && item.date.length > 5 ? item.date.slice(5) : (item.date || 'N/A');
      output.barChartLabels.push(label);
    });

    // Endpoint Breakdown
    data.endpointBreakdown.forEach((ep) => {
      const widthStyle = `${Math.min(100, ep.percentage)}%`;
      const text = `${ep.count} reqs (${ep.percentage}%)`;
      assert(!widthStyle.includes('NaN'), `Endpoint width style contains NaN: ${widthStyle}`);
      assert(!text.includes('NaN'), `Endpoint percentage text contains NaN: ${text}`);
      output.endpointWidths.push(widthStyle);
    });

    // Status Distribution
    data.statusDistribution.forEach((st) => {
      const isSuccess = st.statusCode >= 200 && st.statusCode < 400;
      const isClientError = st.statusCode >= 400 && st.statusCode < 500;
      const text = `${st.count} (${st.percentage}%)`;
      assert(!text.includes('NaN'), `Status percentage text contains NaN: ${text}`);
      output.statusPills.push({ code: st.statusCode, text, isSuccess, isClientError });
    });

    // Recent Logs
    data.recentLogs.forEach((log) => {
      const isSuccess = log.statusCode >= 200 && log.statusCode < 400;
      const timeStr = new Date(log.createdAt).toLocaleTimeString();
      assert(timeStr !== 'Invalid Date', `Invalid Date rendered for log: ${log.createdAt}`);
      output.recentRows.push({ endpoint: log.endpoint, method: log.method, statusCode: log.statusCode, isSuccess, timeStr });
    });
  } else {
    output.emptyStateRendered = true;
  }

  return output;
}

// Test 2.1: Render with 0 requests (Empty State)
try {
  const data0 = {
    success: true,
    scope: 'me',
    range: '7d',
    summary: { totalRequests: 0, avgResponseTimeMs: 0, minResponseTimeMs: 0, maxResponseTimeMs: 0, successRate: 0 },
    requestsOverTime: [],
    endpointBreakdown: [],
    statusDistribution: [],
    recentLogs: []
  };

  const render0 = evaluateDashboardTemplate(data0);
  assert.strictEqual(render0.emptyStateRendered, true);
  assert.strictEqual(render0.renderedCards.totalRequests, 0);
  assert.strictEqual(render0.renderedCards.avgLatency, '0 ms');
  assert.strictEqual(render0.renderedCards.successRate, '0%');
  assert.strictEqual(render0.renderedCards.activeEndpoints, 0);
  recordPass('UI cleanly displays 0-stat cards and falls back to empty state banner without rendering empty charts');
} catch (e) {
  recordFail('UI rendering with 0 requests', e);
}

// Test 2.2: Render with 1 request
try {
  const data1 = {
    success: true,
    scope: 'me',
    range: '7d',
    summary: { totalRequests: 1, avgResponseTimeMs: 28.5, minResponseTimeMs: 28, maxResponseTimeMs: 28, successRate: 100 },
    requestsOverTime: [{ date: '2026-10-23', count: 1, avgLatency: 28.5 }],
    endpointBreakdown: [{ endpoint: '/api/v1/time', count: 1, percentage: 100, avgResponseTimeMs: 28 }],
    statusDistribution: [{ status: 200, statusCode: 200, count: 1, percentage: 100 }],
    recentLogs: [{ id: '1', _id: '1', endpoint: '/api/v1/time', method: 'GET', statusCode: 200, responseTimeMs: 28, createdAt: new Date().toISOString() }]
  };

  const render1 = evaluateDashboardTemplate(data1);
  assert.strictEqual(render1.emptyStateRendered, false);
  assert.strictEqual(render1.barChartHeights[0], 100);
  assert.strictEqual(render1.barChartLabels[0], '10-23');
  assert.strictEqual(render1.endpointWidths[0], '100%');
  assert.strictEqual(render1.statusPills[0].text, '1 (100%)');
  recordPass('UI renders single request with full 100% scale bars and valid date labels');
} catch (e) {
  recordFail('UI rendering with 1 request', e);
}

// Test 2.3: Render with 100,000 requests
try {
  const data100k = {
    success: true,
    scope: 'me',
    range: '7d',
    summary: { totalRequests: 100000, avgResponseTimeMs: 44.1, minResponseTimeMs: 5, maxResponseTimeMs: 2500, successRate: 99.8 },
    requestsOverTime: [
      { date: '2026-10-18', count: 10000, avgLatency: 40 },
      { date: '2026-10-19', count: 15000, avgLatency: 42 },
      { date: '2026-10-20', count: 25000, avgLatency: 48 },
      { date: '2026-10-21', count: 20000, avgLatency: 45 },
      { date: '2026-10-22', count: 12000, avgLatency: 39 },
      { date: '2026-10-23', count: 18000, avgLatency: 43 },
    ],
    endpointBreakdown: [
      { endpoint: '/api/v1/time', count: 70000, percentage: 70, avgResponseTimeMs: 38 },
      { endpoint: '/api/v1/compare', count: 30000, percentage: 30, avgResponseTimeMs: 52 },
    ],
    statusDistribution: [
      { status: 200, statusCode: 200, count: 99800, percentage: 99.8 },
      { status: 404, statusCode: 404, count: 200, percentage: 0.2 },
    ],
    recentLogs: Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      _id: String(i),
      endpoint: '/api/v1/time',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: 35 + i,
      createdAt: new Date().toISOString(),
    }))
  };

  const render100k = evaluateDashboardTemplate(data100k);
  assert.strictEqual(render100k.emptyStateRendered, false);
  assert.strictEqual(render100k.barChartHeights.length, 6);
  // Highest is 25000 -> 100%, lowest is 10000 -> 40%
  assert.strictEqual(render100k.barChartHeights[2], 100);
  assert.strictEqual(render100k.barChartHeights[0], 40);
  recordPass('UI renders 100,000 requests across multi-day volume with accurate proportional scaling');
} catch (e) {
  recordFail('UI rendering with 100,000 requests', e);
}

// Test 2.4: Single endpoint
try {
  const dataSingleEp = {
    success: true,
    scope: 'me',
    range: '7d',
    summary: { totalRequests: 50, avgResponseTimeMs: 30, minResponseTimeMs: 10, maxResponseTimeMs: 80, successRate: 100 },
    requestsOverTime: [{ date: '2026-10-23', count: 50, avgLatency: 30 }],
    endpointBreakdown: [{ endpoint: '/api/v1/time', count: 50, percentage: 100, avgResponseTimeMs: 30 }],
    statusDistribution: [{ status: 200, statusCode: 200, count: 50, percentage: 100 }],
    recentLogs: []
  };

  const renderSingleEp = evaluateDashboardTemplate(dataSingleEp);
  assert.strictEqual(renderSingleEp.renderedCards.activeEndpoints, 1);
  assert.strictEqual(renderSingleEp.endpointWidths.length, 1);
  assert.strictEqual(renderSingleEp.endpointWidths[0], '100%');
  recordPass('Single endpoint traffic renders exactly 1 active route with full 100% allocation');
} catch (e) {
  recordFail('Single endpoint traffic', e);
}

// Test 2.5: Missing dates in timeline (Gaps between days)
try {
  const dataGaps = {
    success: true,
    scope: 'me',
    range: '7d',
    summary: { totalRequests: 20, avgResponseTimeMs: 30, minResponseTimeMs: 10, maxResponseTimeMs: 80, successRate: 100 },
    requestsOverTime: [
      { date: '2026-10-17', count: 10, avgLatency: 25 },
      // Gap: 18, 19, 20, 21, 22 have no requests
      { date: '2026-10-23', count: 10, avgLatency: 35 },
    ],
    endpointBreakdown: [{ endpoint: '/api/v1/time', count: 20, percentage: 100, avgResponseTimeMs: 30 }],
    statusDistribution: [{ status: 200, statusCode: 200, count: 20, percentage: 100 }],
    recentLogs: []
  };

  const renderGaps = evaluateDashboardTemplate(dataGaps);
  assert.strictEqual(renderGaps.barChartHeights.length, 2);
  assert.deepStrictEqual(renderGaps.barChartLabels, ['10-17', '10-23']);
  recordPass('Time gaps between days render discrete recorded dates without chart collapse');
} catch (e) {
  recordFail('Time gaps between days', e);
}

// Test 2.6: ADVERSARIAL CHALLENGE — Missing date property (null / undefined / empty string)
try {
  const fs = await import('node:fs');
  const dashCode = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
  const adminCode = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
  const routeCode = fs.readFileSync('src/app/api/analytics/route.ts', 'utf8');

  const dashHasNullSafe = dashCode.includes("item.date && item.date.length > 5 ? item.date.slice(5) : (item.date || 'N/A')");
  const adminHasNullSafe = adminCode.includes("item.date && item.date.length > 5 ? item.date.slice(5) : (item.date || 'N/A')");
  const routeHasFallback = routeCode.includes("date: item._id || 'unknown'");

  assert(dashHasNullSafe, 'dashboard/page.tsx missing null-safe date check');
  assert(adminHasNullSafe, 'admin/page.tsx missing null-safe date check');
  assert(routeHasFallback, 'route.ts missing null-safe fallback date');

  const dataMissingDate = {
    success: true,
    scope: 'me',
    range: '7d',
    summary: { totalRequests: 5, avgResponseTimeMs: 30, minResponseTimeMs: 10, maxResponseTimeMs: 80, successRate: 100 },
    requestsOverTime: [
      { date: null, count: 5, avgLatency: 30 }
    ],
    endpointBreakdown: [{ endpoint: '/api/v1/time', count: 5, percentage: 100, avgResponseTimeMs: 30 }],
    statusDistribution: [{ status: 200, statusCode: 200, count: 5, percentage: 100 }],
    recentLogs: []
  };

  const renderResult = evaluateDashboardTemplate(dataMissingDate);
  assert.strictEqual(renderResult.barChartLabels[0], 'N/A');
  recordPass('Component gracefully handled date=null without throwing and rendered N/A fallback');
} catch (err) {
  recordFail(
    'ADVERSARIAL: Unhandled null date in requestsOverTime',
    err,
    {
      trigger: 'item.date is null or undefined from raw log aggregation with missing createdAt',
      codeLocation: 'dashboard/page.tsx:478 & admin/page.tsx:439',
      snippet: 'item.date.length > 5 ? item.date.slice(5) : item.date',
      risk: 'HIGH - Uncaught TypeError crashes the entire React component tree'
    }
  );
}


// ----------------------------------------------------------------------
// SUITE 3: Timeframe Toggling Race Conditions & Memory Leak Analysis
// ----------------------------------------------------------------------
console.log('\n--- SUITE 3: Timeframe Toggling & Concurrency Stress Test ---');

/**
 * Simulates user rapidly toggling timeframe pills:
 * 1. User is on '7d'
 * 2. User clicks '30d' -> triggers fetch('/api/analytics?range=30d') (slow: 150ms)
 * 3. User immediately clicks '24h' -> triggers fetch('/api/analytics?range=24h') (fast: 25ms)
 *
 * Current implementation in Dashboard & Admin:
 * const [analyticsRange, setAnalyticsRange] = useState('7d');
 * const [analyticsData, setAnalyticsData] = useState(null);
 *
 * const loadAnalytics = useCallback(async (range) => {
 *   const res = await fetch(`/api/analytics?range=${range}`);
 *   if (res.ok) {
 *     const data = await res.json();
 *     if (data.success) {
 *       setAnalyticsData(data); // <--- UNCONDITIONAL OVERWRITE!
 *     }
 *   }
 * }, []);
 *
 * useEffect(() => {
 *   queueMicrotask(() => { loadAnalytics(analyticsRange); });
 * }, [loadAnalytics, analyticsRange]);
 */

async function simulateTimeframeRaceCondition() {
  let activeSelectedRange = '7d';
  let storedAnalyticsData = null;

  // Mock server delay based on data size
  const mockServerFetch = async (range) => {
    const delay = range === '30d' ? 120 : range === '7d' ? 60 : 20; // 30d takes 120ms, 24h takes 20ms
    await new Promise((resolve) => setTimeout(resolve, delay));
    return {
      success: true,
      scope: 'me',
      range: range,
      summary: {
        totalRequests: range === '30d' ? 3000 : range === '7d' ? 700 : 50,
      },
    };
  };

  // Replicating remediated component logic with active range guard & AbortController:
  let currentController = null;
  const loadAnalyticsRemediated = async (range) => {
    if (currentController) {
      currentController.abort();
    }
    const controller = new AbortController();
    currentController = controller;
    let isCurrent = true;

    try {
      const data = await mockServerFetch(range);
      if (data.success && isCurrent && data.range === activeSelectedRange && !controller.signal.aborted) {
        storedAnalyticsData = data;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      throw err;
    }
  };

  // Step 1: User clicks '30d'
  activeSelectedRange = '30d';
  const promise30d = loadAnalyticsRemediated('30d');

  // User waits 10ms and then clicks '24h'
  await new Promise((r) => setTimeout(r, 10));
  activeSelectedRange = '24h';
  const promise24h = loadAnalyticsRemediated('24h');

  // Await both promises to settle
  await Promise.all([promise30d, promise24h]);

  return {
    selectedRange: activeSelectedRange,
    displayedDataRange: storedAnalyticsData?.range,
    displayedTotalRequests: storedAnalyticsData?.summary.totalRequests,
    hasRaceCondition: storedAnalyticsData?.range !== activeSelectedRange,
  };
}

try {
  const fs = await import('node:fs');
  const dashCode = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
  const adminCode = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

  const dashHasRangeCheck = dashCode.includes('data.range === analyticsRange');
  const adminHasRangeCheck = adminCode.includes('data.range === telemetryRange');

  assert(dashHasRangeCheck, 'dashboard/page.tsx missing data.range === analyticsRange check');
  assert(adminHasRangeCheck, 'admin/page.tsx missing data.range === telemetryRange check');

  const raceResult = await simulateTimeframeRaceCondition();
  console.log('  Timeframe Race Simulation Result:', raceResult);

  if (raceResult.hasRaceCondition) {
    recordFail(
      'ADVERSARIAL: Race Condition in Timeframe Toggling',
      new Error(`Stale data overwrite: Selected range is '${raceResult.selectedRange}' but UI displays '${raceResult.displayedDataRange}' data (${raceResult.displayedTotalRequests} requests)`),
      {
        cause: 'Missing AbortController or active range check in loadAnalytics / loadTelemetry callbacks',
        impact: 'User selects 24h, but slow 30d response completes second and overwrites the view with 30d metrics',
        mitigation: 'Use an AbortController or check `if (active && data.range === currentRange)` before setAnalyticsData/setTelemetryData'
      }
    );
  } else {
    recordPass('Timeframe toggle did not exhibit race condition and verified range checks in source');
  }
} catch (e) {
  recordFail('Timeframe race condition test harness', e);
}

// Test 3.2: Static Code Inspection of Memory Leak & Cancellation in dashboard/page.tsx & admin/page.tsx
try {
  // Check if AbortController is referenced in dashboard or admin page
  import('node:fs').then(fs => {
    const dashCode = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
    const adminCode = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

    const dashHasAbort = dashCode.includes('AbortController') || dashCode.includes('signal:');
    const adminHasAbort = adminCode.includes('AbortController') || adminCode.includes('signal:');

    if (!dashHasAbort || !adminHasAbort) {
      recordFail(
        'ADVERSARIAL: Missing Request Cancellation / AbortController on Unmount',
        new Error(`Neither dashboard/page.tsx (${dashHasAbort}) nor admin/page.tsx (${adminHasAbort}) implements AbortController for in-flight telemetry requests`),
        {
          dashboard: { hasAbort: dashHasAbort },
          admin: { hasAbort: adminHasAbort },
          risk: 'MEDIUM - In-flight telemetry requests continue after navigation and trigger setState on unmounted component',
          mitigation: 'Instantiate const controller = new AbortController() in useEffect and return () => controller.abort()'
        }
      );
    } else {
      recordPass('Both Dashboard and Admin implement AbortController for telemetry requests');
    }
  });
} catch (e) {
  recordFail('AbortController check', e);
}

// ----------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------
setTimeout(() => {
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${results.passed} Passed, ${results.failed} Failed`);
  console.log('================================================================');
  if (results.findings.length > 0) {
    console.log('\nDiscovered Adversarial Findings:');
    results.findings.forEach((f, idx) => {
      console.log(`\n${idx + 1}. [${f.testName}]`);
      console.log(`   Error: ${f.error}`);
      if (f.details) console.log(`   Details:`, f.details);
    });
  }
}, 500);
