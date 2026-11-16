export type UserRole = 'user' | 'admin';

export type ApiKeyStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  dateOfBirth?: string | Date;
  isAgeVerified?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IApiKey {
  _id: string;
  userId: string | { _id: string; name: string; email: string };
  name: string;
  useCase?: string;
  keyPrefix: string;
  lastFour: string;
  status: ApiKeyStatus;
  rateLimit: number;
  rejectionReason?: string;
  approvedAt?: string | Date;
  approvedBy?: string;
  lastUsedAt?: string | Date;
  createdAt: string | Date;
}

export interface IApiLog {
  _id: string;
  apiKeyId?: string;
  userId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string;
  createdAt: string | Date;
}

export interface CityData {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  timezone: string;
  lat: number;
  lng: number;
  flag: string;
}

export interface TimeDetail {
  city: string;
  country: string;
  countryCode: string;
  flag: string;
  timezone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  currentTime: string;
  currentDate: string;
  iso: string;
  hour24: number;
  minutes: number;
  utcOffset: string;
  utcOffsetMinutes: number;
  isDST: boolean;
  solarState: 'day' | 'night' | 'dawn' | 'dusk';
}

export interface ComparisonResult {
  from: TimeDetail;
  to: TimeDetail;
  differenceMinutes: number;
  differenceHours: number;
  formattedDifference: string;
  isSameTime: boolean;
  workingHoursOverlap: {
    hasOverlap: boolean;
    overlapHours: number;
    overlapWindowString: string;
    advice: string;
  };
  timeline24h: {
    hourFrom: number;
    hourTo: number;
    timeFromFormatted: string;
    timeToFormatted: string;
    isWorkingOverlap: boolean;
  }[];
}

export interface MultiCityComparisonResult {
  cities: TimeDetail[];
  goldenHour: {
    hasOverlap: boolean;
    overlapHoursCount: number;
    bestUtcHour: number | null;
    advice: string;
  };
  timeline24h: {
    utcHour: number;
    utcFormatted: string;
    cityStatuses: {
      city: string;
      localHour: number;
      localFormatted: string;
      state: 'working' | 'extended' | 'sleeping';
    }[];
    isAllWorking: boolean;
    isAllAwake: boolean;
  }[];
}

export interface ISSPassPrediction {
  id: string;
  startTime: Date;
  endTime: Date;
  maxElevationTime: Date;
  maxElevationDeg: number;
  durationSeconds: number;
  durationMinutes: number;
  riseCompass: string;
  setCompass: string;
  peakCompass: string;
  visibility: 'Naked Eye (Twilight)' | 'Daylight Pass' | 'Night (In Shadow)';
  isSunlit: boolean;
  observerNight: boolean;
  apparentMagnitude: number;
}

export interface SolarElevationShadowData {
  altitudeDeg: number;
  azimuthDeg: number;
  azimuthCompass: string;
  shadowLengthFactor: number | null;
  shadowDescription: string;
  solarZenithAngleDeg: number;
  uvIndexEstimate: number;
}

export type CalendarEventType = 'birthday' | 'anniversary' | 'reminder' | 'celestial' | 'holiday';

export interface ICalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm (optional, for reminders)
  description?: string;
  personName?: string; // for birthday / anniversary
  yearStarted?: number; // birth year or anniversary start year
  priority?: 'low' | 'medium' | 'high';
  isCompleted?: boolean; // for reminders
  createdAt: string;
}

export interface IStopwatchLap {
  id: number;
  lapTime: number; // ms
  overallTime: number; // ms
}
