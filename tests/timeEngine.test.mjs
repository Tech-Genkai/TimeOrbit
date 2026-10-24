import assert from 'node:assert';
import { getCityTime, calculateSolarState, compareCities } from '@/lib/timeEngine';
import { CITIES, findCity } from '@/lib/cities';

export async function runTimeEngineTests() {
  console.log('\n================================================================');
  console.log('TEST SUITE: timeEngine.ts (Astrological & Time Calculations)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✖ [FAIL] ${name}:`, err.message);
    }
  }

  // --- 1. getCityTime Happy Paths & Conversions ---
  test('Tokyo time formatting and positive UTC offset', () => {
    const tokyo = findCity('Tokyo');
    assert(tokyo, 'Tokyo should be found in cities');
    const fixedDate = new Date('2026-06-15T12:00:00Z');
    const result = getCityTime(tokyo, fixedDate);

    assert.strictEqual(result.city, 'Tokyo');
    assert.strictEqual(result.timezone, 'Asia/Tokyo');
    assert.strictEqual(result.utcOffset, 'UTC+09:00');
    assert.strictEqual(result.utcOffsetMinutes, 540);
    assert.strictEqual(result.hour24, 21); // 12 + 9 = 21:00
  });

  test('New York negative UTC offset (EDT UTC-4 / EST UTC-5)', () => {
    const ny = findCity('New York');
    assert(ny, 'New York should be found');
    const summerDate = new Date('2026-06-15T12:00:00Z');
    const result = getCityTime(ny, summerDate);

    assert(result.utcOffset.startsWith('UTC-04') || result.utcOffset.startsWith('UTC-05'));
    assert(result.utcOffsetMinutes < 0, 'New York should have negative UTC offset in minutes');
  });

  test('Fractional time zone offsets (Delhi UTC+05:30)', () => {
    const delhi = findCity('Delhi') || findCity('New Delhi') || CITIES.find(c => c.timezone.includes('Kolkata'));
    assert(delhi, 'Delhi/Kolkata timezone city should exist');
    const date = new Date('2026-01-15T10:00:00Z');
    const result = getCityTime(delhi, date);

    assert.strictEqual(result.utcOffset, 'UTC+05:30');
    assert.strictEqual(result.utcOffsetMinutes, 330);
  });

  test('Boundary Value: Leap year date 2024-02-29T23:59:59Z across London & Tokyo', () => {
    const tokyo = findCity('Tokyo');
    const london = findCity('London');
    const leapDate = new Date('2024-02-29T23:59:59Z');

    const tokyoResult = getCityTime(tokyo, leapDate);
    const londonResult = getCityTime(london, leapDate);

    // Tokyo is +9 hours, so it crosses into March 1st!
    assert(tokyoResult.currentDate.includes('Mar 1') || tokyoResult.currentDate.includes('3/1'), 'Tokyo should roll over to March 1');
    assert(londonResult.currentDate.includes('Feb 29') || londonResult.currentDate.includes('2/29'), 'London should remain on Feb 29');
  });

  test('Midnight boundary hour24 equals 0', () => {
    const london = findCity('London');
    const midnightUtc = new Date('2026-01-01T00:00:00Z');
    const result = getCityTime(london, midnightUtc);

    assert.strictEqual(result.hour24, 0);
    assert.strictEqual(result.minutes, 0);
  });

  // --- 2. calculateSolarState ---
  test('Solar state calculation returns day/night/dawn/dusk', () => {
    const states = ['day', 'night', 'dawn', 'dusk'];
    const middayState = calculateSolarState(0, 0, new Date('2026-06-21T12:00:00Z'));
    assert(states.includes(middayState));
    assert.strictEqual(middayState, 'day', 'Equator at UTC noon should be day');

    const midnightState = calculateSolarState(0, 0, new Date('2026-06-21T00:00:00Z'));
    assert.strictEqual(midnightState, 'night', 'Equator at UTC midnight should be night');
  });

  // --- 3. compareCities ---
  test('compareCities with identical cities returns 0 difference', () => {
    const tokyo = findCity('Tokyo');
    const result = compareCities(tokyo, tokyo);

    assert.strictEqual(result.differenceMinutes, 0);
    assert.strictEqual(result.differenceHours, 0);
    assert.strictEqual(result.isSameTime, true);
    assert.strictEqual(result.timeline24h.length, 24);
  });

  test('compareCities between Tokyo and London returns valid difference and timeline', () => {
    const tokyo = findCity('Tokyo');
    const london = findCity('London');
    const result = compareCities(tokyo, london, new Date('2026-01-15T12:00:00Z'));

    assert(result.differenceHours !== 0, 'Tokyo and London should have non-zero time difference');
    assert.strictEqual(result.timeline24h.length, 24);
    assert(typeof result.workingHoursOverlap.hasOverlap === 'boolean');
    assert(typeof result.workingHoursOverlap.overlapHours === 'number');
    assert(typeof result.workingHoursOverlap.advice === 'string');
  });

  return { passed, failed };
}
