import assert from 'node:assert';
import { generateApiKey, hashApiKey, validateApiKey, checkRateLimit } from '@/lib/apiKey';
import { ApiKey } from '@/models/ApiKey';
import { ApiLog } from '@/models/ApiLog';

export async function runApiKeyTests() {
  console.log('\n================================================================');
  console.log('TEST SUITE: apiKey.ts (Generation, Hashing & Rate Limiting)');
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

  // --- 1. generateApiKey ---
  await test('generateApiKey returns secure key structure starting with to_live_', () => {
    const key = generateApiKey();
    assert(key.rawKey.startsWith('to_live_'), 'Key must start with to_live_');
    assert.strictEqual(key.rawKey.length, 56); // 'to_live_' (8) + 48 hex chars = 56
    assert(key.keyPrefix.startsWith('to_live_'));
    assert.strictEqual(key.lastFour.length, 4);
    assert.strictEqual(key.keyHash.length, 64, 'SHA-256 hash must be 64 hex characters');
  });

  // --- 2. hashApiKey ---
  await test('hashApiKey produces deterministic SHA-256 digest', () => {
    const raw = 'to_live_abcdef1234567890';
    const hash1 = hashApiKey(raw);
    const hash2 = hashApiKey(raw);
    const hash3 = hashApiKey(raw + ' '); // trim test
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1, hash3);
    assert.strictEqual(hash1.length, 64);
  });

  // --- 3. validateApiKey ---
  await test('validateApiKey rejects null/empty key with 401', async () => {
    const result1 = await validateApiKey(null);
    assert.strictEqual(result1.valid, false);
    assert.strictEqual(result1.statusCode, 401);

    const result2 = await validateApiKey('');
    assert.strictEqual(result2.valid, false);
    assert.strictEqual(result2.statusCode, 401);
  });

  await test('validateApiKey rejects unknown key with 401', async () => {
    const originalFindOne = ApiKey.findOne;
    ApiKey.findOne = () => ({
      populate: async () => null,
    });

    try {
      const result = await validateApiKey('to_live_nonexistentkey123456');
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.statusCode, 401);
    } finally {
      ApiKey.findOne = originalFindOne;
    }
  });

  await test('validateApiKey handles pending, rejected, and revoked statuses with 403', async () => {
    const originalFindOne = ApiKey.findOne;
    try {
      // Pending
      ApiKey.findOne = () => ({
        populate: async () => ({ status: 'pending' }),
      });
      const pendingRes = await validateApiKey('to_live_pending');
      assert.strictEqual(pendingRes.valid, false);
      assert.strictEqual(pendingRes.statusCode, 403);
      assert(pendingRes.reason.includes('pending'));

      // Rejected
      ApiKey.findOne = () => ({
        populate: async () => ({ status: 'rejected', rejectionReason: 'Spam detected' }),
      });
      const rejectedRes = await validateApiKey('to_live_rejected');
      assert.strictEqual(rejectedRes.valid, false);
      assert.strictEqual(rejectedRes.statusCode, 403);
      assert(rejectedRes.reason.includes('Spam detected'));

      // Revoked
      ApiKey.findOne = () => ({
        populate: async () => ({ status: 'revoked' }),
      });
      const revokedRes = await validateApiKey('to_live_revoked');
      assert.strictEqual(revokedRes.valid, false);
      assert.strictEqual(revokedRes.statusCode, 403);
      assert(revokedRes.reason.includes('revoked'));
    } finally {
      ApiKey.findOne = originalFindOne;
    }
  });

  await test('validateApiKey approves valid active key and updates lastUsedAt', async () => {
    const originalFindOne = ApiKey.findOne;
    let saved = false;
    try {
      const mockDoc = {
        _id: 'mock_key_id_123',
        status: 'approved',
        rateLimit: 120,
        lastUsedAt: null,
        save: async () => { saved = true; },
      };

      ApiKey.findOne = () => ({
        populate: async () => mockDoc,
      });

      const result = await validateApiKey('Bearer to_live_validkey');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.apiKeyDoc._id, 'mock_key_id_123');
      assert(mockDoc.lastUsedAt instanceof Date);
      assert.strictEqual(saved, true);
    } finally {
      ApiKey.findOne = originalFindOne;
    }
  });

  // --- 4. checkRateLimit ---
  await test('checkRateLimit allows requests below quota and reports remaining budget', async () => {
    const originalCount = ApiLog.countDocuments;
    try {
      ApiLog.countDocuments = async () => 25; // 25 requests recorded in window

      const limitCheck = await checkRateLimit('key_123', 60);
      assert.strictEqual(limitCheck.allowed, true);
      assert.strictEqual(limitCheck.remaining, 35);
      assert.strictEqual(limitCheck.resetInSeconds, 60);
    } finally {
      ApiLog.countDocuments = originalCount;
    }
  });

  await test('checkRateLimit rejects requests when threshold is reached or exceeded', async () => {
    const originalCount = ApiLog.countDocuments;
    try {
      ApiLog.countDocuments = async () => 60; // 60 requests reached limit

      const limitCheck = await checkRateLimit('key_123', 60);
      assert.strictEqual(limitCheck.allowed, false);
      assert.strictEqual(limitCheck.remaining, 0);
    } finally {
      ApiLog.countDocuments = originalCount;
    }
  });

  return { passed, failed };
}
