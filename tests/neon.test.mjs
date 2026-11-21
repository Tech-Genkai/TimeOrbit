import assert from 'node:assert';
import { isNeonConfigured, getNeonDatabaseUrl } from '../src/lib/neon.ts';

export async function runNeonTests() {
  console.log('\n================================================================');
  console.log('TEST SUITE: neon.ts (Neon Serverless Postgres Integration)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Detection when no URL provided
  test('isNeonConfigured returns false when DATABASE_URL is unset', () => {
    const orig = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.NEON_DATABASE_URL;
    assert.strictEqual(isNeonConfigured(), false);
    if (orig) process.env.DATABASE_URL = orig;
  });

  // 2. Detection when Postgres URL is provided
  test('isNeonConfigured returns true for valid postgresql:// connection string', () => {
    const orig = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://user:pass@ep-cool-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
    assert.strictEqual(isNeonConfigured(), true);
    assert.strictEqual(
      getNeonDatabaseUrl(),
      'postgresql://user:pass@ep-cool-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require'
    );
    if (orig) process.env.DATABASE_URL = orig;
    else delete process.env.DATABASE_URL;
  });

  // 3. Fallback when NEON_DATABASE_URL is used
  test('isNeonConfigured handles NEON_DATABASE_URL fallback', () => {
    const orig = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    process.env.NEON_DATABASE_URL = 'postgres://user:pass@ep-cool-pooler.neon.tech/neondb';
    assert.strictEqual(isNeonConfigured(), true);
    delete process.env.NEON_DATABASE_URL;
    if (orig) process.env.DATABASE_URL = orig;
  });

  return { passed, failed };
}
