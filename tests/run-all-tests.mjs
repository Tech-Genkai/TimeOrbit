import { runTimeEngineTests } from './timeEngine.test.mjs';
import { runApiKeyTests } from './apiKey.test.mjs';
import { runTokenBucketTests } from './tokenBucket.test.mjs';
import { runEndpointsTests } from './endpoints.test.mjs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

async function main() {
  console.log('================================================================');
  console.log('TIMEORBIT MASTER AUTOMATED VERIFICATION SUITE');
  console.log('================================================================');

  let totalPassed = 0;
  let totalFailed = 0;

  // 1. Core Domain Logic
  const t1 = await runTimeEngineTests();
  totalPassed += t1.passed;
  totalFailed += t1.failed;

  // 2. Authentication & Rate Limiting
  const t2 = await runApiKeyTests();
  totalPassed += t2.passed;
  totalFailed += t2.failed;

  // 3. Token Bucket Algorithm Suite
  const tToken = await runTokenBucketTests();
  totalPassed += tToken.passed;
  totalFailed += tToken.failed;

  // 4. REST API Endpoints
  const t3 = await runEndpointsTests();
  totalPassed += t3.passed;
  totalFailed += t3.failed;

  // 4. Analytics Empirical Challenge Suite (29 tests)
  console.log('\nRunning Analytics Empirical Challenge Suite...');
  const res1 = spawnSync(process.execPath, [
    '--loader',
    './tests/test-loader.mjs',
    path.join(process.cwd(), 'tests', 'analytics_empirical_challenge.mjs'),
  ], {
    stdio: 'inherit',
    env: { ...process.env, MOCK_API_KEY: '1' },
  });

  if (res1.status === 0) {
    totalPassed += 29;
  } else {
    totalFailed += 1;
  }

  // 5. Adversarial Telemetry Stress Suite (11 tests)
  console.log('\nRunning Adversarial Telemetry Stress Suite...');
  const res2 = spawnSync(process.execPath, [
    path.join(process.cwd(), 'tests', 'adversarial_telemetry_stress.mjs'),
  ], { stdio: 'inherit' });

  if (res2.status === 0) {
    totalPassed += 11;
  } else {
    totalFailed += 1;
  }

  console.log('\n================================================================');
  console.log(`GRAND TOTAL TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
