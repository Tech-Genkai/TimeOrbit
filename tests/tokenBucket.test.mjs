import assert from 'node:assert';
import { TokenBucketLimiter, checkTokenBucketRateLimit } from '../src/lib/tokenBucket.ts';

export async function runTokenBucketTests() {
  console.log('\n================================================================');
  console.log('TEST SUITE: Token Bucket Algorithm (Burst, Refill & Concurrency)');
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

  // --- 1. Initial State & Full Capacity ---
  await test('Initial request receives full capacity minus 1 consumed token', () => {
    const limiter = new TokenBucketLimiter();
    const result = limiter.consume('user_key_1', 60);

    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.limit, 60);
    assert.strictEqual(result.remaining, 59);
    assert.strictEqual(result.cost, 1);
  });

  // --- 2. Burst Handling ---
  await test('Handles rapid burst of requests up to full capacity without rejection', () => {
    const limiter = new TokenBucketLimiter();
    const key = 'burst_user';
    const limit = 30;

    // Fire 30 requests instantaneously
    for (let i = 0; i < limit; i++) {
      const res = limiter.consume(key, limit);
      assert.strictEqual(res.allowed, true, `Request ${i + 1} should be allowed`);
      assert.strictEqual(res.remaining, limit - 1 - i);
    }

    // 31st request should be immediately rejected (bucket empty)
    const blockedRes = limiter.consume(key, limit);
    assert.strictEqual(blockedRes.allowed, false);
    assert.strictEqual(blockedRes.remaining, 0);
    assert(blockedRes.resetInSeconds >= 1, 'Should provide positive resetInSeconds');
  });

  // --- 3. Mathematical Refill Over Time ---
  await test('Refills tokens continuously according to elapsed wall-clock time', () => {
    const limiter = new TokenBucketLimiter();
    const key = 'refill_user';
    const limit = 60; // 60 req/min = 1 token per second

    // Drain all 60 tokens
    for (let i = 0; i < 60; i++) {
      limiter.consume(key, limit);
    }

    // Verify bucket is empty
    let emptyCheck = limiter.consume(key, limit);
    assert.strictEqual(emptyCheck.allowed, false);

    // Simulate 3 seconds passing by setting lastRefill in the past
    const state = limiter.getState(key);
    assert(state, 'Bucket state must exist');
    limiter.setState(key, {
      ...state,
      lastRefill: Date.now() - 3000, // 3 seconds ago
    });

    // Bucket should now have 3 refilled tokens!
    // Consuming 1 should leave 2
    const refilledRes1 = limiter.consume(key, limit);
    assert.strictEqual(refilledRes1.allowed, true);
    assert.strictEqual(refilledRes1.remaining, 2);

    const refilledRes2 = limiter.consume(key, limit);
    assert.strictEqual(refilledRes2.allowed, true);
    assert.strictEqual(refilledRes2.remaining, 1);

    const refilledRes3 = limiter.consume(key, limit);
    assert.strictEqual(refilledRes3.allowed, true);
    assert.strictEqual(refilledRes3.remaining, 0);

    // 4th request without more time should be blocked
    const refilledRes4 = limiter.consume(key, limit);
    assert.strictEqual(refilledRes4.allowed, false);
  });

  // --- 4. Custom Burst Multiplier ---
  await test('Burst multiplier allows higher instantaneous capacity (e.g. 1.5x)', () => {
    const limiter = new TokenBucketLimiter();
    const key = 'burst_multiplier_user';
    // 60 req/min with 1.5x burst = 90 token capacity
    const res = limiter.consume(key, 60, { burstMultiplier: 1.5 });

    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.limit, 90);
    assert.strictEqual(res.remaining, 89);
  });

  // --- 5. Variable Request Cost ---
  await test('Deducts variable token cost for heavyweight requests', () => {
    const limiter = new TokenBucketLimiter();
    const key = 'heavy_user';
    const limit = 100;

    // Heavy request costing 25 tokens
    const heavy1 = limiter.consume(key, limit, { cost: 25 });
    assert.strictEqual(heavy1.allowed, true);
    assert.strictEqual(heavy1.remaining, 75);

    // Heavy request costing 80 tokens (should fail, only 75 available)
    const heavy2 = limiter.consume(key, limit, { cost: 80 });
    assert.strictEqual(heavy2.allowed, false);
    assert.strictEqual(heavy2.remaining, 75); // tokens unconsumed on failure
  });

  // --- 6. Multi-Tenant Key Isolation ---
  await test('Complete isolation between different API keys', () => {
    const limiter = new TokenBucketLimiter();
    const keyA = 'client_alpha';
    const keyB = 'client_beta';

    // Exhaust Key A completely
    for (let i = 0; i < 10; i++) {
      limiter.consume(keyA, 10);
    }
    const resA = limiter.consume(keyA, 10);
    assert.strictEqual(resA.allowed, false);

    // Key B should remain completely unaffected with full budget
    const resB = limiter.consume(keyB, 10);
    assert.strictEqual(resB.allowed, true);
    assert.strictEqual(resB.remaining, 9);
  });

  // --- 7. Peek Method ---
  await test('Peek inspects remaining budget without consuming tokens', () => {
    const limiter = new TokenBucketLimiter();
    const key = 'peek_user';

    const peek1 = limiter.peek(key, 60);
    assert.strictEqual(peek1.remaining, 60);

    // Peek again - still 60 because nothing was consumed
    const peek2 = limiter.peek(key, 60);
    assert.strictEqual(peek2.remaining, 60);

    // Now consume 1
    limiter.consume(key, 60);
    const peek3 = limiter.peek(key, 60);
    assert.strictEqual(peek3.remaining, 59);
  });

  // --- 8. Stale Eviction Cleanup ---
  await test('Cleanup evicts stale keys to prevent memory leaks', () => {
    const limiter = new TokenBucketLimiter();
    limiter.consume('active_key', 60);
    limiter.consume('stale_key', 60);

    // Age stale_key to 20 minutes ago
    const staleState = limiter.getState('stale_key');
    assert(staleState);
    limiter.setState('stale_key', {
      ...staleState,
      lastRefill: Date.now() - 20 * 60 * 1000,
    });

    const evictedCount = limiter.cleanup(15 * 60 * 1000); // 15 min TTL
    assert.strictEqual(evictedCount, 1);
    assert.strictEqual(limiter.getState('stale_key'), undefined);
    assert.notStrictEqual(limiter.getState('active_key'), undefined);
  });

  // --- 9. High-level checkTokenBucketRateLimit Helper ---
  await test('checkTokenBucketRateLimit helper returns RateLimitResult interface', async () => {
    const res = await checkTokenBucketRateLimit('helper_key_test', 120);
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.remaining, 119);
    assert.strictEqual(res.limit, 120);
  });

  return { passed, failed };
}
