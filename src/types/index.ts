export type UserRole = 'user' | 'admin';

export type ApiKeyStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
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
