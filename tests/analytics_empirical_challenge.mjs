/**
 * Empirical Adversarial Test Harness for Route Handler: `src/app/api/analytics/route.ts`
 * 
 * Tests:
 * 1. Unauthenticated requests -> HTTP 401 Unauthorized
 * 2. Non-admin access with scope=global -> HTTP 403 Forbidden (User vs Admin)
 * 3. Invalid range query parameter -> HTTP 400 Bad Request
 * 4. OPTIONS handler -> HTTP 204/200 with proper CORS headers
 * 5. Empty log state -> Aggregation returns clean 0s rather than NaN
 * 6. Non-empty log states & boundary cases -> Correct calculations and no NaN/Infinity
 */

import assert from 'node:assert';
import mongoose from 'mongoose';

globalThis.__mockApiKeyModule = true;

import { GET, OPTIONS } from '../src/app/api/analytics/route.ts';
import { ApiLog } from '../src/models/ApiLog.ts';

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function pass(name, detail = '') {
  results.passed++;
  results.tests.push({ name, status: 'PASS', detail });
  console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${name} ${detail ? `(${detail})` : ''}`);
}

function fail(name, error, detail = '') {
  results.failed++;
  results.tests.push({ name, status: 'FAIL', error: error?.message || String(error), detail });
  console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${name}`);
  console.error(`         Error: ${error?.message || error}`);
  if (detail) console.error(`         Detail:`, detail);
}

// Reset mocks before each test
function resetMocks() {
  globalThis.__mockConnectToDatabase = async () => Promise.resolve();
  globalThis.__mockValidateApiKey = null;
  globalThis.__mockGetSessionUser = null;
}

console.log('================================================================');
console.log('EMPIRICAL CHALLENGER: src/app/api/analytics/route.ts TEST SUITE');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// 1. Unauthenticated requests: HTTP 401 Unauthorized
// ----------------------------------------------------------------------
console.log('--- 1. Testing Unauthenticated & Invalid Auth Requests ---');

// 1.1 No credentials provided
try {
  resetMocks();
  const req = new Request('http://localhost:3000/api/analytics');
  const res = await GET(req);
  assert.strictEqual(res.status, 401, `Expected status 401, got ${res.status}`);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert(body.error.includes('Unauthorized'), `Error message must indicate unauthorized: ${body.error}`);
  assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  pass('1.1 Request with no credentials returns HTTP 401 Unauthorized with CORS header', `Status: ${res.status}`);
} catch (err) {
  fail('1.1 Request with no credentials', err);
}

// 1.2 Invalid API key in x-api-key header
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: false,
    reason: 'Invalid API key. The key does not exist.',
    statusCode: 401,
  });
  const req = new Request('http://localhost:3000/api/analytics', {
    headers: { 'x-api-key': 'to_live_nonexistentkey12345' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 401, `Expected status 401, got ${res.status}`);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error, 'Invalid API key. The key does not exist.');
  pass('1.2 Invalid API key in x-api-key returns HTTP 401 Unauthorized', `Status: ${res.status}`);
} catch (err) {
  fail('1.2 Invalid API key in x-api-key', err);
}

// 1.3 Invalid API key in Authorization: Bearer header
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: false,
    reason: 'Invalid API key. The key does not exist.',
    statusCode: 401,
  });
  const req = new Request('http://localhost:3000/api/analytics', {
    headers: { authorization: 'Bearer to_live_bogusbearerkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 401, `Expected status 401, got ${res.status}`);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  pass('1.3 Invalid API key in Authorization Bearer returns HTTP 401 Unauthorized', `Status: ${res.status}`);
} catch (err) {
  fail('1.3 Invalid API key in Authorization Bearer', err);
}

// 1.4 Pending or Revoked API Key (HTTP 403 from validateApiKey)
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: false,
    reason: 'This API key has been revoked and can no longer be used.',
    statusCode: 403,
  });
  const req = new Request('http://localhost:3000/api/analytics', {
    headers: { 'x-api-key': 'to_live_revokedkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 403, `Expected status 403, got ${res.status}`);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert(body.error.includes('revoked'));
  pass('1.4 Revoked API key returns HTTP 403 Forbidden as instructed by key validator', `Status: ${res.status}`);
} catch (err) {
  fail('1.4 Revoked API key', err);
}


// ----------------------------------------------------------------------
// 2. Non-admin access with scope=global: HTTP 403 Forbidden
// ----------------------------------------------------------------------
console.log('\n--- 2. Testing Role Scoping (scope=global & admin check) ---');

// 2.1 Authenticated non-admin user via API Key requesting scope=global
try {
  resetMocks();
  const normalUserId = new mongoose.Types.ObjectId();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: {
      userId: {
        _id: normalUserId,
        role: 'user',
      },
    },
  });

  const req = new Request('http://localhost:3000/api/analytics?scope=global', {
    headers: { 'x-api-key': 'to_live_validnormalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 403, `Expected status 403, got ${res.status}`);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error, 'Forbidden: Admin access required for global analytics.');
  assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  pass('2.1 Non-admin API key user with scope=global returns HTTP 403 Forbidden', `Status: ${res.status}`);
} catch (err) {
  fail('2.1 Non-admin API key user with scope=global', err);
}

// 2.2 Authenticated non-admin user via session cookie requesting scope=global
try {
  resetMocks();
  const normalUserId = new mongoose.Types.ObjectId();
  globalThis.__mockGetSessionUser = async () => ({
    _id: normalUserId,
    role: 'user',
  });

  const req = new Request('http://localhost:3000/api/analytics?scope=global');
  const res = await GET(req);
  assert.strictEqual(res.status, 403, `Expected status 403, got ${res.status}`);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error, 'Forbidden: Admin access required for global analytics.');
  pass('2.2 Non-admin session cookie user with scope=global returns HTTP 403 Forbidden', `Status: ${res.status}`);
} catch (err) {
  fail('2.2 Non-admin session cookie user with scope=global', err);
}

// 2.3 Admin access with scope=global -> Permitted (HTTP 200)
try {
  resetMocks();
  const adminId = new mongoose.Types.ObjectId();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: {
      userId: {
        _id: adminId,
        role: 'admin',
      },
    },
  });

  // Mock empty aggregation
  ApiLog.aggregate = async () => [];
  ApiLog.find = () => ({
    sort: () => ({
      limit: () => ({
        lean: async () => [],
      }),
    }),
  });

  const req = new Request('http://localhost:3000/api/analytics?scope=global', {
    headers: { 'x-api-key': 'to_live_validadminkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
  const body = await res.json();
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.scope, 'global');
  pass('2.3 Admin user with scope=global is permitted and returns HTTP 200 OK', `Scope: ${body.scope}`);
} catch (err) {
  fail('2.3 Admin user with scope=global', err);
}

// 2.4 Non-admin with scope=me -> Permitted (HTTP 200 scoped to user)
try {
  resetMocks();
  const normalUserId = new mongoose.Types.ObjectId();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: {
      userId: {
        _id: normalUserId,
        role: 'user',
      },
    },
  });

  let capturedQuery = null;
  ApiLog.aggregate = async (pipeline) => {
    capturedQuery = pipeline[0].$match;
    return [];
  };
  ApiLog.find = () => ({
    sort: () => ({
      limit: () => ({
        lean: async () => [],
      }),
    }),
  });

  const req = new Request('http://localhost:3000/api/analytics?scope=me', {
    headers: { 'x-api-key': 'to_live_validnormalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
  const body = await res.json();
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.scope, 'me');
  assert(capturedQuery && String(capturedQuery.userId) === String(normalUserId), 'match query must scope to authenticated user ID');
  pass('2.4 Non-admin with scope=me is permitted and strictly scopes DB match to user ObjectId', `UserId: ${capturedQuery.userId}`);
} catch (err) {
  fail('2.4 Non-admin with scope=me', err);
}


// ----------------------------------------------------------------------
// 3. Invalid range query parameter: HTTP 400 Bad Request
// ----------------------------------------------------------------------
console.log('\n--- 3. Testing Range Parameter Validation ---');

const invalidRanges = ['invalid', '1y', 'yesterday', '60d', '..', 'null', 'select *'];

for (const badRange of invalidRanges) {
  try {
    resetMocks();
    globalThis.__mockValidateApiKey = async () => ({
      valid: true,
      apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'user' } },
    });

    const req = new Request(`http://localhost:3000/api/analytics?range=${encodeURIComponent(badRange)}`, {
      headers: { 'x-api-key': 'to_live_normalkey' },
    });
    const res = await GET(req);
    assert.strictEqual(res.status, 400, `Expected status 400 for range='${badRange}', got ${res.status}`);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert(body.error.includes('Invalid range'), `Error must mention invalid range: ${body.error}`);
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
    pass(`3.1 Invalid range '${badRange}' rejected with HTTP 400 Bad Request`);
  } catch (err) {
    fail(`3.1 Invalid range '${badRange}' rejection`, err);
  }
}

// Test omitted range (defaults to 7d)
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'user' } },
  });
  ApiLog.aggregate = async () => [];
  ApiLog.find = () => ({
    sort: () => ({ limit: () => ({ lean: async () => [] }) }),
  });

  const req = new Request('http://localhost:3000/api/analytics', {
    headers: { 'x-api-key': 'to_live_normalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.range, '7d');
  pass("3.2 Omitted range defaults to '7d' with HTTP 200 OK");
} catch (err) {
  fail("3.2 Omitted range default", err);
}

// Also test invalid 'timeframe' fallback parameter
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'user' } },
  });

  const req = new Request('http://localhost:3000/api/analytics?timeframe=unsupported', {
    headers: { 'x-api-key': 'to_live_normalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 400);
  pass('3.2 Timeframe fallback with invalid value returns HTTP 400 Bad Request');
} catch (err) {
  fail('3.2 Timeframe fallback', err);
}

// Test supported valid ranges
const validRanges = ['24h', '7d', '30d', 'all'];
for (const goodRange of validRanges) {
  try {
    resetMocks();
    globalThis.__mockValidateApiKey = async () => ({
      valid: true,
      apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'user' } },
    });
    ApiLog.aggregate = async () => [];
    ApiLog.find = () => ({
      sort: () => ({ limit: () => ({ lean: async () => [] }) }),
    });

    const req = new Request(`http://localhost:3000/api/analytics?range=${goodRange}`, {
      headers: { 'x-api-key': 'to_live_normalkey' },
    });
    const res = await GET(req);
    assert.strictEqual(res.status, 200, `Expected 200 for range=${goodRange}`);
    const body = await res.json();
    assert.strictEqual(body.range, goodRange);
    pass(`3.3 Valid range '${goodRange}' accepted with HTTP 200 OK`);
  } catch (err) {
    fail(`3.3 Valid range '${goodRange}'`, err);
  }
}


// ----------------------------------------------------------------------
// 4. OPTIONS handler: HTTP 204 or 200 with proper CORS headers
// ----------------------------------------------------------------------
console.log('\n--- 4. Testing OPTIONS Preflight Handler & CORS Headers ---');

try {
  const res = await OPTIONS();
  assert(res.status === 204 || res.status === 200, `OPTIONS status should be 204 or 200, got ${res.status}`);
  const allowOrigin = res.headers.get('Access-Control-Allow-Origin');
  const allowMethods = res.headers.get('Access-Control-Allow-Methods');
  const allowHeaders = res.headers.get('Access-Control-Allow-Headers');

  assert.strictEqual(allowOrigin, '*', `Access-Control-Allow-Origin should be '*', got '${allowOrigin}'`);
  assert(allowMethods.includes('GET'), `Access-Control-Allow-Methods must include GET: '${allowMethods}'`);
  assert(allowMethods.includes('OPTIONS'), `Access-Control-Allow-Methods must include OPTIONS: '${allowMethods}'`);
  assert(allowHeaders.toLowerCase().includes('content-type'), `Access-Control-Allow-Headers must include Content-Type`);
  assert(allowHeaders.toLowerCase().includes('authorization'), `Access-Control-Allow-Headers must include Authorization`);
  assert(allowHeaders.toLowerCase().includes('x-api-key'), `Access-Control-Allow-Headers must include x-api-key`);

  pass('4.1 OPTIONS handler returns HTTP 204 with comprehensive CORS headers', `Status: ${res.status}, Origin: ${allowOrigin}`);
} catch (err) {
  fail('4.1 OPTIONS handler', err);
}


// ----------------------------------------------------------------------
// 5. Empty log state: verify aggregation returns 0 values rather than NaN
// ----------------------------------------------------------------------
console.log('\n--- 5. Testing Empty Log State (Zero NaN / Zero Division / Pure 0s) ---');

try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'user' } },
  });

  // Empty aggregation results for all 5 queries
  ApiLog.aggregate = async () => [];
  ApiLog.find = () => ({
    sort: () => ({ limit: () => ({ lean: async () => [] }) }),
  });

  const req = new Request('http://localhost:3000/api/analytics', {
    headers: { 'x-api-key': 'to_live_normalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);

  const rawJsonText = await res.text();
  assert(!rawJsonText.includes('NaN'), `Serialized JSON must NOT contain 'NaN': ${rawJsonText}`);
  assert(!rawJsonText.includes('null') || rawJsonText.includes('"_id":null') === false, `JSON must not contain unhandled nulls`);

  const body = JSON.parse(rawJsonText);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.summary.totalRequests, 0);
  assert.strictEqual(body.summary.avgResponseTimeMs, 0);
  assert.strictEqual(body.summary.minResponseTimeMs, 0);
  assert.strictEqual(body.summary.maxResponseTimeMs, 0);
  assert.strictEqual(body.summary.successRate, 0);

  assert(!Number.isNaN(body.summary.avgResponseTimeMs), 'avgResponseTimeMs is NaN');
  assert(!Number.isNaN(body.summary.minResponseTimeMs), 'minResponseTimeMs is NaN');
  assert(!Number.isNaN(body.summary.maxResponseTimeMs), 'maxResponseTimeMs is NaN');
  assert(!Number.isNaN(body.summary.successRate), 'successRate is NaN');

  assert.deepStrictEqual(body.requestsOverTime, []);
  assert.deepStrictEqual(body.endpointBreakdown, []);
  assert.deepStrictEqual(body.statusDistribution, []);
  assert.deepStrictEqual(body.recentLogs, []);

  pass('5.1 Empty log state returns zeroed summary metrics without NaN or undefined fields');
} catch (err) {
  fail('5.1 Empty log state', err);
}


// ----------------------------------------------------------------------
// 6. Non-empty log states & boundary cases: Precision and Math Correctness
// ----------------------------------------------------------------------
console.log('\n--- 6. Testing Realistic & Boundary Telemetry Data Aggregations ---');

// 6.1 Single successful request
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'user' } },
  });

  let aggregateCallCount = 0;
  ApiLog.aggregate = async () => {
    aggregateCallCount++;
    if (aggregateCallCount === 1) {
      // Summary
      return [{
        _id: null,
        totalRequests: 1,
        avgResponseTimeMs: 42.48,
        minResponseTimeMs: 42.48,
        maxResponseTimeMs: 42.48,
        successCount: 1,
      }];
    } else if (aggregateCallCount === 2) {
      // requestsOverTime
      return [{ _id: '2026-10-23', count: 1, avgLatency: 42.48 }];
    } else if (aggregateCallCount === 3) {
      // endpointBreakdown
      return [{ _id: '/api/v1/time', count: 1, avgResponseTime: 42.48 }];
    } else if (aggregateCallCount === 4) {
      // statusDistribution
      return [{ _id: 200, count: 1 }];
    }
    return [];
  };

  const sampleLogDate = new Date('2026-10-23T15:30:00.000Z');
  ApiLog.find = () => ({
    sort: () => ({
      limit: () => ({
        lean: async () => [{
          _id: new mongoose.Types.ObjectId(),
          endpoint: '/api/v1/time',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 42,
          ipAddress: '127.0.0.1',
          createdAt: sampleLogDate,
        }],
      }),
    }),
  });

  const req = new Request('http://localhost:3000/api/analytics', {
    headers: { 'x-api-key': 'to_live_normalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const body = await res.json();

  assert.strictEqual(body.summary.totalRequests, 1);
  assert.strictEqual(body.summary.avgResponseTimeMs, 42.5); // Math.round(42.48 * 10) / 10
  assert.strictEqual(body.summary.minResponseTimeMs, 42);
  assert.strictEqual(body.summary.maxResponseTimeMs, 42);
  assert.strictEqual(body.summary.successRate, 100);

  assert.strictEqual(body.requestsOverTime[0].date, '2026-10-23');
  assert.strictEqual(body.requestsOverTime[0].avgLatency, 42.5);
  assert.strictEqual(body.requestsOverTime[0].avgResponseTime, 42.5);

  assert.strictEqual(body.endpointBreakdown[0].endpoint, '/api/v1/time');
  assert.strictEqual(body.endpointBreakdown[0].count, 1);
  assert.strictEqual(body.endpointBreakdown[0].percentage, 100);

  assert.strictEqual(body.statusDistribution[0].statusCode, 200);
  assert.strictEqual(body.statusDistribution[0].count, 1);
  assert.strictEqual(body.statusDistribution[0].percentage, 100);

  assert.strictEqual(body.recentLogs.length, 1);
  assert.strictEqual(body.recentLogs[0].createdAt, sampleLogDate.toISOString());

  pass('6.1 Single request aggregation computes 100% percentages, 1-decimal latencies, and valid ISO date');
} catch (err) {
  fail('6.1 Single request aggregation', err);
}

// 6.2 High volume mixed traffic (100,000 requests, 99.4% success rate)
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'admin' } },
  });

  let aggregateCallCount = 0;
  ApiLog.aggregate = async () => {
    aggregateCallCount++;
    if (aggregateCallCount === 1) {
      return [{
        _id: null,
        totalRequests: 100000,
        avgResponseTimeMs: 38.64,
        minResponseTimeMs: 4,
        maxResponseTimeMs: 1250,
        successCount: 99400,
      }];
    } else if (aggregateCallCount === 2) {
      return [
        { _id: '2026-10-22', count: 40000, avgLatency: 36.2 },
        { _id: '2026-10-23', count: 60000, avgLatency: 40.1 },
      ];
    } else if (aggregateCallCount === 3) {
      return [
        { _id: '/api/v1/time', count: 70000, avgResponseTime: 35.1 },
        { _id: '/api/v1/compare', count: 30000, avgResponseTime: 46.8 },
      ];
    } else if (aggregateCallCount === 4) {
      return [
        { _id: 200, count: 99400 },
        { _id: 404, count: 600 },
      ];
    }
    return [];
  };

  ApiLog.find = () => ({
    sort: () => ({ limit: () => ({ lean: async () => [] }) }),
  });

  const req = new Request('http://localhost:3000/api/analytics?scope=global&range=30d', {
    headers: { 'x-api-key': 'to_live_adminkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const body = await res.json();

  assert.strictEqual(body.summary.totalRequests, 100000);
  assert.strictEqual(body.summary.avgResponseTimeMs, 38.6);
  assert.strictEqual(body.summary.minResponseTimeMs, 4);
  assert.strictEqual(body.summary.maxResponseTimeMs, 1250);
  assert.strictEqual(body.summary.successRate, 99.4);

  assert.strictEqual(body.endpointBreakdown[0].percentage, 70);
  assert.strictEqual(body.endpointBreakdown[1].percentage, 30);
  assert.strictEqual(body.statusDistribution[0].percentage, 99.4);
  assert.strictEqual(body.statusDistribution[1].percentage, 0.6);

  pass('6.2 High volume mixed traffic (100k requests) accurately calculates proportions and success rates');
} catch (err) {
  fail('6.2 High volume mixed traffic', err);
}

// 6.3 All failed requests (100% 500 errors -> successRate = 0)
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'user' } },
  });

  let aggregateCallCount = 0;
  ApiLog.aggregate = async () => {
    aggregateCallCount++;
    if (aggregateCallCount === 1) {
      return [{
        _id: null,
        totalRequests: 50,
        avgResponseTimeMs: 12.0,
        minResponseTimeMs: 10,
        maxResponseTimeMs: 15,
        successCount: 0,
      }];
    }
    return [];
  };

  ApiLog.find = () => ({
    sort: () => ({ limit: () => ({ lean: async () => [] }) }),
  });

  const req = new Request('http://localhost:3000/api/analytics', {
    headers: { 'x-api-key': 'to_live_normalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.summary.totalRequests, 50);
  assert.strictEqual(body.summary.successRate, 0);
  pass('6.3 100% failing traffic computes successRate: 0 without error');
} catch (err) {
  fail('6.3 All failed requests', err);
}

// 6.4 range=all query filter verification (no createdAt constraint in matchQuery)
try {
  resetMocks();
  const userId = new mongoose.Types.ObjectId();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: { userId: { _id: userId, role: 'user' } },
  });

  let capturedQuery = null;
  ApiLog.aggregate = async (pipeline) => {
    capturedQuery = pipeline[0].$match;
    return [];
  };
  ApiLog.find = () => ({
    sort: () => ({ limit: () => ({ lean: async () => [] }) }),
  });

  const req = new Request('http://localhost:3000/api/analytics?range=all', {
    headers: { 'x-api-key': 'to_live_normalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.range, 'all');
  assert.strictEqual(capturedQuery.createdAt, undefined, 'range=all must not restrict createdAt');
  pass('6.4 range=all query accurately omits createdAt constraint from MongoDB query');
} catch (err) {
  fail('6.4 range=all query verification', err);
}

// 6.5 Database connection failure gracefully returns HTTP 500 with CORS
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'user' } },
  });
  globalThis.__mockConnectToDatabase = async () => {
    throw new Error('Database cluster connection timeout');
  };

  const req = new Request('http://localhost:3000/api/analytics', {
    headers: { 'x-api-key': 'to_live_normalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 500);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error, 'Database cluster connection timeout');
  assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
  pass('6.5 Database connection failure returns HTTP 500 with CORS header');
} catch (err) {
  fail('6.5 Database connection failure', err);
}

// 6.6 Null values in aggregation arrays (missing endpoint, null dates)
try {
  resetMocks();
  globalThis.__mockValidateApiKey = async () => ({
    valid: true,
    apiKeyDoc: { userId: { _id: new mongoose.Types.ObjectId(), role: 'user' } },
  });

  let callCount = 0;
  ApiLog.aggregate = async () => {
    callCount++;
    if (callCount === 1) {
      return [{ _id: null, totalRequests: 2, avgResponseTimeMs: null, minResponseTimeMs: null, maxResponseTimeMs: null, successCount: null }];
    } else if (callCount === 2) {
      return [{ _id: '2026-10-23', count: 2, avgLatency: null }];
    } else if (callCount === 3) {
      return [{ _id: null, count: 2, avgResponseTime: null }]; // Null endpoint
    } else if (callCount === 4) {
      return [{ _id: 200, count: 2 }];
    }
    return [];
  };

  ApiLog.find = () => ({
    sort: () => ({
      limit: () => ({
        lean: async () => [{
          _id: new mongoose.Types.ObjectId(),
          endpoint: '/api/v1/time',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 20,
          ipAddress: null, // null ipAddress
          createdAt: '2026-10-23T12:00:00.000Z',
        }],
      }),
    }),
  });

  const req = new Request('http://localhost:3000/api/analytics', {
    headers: { 'x-api-key': 'to_live_normalkey' },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const body = await res.json();

  assert.strictEqual(body.summary.avgResponseTimeMs, 0);
  assert.strictEqual(body.summary.minResponseTimeMs, 0);
  assert.strictEqual(body.summary.maxResponseTimeMs, 0);
  assert.strictEqual(body.summary.successRate, 0);
  assert.strictEqual(body.endpointBreakdown[0].endpoint, 'unknown');
  assert.strictEqual(body.recentLogs[0].ipAddress, 'unknown');

  pass('6.6 Aggregation with null fields cleanly defaults to 0 and unknown without crashing');
} catch (err) {
  fail('6.6 Null values in aggregation', err);
}


// ----------------------------------------------------------------------
// 7. Summary Report
// ----------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${results.passed + results.failed}`);
console.log(`PASSED: ${results.passed}`);
console.log(`FAILED: ${results.failed}`);
console.log('================================================================');

if (results.failed > 0) {
  console.error('\nFAILURE DETAILS:');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.error(`- ${t.name}: ${t.error}`);
  });
  process.exit(1);
} else {
  console.log('\nALL EMPIRICAL TESTS PASSED WITH 100% SUCCESS RATE.');
  process.exit(0);
}
