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
