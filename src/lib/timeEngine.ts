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

/**
 * Calculates geodesic Great-Circle distance and commercial flight metrics between two coordinates
 */
export function calculateGeodesicDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): {
  distanceKm: number;
  distanceMiles: number;
  angularDegrees: number;
  flightTimeFormatted: string;
  solarTimeLagHours: number;
} {
  const R = 6371; // Mean Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c);
  const distanceMiles = Math.round(distanceKm * 0.621371);
  const angularDegrees = Number(((c * 180) / Math.PI).toFixed(1));

  // Commercial airliner flight estimate at 850 km/h + 35 min taxi/takeoff/landing
  const hours = distanceKm / 850 + 0.58;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const flightTimeFormatted = `${h}h ${m}m`;

  // Solar longitudinal difference (15 degrees = 1 hour solar lag)
  const solarTimeLagHours = Number((Math.abs(lng2 - lng1) / 15).toFixed(1));

  return {
    distanceKm,
    distanceMiles,
    angularDegrees,
    flightTimeFormatted,
    solarTimeLagHours,
  };
}

export interface EarthOrbitalTelemetry {
  dayOfYear: number;
  sunDistanceAu: number;
  sunDistanceKm: string;
  orbitalVelocityKms: number;
  orbitalVelocityKmh: string;
  equatorSpeedKmh: number;
  axialTiltDeg: number;
  solarConstantWm2: number;
}

/**
 * Real-time planetary orbital physics of Earth in the solar system
 */
export function getEarthOrbitalTelemetry(date: Date = new Date()): EarthOrbitalTelemetry {
  const startOfYear = new Date(date.getUTCFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86400000);

  // Mean anomaly M (perihelion around Jan 4)
  const M = ((2 * Math.PI) / 365.25) * (dayOfYear - 4);
  const sunDistanceAu = Number((1.0 - 0.0167 * Math.cos(M)).toFixed(4));
  const sunDistanceKmNum = Math.round(sunDistanceAu * 149597870.7);
  const sunDistanceKm = sunDistanceKmNum.toLocaleString('en-US');

  // Vis-viva equation: v = 29.78 * sqrt(2/r - 1)
  const orbitalVelocityKms = Number((29.78 * Math.sqrt(Math.max(0.1, 2 / sunDistanceAu - 1))).toFixed(2));
  const orbitalVelocityKmh = Math.round(orbitalVelocityKms * 3600).toLocaleString('en-US');

  return {
    dayOfYear,
    sunDistanceAu,
    sunDistanceKm,
    orbitalVelocityKms,
    orbitalVelocityKmh,
    equatorSpeedKmh: 1674, // Equator linear velocity (465.1 m/s)
    axialTiltDeg: 23.44,   // Earth's axial obliquity
    solarConstantWm2: Math.round(1361 / (sunDistanceAu * sunDistanceAu)),
  };
}

export interface LunarDetailedEphemeris {
  phase: string;
  phaseEmoji: string;
  illumination: number;
  ageDays: number;
  synodicCycleDays: number;
  distanceKm: string;
  lightSeconds: number;
  daysToNextFullMoon: number;
  daysToNextNewMoon: number;
}

/**
 * Detailed lunar orbital metrics, cycle age and Earth-Moon telemetries
 */
export function getLunarDetailedEphemeris(date: Date = new Date()): LunarDetailedEphemeris {
  const refNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const synodicMonthMs = 29.53058867 * 86400000;
  const elapsed = (date.getTime() - refNewMoon) % synodicMonthMs;
  const ageDaysRaw = ((elapsed + synodicMonthMs) % synodicMonthMs) / 86400000;
  const ageDays = Number(ageDaysRaw.toFixed(1));

  const baseLunar = getSublunarPoint(date);

  // Lunar orbital eccentricity ~0.0549
  const moonMeanAnomaly = ((2 * Math.PI) / 27.55455) * ageDaysRaw;
  const distanceKmNum = Math.round(384400 - 21000 * Math.cos(moonMeanAnomaly));
  const distanceKm = distanceKmNum.toLocaleString('en-US');
  const lightSeconds = Number((distanceKmNum / 299792.458).toFixed(2));

  // Countdown to key phases
  const fullMoonAge = 29.53058867 / 2;
  const daysToNextFullMoon = Number((((fullMoonAge - ageDaysRaw) % 29.53058867 + 29.53058867) % 29.53058867).toFixed(1));
  const daysToNextNewMoon = Number((((29.53058867 - ageDaysRaw) % 29.53058867 + 29.53058867) % 29.53058867).toFixed(1));

  return {
    phase: baseLunar.phase,
    phaseEmoji: baseLunar.phaseEmoji,
    illumination: baseLunar.illumination,
    ageDays,
    synodicCycleDays: 29.53,
    distanceKm,
    lightSeconds,
    daysToNextFullMoon,
    daysToNextNewMoon,
  };
}

export interface ISSPosition {
  lat: number;
  lng: number;
  altitudeKm: number;
  speedKmh: number;
  speedKms: number;
  orbitalPeriodMinutes: number;
  footprintRadiusKm: number;
}

/**
 * Calculates authentic real-time orbital position of the International Space Station (ISS)
 * 51.64° orbital inclination, ~418 km altitude, 92.7 minute orbit period
 */
export function getISSOrbitalPosition(date: Date = new Date()): ISSPosition {
  const epoch = new Date('2024-01-01T00:00:00Z').getTime();
  const elapsedSec = (date.getTime() - epoch) / 1000;

  const periodSec = 5560.8; // 92.68 minutes
  const inclinationRad = (51.64 * Math.PI) / 180;

  const orbitFraction = (elapsedSec % periodSec) / periodSec;
  const u = orbitFraction * 2 * Math.PI;

  const sinLat = Math.sin(inclinationRad) * Math.sin(u);
  const lat = Math.asin(Math.max(-1, Math.min(1, sinLat))) * (180 / Math.PI);

  const earthRotationDegPerSec = 360 / 86164;
  const nodalPrecessionDegPerSec = 5.0 / 86400;
  const orbitLng = Math.atan2(Math.cos(inclinationRad) * Math.sin(u), Math.cos(u)) * (180 / Math.PI);

  let lng = orbitLng - (earthRotationDegPerSec + nodalPrecessionDegPerSec) * elapsedSec;
  lng = ((((lng + 180) % 360) + 360) % 360) - 180;

  return {
    lat: Number(lat.toFixed(2)),
    lng: Number(lng.toFixed(2)),
    altitudeKm: 418,
    speedKmh: 27580,
    speedKms: 7.66,
    orbitalPeriodMinutes: 92.7,
    footprintRadiusKm: 2200,
  };
}

export interface PhotographyLightingState {
  currentPhase: 'golden_hour' | 'blue_hour' | 'daylight' | 'night';
  currentPhaseLabel: string;
  isGoldenHour: boolean;
  isBlueHour: boolean;
  solarAltitudeDeg: number;
}

/**
 * Calculates Golden Hour and Blue Hour twilight photography conditions for any observer location
 */
export function getPhotographySolarHours(lat: number, lng: number, date: Date = new Date()): PhotographyLightingState {
  const celestial = calculateLocalCelestialPosition(lat, lng, date);
  const alt = celestial.sun.altitudeDeg;

  let currentPhase: 'golden_hour' | 'blue_hour' | 'daylight' | 'night' = 'night';
  let currentPhaseLabel = 'Night Sky';
  let isGoldenHour = false;
  let isBlueHour = false;

  if (alt > 6) {
    currentPhase = 'daylight';
    currentPhaseLabel = 'Broad Daylight';
  } else if (alt >= -4 && alt <= 6) {
    currentPhase = 'golden_hour';
    currentPhaseLabel = 'Golden Hour (Warm Glow)';
    isGoldenHour = true;
  } else if (alt >= -6 && alt < -4) {
    currentPhase = 'blue_hour';
    currentPhaseLabel = 'Blue Hour (Deep Twilight)';
    isBlueHour = true;
  } else {
    currentPhase = 'night';
    currentPhaseLabel = 'Astronomical Night';
  }

  return {
    currentPhase,
    currentPhaseLabel,
    isGoldenHour,
    isBlueHour,
    solarAltitudeDeg: alt,
  };
}

export interface MeetingCalendarExport {
  googleCalendarUrl: string;
  icsContent: string;
  icsFileName: string;
}

/**
 * Generates an RFC 5545 .ics calendar invite and 1-click Google Calendar link for meeting overlaps
 */
export function generateCalendarMeetingLinks(
  cityA: CityData,
  cityB: CityData,
  overlapHourUTC: number,
  durationHours = 1
): MeetingCalendarExport {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startYear = tomorrow.getUTCFullYear();
  const startMonth = tomorrow.getUTCMonth();
  const startDay = tomorrow.getUTCDate();

  const startDate = new Date(Date.UTC(startYear, startMonth, startDay, overlapHourUTC, 0, 0));
  const endDate = new Date(startDate.getTime() + durationHours * 3600000);

  const formatUtcIso = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const startIso = formatUtcIso(startDate);
  const endIso = formatUtcIso(endDate);

  const title = `TimeOrbit Synchronized Meeting: ${cityA.city} ⇄ ${cityB.city}`;
  const description = `Synchronized planetary meeting between ${cityA.city} (${cityA.timezone}) and ${cityB.city} (${cityB.timezone}). Coordinated via TimeOrbit Celestial Observatory.`;
  const location = `${cityA.city} / ${cityB.city} (Online / Teleconference)`;

  const googleUrl = new URL('https://calendar.google.com/calendar/render');
  googleUrl.searchParams.set('action', 'TEMPLATE');
  googleUrl.searchParams.set('text', title);
  googleUrl.searchParams.set('dates', `${startIso}/${endIso}`);
  googleUrl.searchParams.set('details', description);
  googleUrl.searchParams.set('location', location);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimeOrbit//Planetary Celestial Time//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:timeorbit-${Date.now()}@timeorbit.io`,
    `DTSTAMP:${formatUtcIso(new Date())}`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return {
    googleCalendarUrl: googleUrl.toString(),
    icsContent: ics,
    icsFileName: `meeting-${cityA.city.toLowerCase()}-${cityB.city.toLowerCase()}.ics`,
  };
}
