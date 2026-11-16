import assert from 'node:assert';
import {
  getCityTime,
  calculateSolarState,
  compareCities,
  compareMultiCities,
  calculateISSPasses,
  getSolarElevationAndShadow,
  calculateAnniversaryMilestone,
  calculateBirthdayMilestone,
  getDaysUntil,
  generateCalendarEventIcs,
  getAstronomicalEvents,
  getHolidaysAndFestivals,
} from '@/lib/timeEngine';
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

  // --- 4. calculateISSPasses ---
  test('calculateISSPasses returns upcoming orbital passes with valid elevation angles', () => {
    const tokyo = findCity('Tokyo');
    assert(tokyo, 'Tokyo should exist');
    const passes = calculateISSPasses(tokyo.lat, tokyo.lng, new Date('2026-06-15T00:00:00Z'), 3);

    assert(Array.isArray(passes), 'Passes should be an array');
    assert(passes.length > 0, 'Should predict at least 1 pass in 48 hours');
    const firstPass = passes[0];
    assert(firstPass.maxElevationDeg >= 10, 'Pass elevation should meet or exceed 10° threshold');
    assert(firstPass.durationSeconds > 0, 'Duration should be positive');
    assert(typeof firstPass.riseCompass === 'string', 'Rise compass should be string');
    assert(typeof firstPass.setCompass === 'string', 'Set compass should be string');
    assert(['Naked Eye (Twilight)', 'Daylight Pass', 'Night (In Shadow)'].includes(firstPass.visibility));
  });

  // --- 5. compareMultiCities ---
  test('compareMultiCities evaluates 3 global cities and identifies golden hour matrix', () => {
    const tokyo = findCity('Tokyo');
    const london = findCity('London');
    const ny = findCity('New York');
    assert(tokyo && london && ny, 'All 3 cities must exist');

    const result = compareMultiCities([tokyo, london, ny], new Date('2026-06-15T12:00:00Z'));
    assert.strictEqual(result.cities.length, 3, 'Should format 3 city times');
    assert.strictEqual(result.timeline24h.length, 24, 'Timeline should have 24 hours');
    assert(typeof result.goldenHour.hasOverlap === 'boolean', 'Has overlap boolean');
    assert(typeof result.goldenHour.advice === 'string', 'Golden hour advice string');
  });

  // --- 6. getSolarElevationAndShadow ---
  test('getSolarElevationAndShadow computes altitude, azimuth, and shadow factor', () => {
    const noonSolar = getSolarElevationAndShadow(0, 0, new Date('2026-03-21T12:00:00Z')); // Equinox noon at (0,0)
    assert(noonSolar.altitudeDeg > 80, 'Equinox noon on equator should have high altitude > 80°');
    assert(noonSolar.shadowLengthFactor !== null, 'Day shadow factor should be non-null');
    assert(noonSolar.shadowLengthFactor < 0.3, 'Nearly vertical sun should have very short shadow');

    const nightSolar = getSolarElevationAndShadow(0, 0, new Date('2026-03-21T00:00:00Z'));
    assert(nightSolar.altitudeDeg < 0, 'Midnight should have negative solar altitude');
    assert.strictEqual(nightSolar.shadowLengthFactor, null, 'Night shadow factor should be null');
  });

  // --- 7. calculateAnniversaryMilestone & calculateBirthdayMilestone ---
  test('calculateAnniversaryMilestone identifies milestones and symbols accurately', () => {
    const m5 = calculateAnniversaryMilestone(2021, 2026);
    assert.strictEqual(m5.years, 5);
    assert.strictEqual(m5.milestoneName, 'Wood');
    assert(m5.formattedLabel.includes('5th Anniversary • Wood'));

    const m25 = calculateAnniversaryMilestone(2001, 2026);
    assert.strictEqual(m25.years, 25);
    assert.strictEqual(m25.milestoneName, 'Silver Jubilee');
  });

  test('calculateBirthdayMilestone calculates turning age and ordinal labels', () => {
    const bday = calculateBirthdayMilestone(1996, 2026);
    assert.strictEqual(bday.turningAge, 30);
    assert.strictEqual(bday.formattedLabel, 'Turning 30th');

    const bday21 = calculateBirthdayMilestone(2005, 2026);
    assert.strictEqual(bday21.turningAge, 21);
    assert.strictEqual(bday21.formattedLabel, 'Turning 21st');
  });

  // --- 8. getDaysUntil & Rollover ---
  test('getDaysUntil handles today, tomorrow, and annual rollover correctly', () => {
    const baseDate = new Date('2026-05-10T12:00:00Z');
    
    // Today
    const todayRes = getDaysUntil('2026-05-10', false, baseDate);
    assert.strictEqual(todayRes.isToday, true);
    assert.strictEqual(todayRes.formatted, 'Today!');

    // Tomorrow
    const tmrwRes = getDaysUntil('2026-05-11', false, baseDate);
    assert.strictEqual(tmrwRes.isTomorrow, true);
    assert.strictEqual(tmrwRes.formatted, 'Tomorrow');

    // In 5 days
    const futureRes = getDaysUntil('2026-05-15', false, baseDate);
    assert.strictEqual(futureRes.daysRemaining, 5);
    assert.strictEqual(futureRes.formatted, 'In 5 days');

    // Annual recurrence rollover (past date rolls over to next year)
    const passedBday = getDaysUntil('2026-01-01', true, baseDate);
    assert(passedBday.daysRemaining > 200, 'Past recurring event should roll to next year');
  });

  // --- 9. generateCalendarEventIcs & getAstronomicalEvents ---
  test('generateCalendarEventIcs generates valid RFC 5545 iCalendar content', () => {
    const event = {
      id: 'test-event-1',
      title: 'Our Wedding Anniversary',
      type: 'anniversary',
      date: '2026-06-25',
      description: 'Celebrating 5 wonderful years!',
      createdAt: '2026-01-01T00:00:00Z',
    };
    const { icsContent, fileName } = generateCalendarEventIcs(event);
    assert(icsContent.includes('BEGIN:VCALENDAR'));
    assert(icsContent.includes('BEGIN:VEVENT'));
    assert(icsContent.includes('SUMMARY:Our Wedding Anniversary'));
    assert(icsContent.includes('RRULE:FREQ=YEARLY'));
    assert(icsContent.includes('END:VCALENDAR'));
    assert(fileName.endsWith('.ics'));
  });

  test('getAstronomicalEvents provides accurate equinoxes and solstices for year', () => {
    const astro = getAstronomicalEvents(2026);
    assert(astro.length >= 6, 'Should provide at least 6 astronomical events');
    const equinox = astro.find(e => e.title.includes('Vernal Equinox'));
    assert(equinox, 'Vernal Equinox should be present');
    assert.strictEqual(equinox.date, '2026-03-20');
  });

  test('getHolidaysAndFestivals provides global festivals and public holidays', () => {
    const fests = getHolidaysAndFestivals(2026);
    assert(fests.length >= 15, 'Should provide at least 15 holidays/festivals');
    const diwali = fests.find(f => f.title.includes('Diwali'));
    assert(diwali, 'Diwali should be present');
    assert.strictEqual(diwali.type, 'holiday');
    const xmas = fests.find(f => f.title.includes('Christmas Day'));
    assert(xmas, 'Christmas Day should be present');
    assert.strictEqual(xmas.date, '2026-12-25');
  });

  return { passed, failed };
}
