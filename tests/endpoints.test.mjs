import assert from 'node:assert';
import { GET as getTimeHandler } from '@/app/api/v1/time/route';
import { GET as getCompareHandler } from '@/app/api/v1/compare/route';
import { GET as getZonesHandler } from '@/app/api/v1/zones/route';
import { ApiKey } from '@/models/ApiKey';
import { ApiLog } from '@/models/ApiLog';

export async function runEndpointsTests() {
  console.log('\n================================================================');
  console.log('TEST SUITE: REST API Endpoints (/api/v1/time, compare, zones)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✖ [FAIL] ${name}:`, err.message);
    }
  }

  // --- 1. /api/v1/time ---
  await test('GET /api/v1/time returns 401 Unauthorized when API key is missing', async () => {
    const req = new Request('http://localhost:3000/api/v1/time?location=London');
    const res = await getTimeHandler(req);
    assert.strictEqual(res.status, 401);
    const json = await res.json();
    assert.strictEqual(json.success, false);
  });

  await test('GET /api/v1/time returns 404 for unknown location with valid key', async () => {
    const origFindOne = ApiKey.findOne;
    const origCreate = ApiLog.create;
    ApiKey.findOne = () => ({
      populate: async () => ({
        _id: 'key_123',
        status: 'approved',
        rateLimit: 60,
        save: async () => {},
      }),
    });
    ApiLog.create = async () => {};
    ApiLog.countDocuments = async () => 0;

    try {
      const req = new Request('http://localhost:3000/api/v1/time?location=AtlantisCity', {
        headers: { 'x-api-key': 'to_live_valid' },
      });
      const res = await getTimeHandler(req);
      assert.strictEqual(res.status, 404);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert(json.error.includes('not found'));
    } finally {
      ApiKey.findOne = origFindOne;
      ApiLog.create = origCreate;
    }
  });

  await test('GET /api/v1/time returns 200 with time data and rate limit headers for valid city', async () => {
    const origFindOne = ApiKey.findOne;
    const origCreate = ApiLog.create;
    ApiKey.findOne = () => ({
      populate: async () => ({
        _id: 'key_123',
        status: 'approved',
        rateLimit: 100,
        save: async () => {},
      }),
    });
    ApiLog.create = async () => {};
    ApiLog.countDocuments = async () => 10;

    try {
      const req = new Request('http://localhost:3000/api/v1/time?location=Tokyo', {
        headers: { 'x-api-key': 'to_live_valid' },
      });
      const res = await getTimeHandler(req);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('X-RateLimit-Limit'), '100');
      assert.strictEqual(res.headers.get('X-RateLimit-Remaining'), '90');

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.city, 'Tokyo');
      assert(typeof json.data.utcOffset === 'string');
      assert(typeof json.data.solarState === 'string');
    } finally {
      ApiKey.findOne = origFindOne;
      ApiLog.create = origCreate;
    }
  });

  // --- 2. /api/v1/compare ---
  await test('GET /api/v1/compare returns 401 when API key is missing', async () => {
    const req = new Request('http://localhost:3000/api/v1/compare?from=Tokyo&to=London');
    const res = await getCompareHandler(req);
    assert.strictEqual(res.status, 401);
  });

  await test('GET /api/v1/compare returns 200 with comparison matrix for valid cities', async () => {
    const origFindOne = ApiKey.findOne;
    const origCreate = ApiLog.create;
    ApiKey.findOne = () => ({
      populate: async () => ({
        _id: 'key_123',
        status: 'approved',
        rateLimit: 60,
        save: async () => {},
      }),
    });
    ApiLog.create = async () => {};
    ApiLog.countDocuments = async () => 0;

    try {
      const req = new Request('http://localhost:3000/api/v1/compare?from=Tokyo&to=London', {
        headers: { 'x-api-key': 'to_live_valid' },
      });
      const res = await getCompareHandler(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert(json.data.from.city === 'Tokyo');
      assert(json.data.to.city === 'London');
      assert(Array.isArray(json.data.timeline24h));
      assert.strictEqual(json.data.timeline24h.length, 24);
    } finally {
      ApiKey.findOne = origFindOne;
      ApiLog.create = origCreate;
    }
  });

  // --- 3. /api/v1/zones ---
  await test('GET /api/v1/zones is publicly accessible and returns city list', async () => {
    const req = new Request('http://localhost:3000/api/v1/zones');
    const res = await getZonesHandler(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.count > 0);
    assert(Array.isArray(json.cities));
  });

  await test('GET /api/v1/zones?q=tokyo filters cities accurately', async () => {
    const req = new Request('http://localhost:3000/api/v1/zones?q=tokyo');
    const res = await getZonesHandler(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.cities.some(c => c.city.toLowerCase() === 'tokyo'));
  });

  return { passed, failed };
}
