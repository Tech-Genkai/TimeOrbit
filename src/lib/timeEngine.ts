import { CityData, TimeDetail, ComparisonResult } from '@/types';

/**
 * Pure local calculation of solar elevation angle
 * Returns 'day', 'night', 'dawn', or 'dusk' based on latitude, longitude, and UTC time.
 */
export function calculateSolarState(lat: number, lng: number, date: Date = new Date()): 'day' | 'night' | 'dawn' | 'dusk' {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );

  // Solar declination (approximate, in radians)
  const declination = 23.45 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81)) * (Math.PI / 180);

  // Solar time calculation
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const solarTime = (utcHours + lng / 15 + 24) % 24;
  const hourAngle = (solarTime - 12) * 15 * (Math.PI / 180);

  const latRad = lat * (Math.PI / 180);

  // Solar elevation angle
  const sinAltitude =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);
  const altitudeDeg = Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * (180 / Math.PI);

  if (altitudeDeg > 6) return 'day';
  if (altitudeDeg >= -6 && altitudeDeg <= 6) {
    return solarTime < 12 ? 'dawn' : 'dusk';
  }
  return 'night';
}

/**
 * Calculates current coordinates (lat, lng) of the subsolar point (where Sun is at zenith)
 */
export function getSubsolarPoint(date: Date = new Date()): { lat: number; lng: number } {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / 86400000
  );
  const declination = 23.44 * Math.sin(((2 * Math.PI) / 365.24) * (dayOfYear - 81));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let lng = (12 - utcHours) * 15;
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;

  return {
    lat: Number(declination.toFixed(2)),
    lng: Number(lng.toFixed(2)),
  };
}

/**
 * Calculates coordinates and phase of the Moon on Earth
 */
export function getSublunarPoint(date: Date = new Date()): {
  lat: number;
  lng: number;
  phase: string;
  illumination: number; // 0 to 100 percentage
  phaseEmoji: string;
} {
  const refNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const synodicMonthMs = 29.53058867 * 86400000;
  const elapsed = (date.getTime() - refNewMoon) % synodicMonthMs;
  const ageDays = ((elapsed + synodicMonthMs) % synodicMonthMs) / 86400000;
  const phaseFraction = ageDays / 29.53058867;

  const illumination = Math.round(((1 - Math.cos(phaseFraction * 2 * Math.PI)) / 2) * 100);

  let phase = 'New Moon';
  let phaseEmoji = '🌑';
  if (phaseFraction < 0.03 || phaseFraction > 0.97) {
    phase = 'New Moon';
    phaseEmoji = '🌑';
  } else if (phaseFraction < 0.22) {
    phase = 'Waxing Crescent';
    phaseEmoji = '🌒';
  } else if (phaseFraction < 0.28) {
    phase = 'First Quarter';
    phaseEmoji = '🌓';
  } else if (phaseFraction < 0.47) {
    phase = 'Waxing Gibbous';
    phaseEmoji = '🌔';
  } else if (phaseFraction < 0.53) {
    phase = 'Full Moon';
    phaseEmoji = '🌕';
  } else if (phaseFraction < 0.72) {
    phase = 'Waning Gibbous';
    phaseEmoji = '🌖';
  } else if (phaseFraction < 0.78) {
    phase = 'Last Quarter';
    phaseEmoji = '🌗';
  } else {
    phase = 'Waning Crescent';
    phaseEmoji = '🌘';
  }

  const sun = getSubsolarPoint(date);
  const moonAngle = phaseFraction * 360;
  let moonLng = sun.lng - 180 + moonAngle;
  while (moonLng > 180) moonLng -= 360;
  while (moonLng < -180) moonLng += 360;

  const moonLat = -sun.lat * 0.85;

  return {
    lat: Number(moonLat.toFixed(2)),
    lng: Number(moonLng.toFixed(2)),
    phase,
    illumination,
    phaseEmoji,
  };
}

/**
 * Calculates a ring of coordinates tracing the Day-Night Terminator line (twilight boundary)
 */
export function getTerminatorPoints(sunCoords: { lat: number; lng: number }, steps = 36): [number, number][] {
  const points: [number, number][] = [];
  const delta = (sunCoords.lat * Math.PI) / 180;
  const lambda = (sunCoords.lng * Math.PI) / 180;

  // Tangent vectors perpendicular to subsolar direction
  const uX = -Math.sin(lambda);
  const uY = Math.cos(lambda);
  const uZ = 0;

  const vX = -Math.sin(delta) * Math.cos(lambda);
  const vY = -Math.sin(delta) * Math.sin(lambda);
  const vZ = Math.cos(delta);

  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const px = Math.cos(angle) * uX + Math.sin(angle) * vX;
    const py = Math.cos(angle) * uY + Math.sin(angle) * vY;
    const pz = Math.cos(angle) * uZ + Math.sin(angle) * vZ;

    const lat = Math.asin(Math.max(-1, Math.min(1, pz))) * (180 / Math.PI);
    const lng = Math.atan2(py, px) * (180 / Math.PI);

    points.push([Number(lat.toFixed(2)), Number(lng.toFixed(2))]);
  }

  return points;
}

function degreesToCompass(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

export interface LocalCelestialPosition {
  sun: {
    altitudeDeg: number;
    azimuthDeg: number;
    azimuthCompass: string;
    state: 'day' | 'dawn' | 'dusk' | 'night';
    elevationDescription: string;
  };
  moon: {
    altitudeDeg: number;
    azimuthDeg: number;
    azimuthCompass: string;
    isVisibleInSky: boolean;
    phase: string;
    illumination: number;
    phaseEmoji: string;
  };
  subsolarPoint: { lat: number; lng: number };
  sublunarPoint: { lat: number; lng: number };
}

/**
 * Calculates real-time Sun and Moon positions (altitude angle and compass azimuth) for any specific observer coordinates
 */
export function calculateLocalCelestialPosition(
  lat: number,
  lng: number,
  date: Date = new Date()
): LocalCelestialPosition {
  const sunSub = getSubsolarPoint(date);
  const moonSub = getSublunarPoint(date);

  // 1. Sun local altitude & azimuth
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / 86400000
  );
  const declination = 23.44 * Math.sin(((2 * Math.PI) / 365.24) * (dayOfYear - 81)) * (Math.PI / 180);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const solarTime = (utcHours + lng / 15 + 24) % 24;
  const hourAngle = (solarTime - 12) * 15 * (Math.PI / 180);
  const latRad = (lat * Math.PI) / 180;

  const sinAltSun =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);
  const sunAltDeg = Math.asin(Math.max(-1, Math.min(1, sinAltSun))) * (180 / Math.PI);

  const cosSunAz =
    (Math.sin(declination) - Math.sin(latRad) * sinAltSun) /
    (Math.cos(latRad) * Math.cos(sunAltDeg * (Math.PI / 180)) || 0.0001);
  let sunAzDeg = Math.acos(Math.max(-1, Math.min(1, cosSunAz))) * (180 / Math.PI);
  if (Math.sin(hourAngle) > 0) {
    sunAzDeg = 360 - sunAzDeg;
  }
  sunAzDeg = (sunAzDeg + 360) % 360;

  let state: 'day' | 'dawn' | 'dusk' | 'night' = 'night';
  let elevationDescription = 'Night (Deep Below Horizon)';
  if (sunAltDeg > 6) {
    state = 'day';
    elevationDescription = sunAltDeg > 45 ? `High Sun (+${sunAltDeg.toFixed(1)}°)` : `Daylight (+${sunAltDeg.toFixed(1)}°)`;
  } else if (sunAltDeg >= -6 && sunAltDeg <= 6) {
    state = solarTime < 12 ? 'dawn' : 'dusk';
    elevationDescription = state === 'dawn' ? `Sunrise Horizon (${sunAltDeg.toFixed(1)}°)` : `Sunset Horizon (${sunAltDeg.toFixed(1)}°)`;
  } else {
    elevationDescription = `Night (-${Math.abs(sunAltDeg).toFixed(1)}° Below Horizon)`;
  }

  // 2. Moon local altitude & azimuth
  const moonLatRad = (moonSub.lat * Math.PI) / 180;
  const moonLngDiff = (lng - moonSub.lng) * (Math.PI / 180);
  const sinAltMoon =
    Math.sin(latRad) * Math.sin(moonLatRad) +
    Math.cos(latRad) * Math.cos(moonLatRad) * Math.cos(moonLngDiff);
  const moonAltDeg = Math.asin(Math.max(-1, Math.min(1, sinAltMoon))) * (180 / Math.PI);

  const cosMoonAz =
    (Math.sin(moonLatRad) - Math.sin(latRad) * sinAltMoon) /
    (Math.cos(latRad) * Math.cos(moonAltDeg * (Math.PI / 180)) || 0.0001);
  let moonAzDeg = Math.acos(Math.max(-1, Math.min(1, cosMoonAz))) * (180 / Math.PI);
  if (Math.sin(moonLngDiff) < 0) {
    moonAzDeg = 360 - moonAzDeg;
  }
  moonAzDeg = (moonAzDeg + 360) % 360;

  return {
    sun: {
      altitudeDeg: Number(sunAltDeg.toFixed(1)),
      azimuthDeg: Math.round(sunAzDeg),
      azimuthCompass: degreesToCompass(sunAzDeg),
      state,
      elevationDescription,
    },
    moon: {
      altitudeDeg: Number(moonAltDeg.toFixed(1)),
      azimuthDeg: Math.round(moonAzDeg),
      azimuthCompass: degreesToCompass(moonAzDeg),
      isVisibleInSky: moonAltDeg > 0,
      phase: moonSub.phase,
      illumination: moonSub.illumination,
      phaseEmoji: moonSub.phaseEmoji,
    },
    subsolarPoint: sunSub,
    sublunarPoint: { lat: moonSub.lat, lng: moonSub.lng },
  };
}

/**
 * Calculates current time and offset for a city locally using native Node.js Intl
 */
export function getCityTime(city: CityData, targetDate: Date = new Date()): TimeDetail {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: city.timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  });

  const hour24Formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: city.timezone,
    hour: 'numeric',
    hour12: false,
  });

  const minuteFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: city.timezone,
    minute: 'numeric',
  });

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: city.timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeFormatted = formatter.format(targetDate);
  const hour24 = parseInt(hour24Formatter.format(targetDate), 10) % 24;
  const minutes = parseInt(minuteFormatter.format(targetDate), 10);
  const dateFormatted = dateFormatter.format(targetDate);

  // Compute UTC offset in minutes locally
  const utcDate = new Date(targetDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(targetDate.toLocaleString('en-US', { timeZone: city.timezone }));
  const offsetMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);

  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMinsRemainder = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const utcOffset = `UTC${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinsRemainder).padStart(2, '0')}`;

  // Approximate DST check: compare offset in Jan vs July
  const jan = new Date(targetDate.getFullYear(), 0, 1);
  const jul = new Date(targetDate.getFullYear(), 6, 1);
  const janOffset = Math.round(
    (new Date(jan.toLocaleString('en-US', { timeZone: city.timezone })).getTime() -
      new Date(jan.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()) /
      60000
  );
  const julOffset = Math.round(
    (new Date(jul.toLocaleString('en-US', { timeZone: city.timezone })).getTime() -
      new Date(jul.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()) /
      60000
  );
  const isDST = offsetMinutes !== Math.min(janOffset, julOffset);

  const solarState = calculateSolarState(city.lat, city.lng, targetDate);

  return {
    city: city.city,
    country: city.country,
    countryCode: city.countryCode,
    flag: city.flag,
    timezone: city.timezone,
    coordinates: {
      lat: city.lat,
      lng: city.lng,
    },
    currentTime: timeFormatted,
    currentDate: dateFormatted,
    iso: tzDate.toISOString(),
    hour24,
    minutes,
    utcOffset,
    utcOffsetMinutes: offsetMinutes,
    isDST,
    solarState,
  };
}

/**
 * Compares two cities locally: differences, overlap of working hours, and 24h matrix
 */
export function compareCities(from: CityData, to: CityData, targetDate: Date = new Date()): ComparisonResult {
  const fromTime = getCityTime(from, targetDate);
  const toTime = getCityTime(to, targetDate);

  const diffMinutes = toTime.utcOffsetMinutes - fromTime.utcOffsetMinutes;
  const diffHours = Number((diffMinutes / 60).toFixed(1));

  let formattedDifference = '';
  if (diffMinutes === 0) {
    formattedDifference = `${to.city} and ${from.city} are in the same time zone.`;
  } else if (diffMinutes > 0) {
    const hrs = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const timeStr = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hours`;
    formattedDifference = `${to.city} is ${timeStr} ahead of ${from.city}`;
  } else {
    const absMins = Math.abs(diffMinutes);
    const hrs = Math.floor(absMins / 60);
    const mins = absMins % 60;
    const timeStr = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hours`;
    formattedDifference = `${to.city} is ${timeStr} behind ${from.city}`;
  }

  // Calculate 9 AM - 6 PM working hours overlap
  let overlapCount = 0;
  const timeline24h = [];

  for (let h = 0; h < 24; h++) {
    const toHour = (h + Math.round(diffMinutes / 60) + 24) % 24;
    const isFromWorking = h >= 9 && h < 18;
    const isToWorking = toHour >= 9 && toHour < 18;
    const isWorkingOverlap = isFromWorking && isToWorking;

    if (isWorkingOverlap) overlapCount++;

    const formatHour = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${displayHour}:00 ${period}`;
    };

    timeline24h.push({
      hourFrom: h,
      hourTo: toHour,
      timeFromFormatted: formatHour(h),
      timeToFormatted: formatHour(toHour),
      isWorkingOverlap,
    });
  }

  const hasOverlap = overlapCount > 0;
  let advice = '';
  if (hasOverlap) {
    advice = `You have ${overlapCount} hours of overlapping business hours (9:00 AM – 6:00 PM). Great for real-time collaboration and meetings!`;
  } else {
    advice = `No overlapping standard 9 AM – 6 PM work hours. Best to schedule async communication or catch Tokyo morning / New York evening overlap.`;
  }

  return {
    from: fromTime,
    to: toTime,
    differenceMinutes: diffMinutes,
    differenceHours: diffHours,
    formattedDifference,
    isSameTime: diffMinutes === 0,
    workingHoursOverlap: {
      hasOverlap,
      overlapHours: overlapCount,
      overlapWindowString: hasOverlap ? `${overlapCount} shared business hours` : 'No direct business overlap',
      advice,
    },
    timeline24h,
  };
}
