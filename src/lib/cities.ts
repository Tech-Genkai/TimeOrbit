import { CityData } from '@/types';

export const CITIES: CityData[] = [
  // Asia
  { id: 'tokyo', name: 'Tokyo', city: 'Tokyo', country: 'Japan', countryCode: 'JP', timezone: 'Asia/Tokyo', lat: 35.6762, lng: 139.6503, flag: '🇯🇵' },
  { id: 'delhi', name: 'New Delhi', city: 'New Delhi', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 28.6139, lng: 77.2090, flag: '🇮🇳' },
  { id: 'mumbai', name: 'Mumbai', city: 'Mumbai', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 19.0760, lng: 72.8777, flag: '🇮🇳' },
  { id: 'singapore', name: 'Singapore', city: 'Singapore', country: 'Singapore', countryCode: 'SG', timezone: 'Asia/Singapore', lat: 1.3521, lng: 103.8198, flag: '🇸🇬' },
  { id: 'dubai', name: 'Dubai', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', timezone: 'Asia/Dubai', lat: 25.2048, lng: 55.2708, flag: '🇦🇪' },
  { id: 'seoul', name: 'Seoul', city: 'Seoul', country: 'South Korea', countryCode: 'KR', timezone: 'Asia/Seoul', lat: 37.5665, lng: 126.9780, flag: '🇰🇷' },
  { id: 'beijing', name: 'Beijing', city: 'Beijing', country: 'China', countryCode: 'CN', timezone: 'Asia/Shanghai', lat: 39.9042, lng: 116.4074, flag: '🇨🇳' },
  { id: 'shanghai', name: 'Shanghai', city: 'Shanghai', country: 'China', countryCode: 'CN', timezone: 'Asia/Shanghai', lat: 31.2304, lng: 121.4737, flag: '🇨🇳' },
  { id: 'hong_kong', name: 'Hong Kong', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', timezone: 'Asia/Hong_Kong', lat: 22.3193, lng: 114.1694, flag: '🇭🇰' },
  { id: 'bangkok', name: 'Bangkok', city: 'Bangkok', country: 'Thailand', countryCode: 'TH', timezone: 'Asia/Bangkok', lat: 13.7563, lng: 100.5018, flag: '🇹🇭' },
  { id: 'jakarta', name: 'Jakarta', city: 'Jakarta', country: 'Indonesia', countryCode: 'ID', timezone: 'Asia/Jakarta', lat: -6.2088, lng: 106.8456, flag: '🇮🇩' },
  { id: 'riyadh', name: 'Riyadh', city: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', timezone: 'Asia/Riyadh', lat: 24.7136, lng: 46.6753, flag: '🇸🇦' },
  { id: 'istanbul', name: 'Istanbul', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', timezone: 'Europe/Istanbul', lat: 41.0082, lng: 28.9784, flag: '🇹🇷' },

  // Europe
  { id: 'london', name: 'London', city: 'London', country: 'United Kingdom', countryCode: 'GB', timezone: 'Europe/London', lat: 51.5074, lng: -0.1278, flag: '🇬🇧' },
  { id: 'paris', name: 'Paris', city: 'Paris', country: 'France', countryCode: 'FR', timezone: 'Europe/Paris', lat: 48.8566, lng: 2.3522, flag: '🇫🇷' },
  { id: 'berlin', name: 'Berlin', city: 'Berlin', country: 'Germany', countryCode: 'DE', timezone: 'Europe/Berlin', lat: 52.5200, lng: 13.4050, flag: '🇩🇪' },
  { id: 'amsterdam', name: 'Amsterdam', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', timezone: 'Europe/Amsterdam', lat: 52.3676, lng: 4.9041, flag: '🇳🇱' },
  { id: 'madrid', name: 'Madrid', city: 'Madrid', country: 'Spain', countryCode: 'ES', timezone: 'Europe/Madrid', lat: 40.4168, lng: -3.7038, flag: '🇪🇸' },
  { id: 'rome', name: 'Rome', city: 'Rome', country: 'Italy', countryCode: 'IT', timezone: 'Europe/Rome', lat: 41.9028, lng: 12.4964, flag: '🇮🇹' },
  { id: 'zurich', name: 'Zurich', city: 'Zurich', country: 'Switzerland', countryCode: 'CH', timezone: 'Europe/Zurich', lat: 47.3769, lng: 8.5417, flag: '🇨🇭' },
  { id: 'stockholm', name: 'Stockholm', city: 'Stockholm', country: 'Sweden', countryCode: 'SE', timezone: 'Europe/Stockholm', lat: 59.3293, lng: 18.0686, flag: '🇸🇪' },
  { id: 'moscow', name: 'Moscow', city: 'Moscow', country: 'Russia', countryCode: 'RU', timezone: 'Europe/Moscow', lat: 55.7558, lng: 37.6173, flag: '🇷🇺' },

  // Americas
  { id: 'new_york', name: 'New York', city: 'New York', country: 'United States', countryCode: 'US', timezone: 'America/New_York', lat: 40.7128, lng: -74.0060, flag: '🇺🇸' },
  { id: 'san_francisco', name: 'San Francisco', city: 'San Francisco', country: 'United States', countryCode: 'US', timezone: 'America/Los_Angeles', lat: 37.7749, lng: -122.4194, flag: '🇺🇸' },
  { id: 'los_angeles', name: 'Los Angeles', city: 'Los Angeles', country: 'United States', countryCode: 'US', timezone: 'America/Los_Angeles', lat: 34.0522, lng: -118.2437, flag: '🇺🇸' },
  { id: 'chicago', name: 'Chicago', city: 'Chicago', country: 'United States', countryCode: 'US', timezone: 'America/Chicago', lat: 41.8781, lng: -87.6298, flag: '🇺🇸' },
  { id: 'toronto', name: 'Toronto', city: 'Toronto', country: 'Canada', countryCode: 'CA', timezone: 'America/Toronto', lat: 43.6532, lng: -79.3832, flag: '🇨🇦' },
  { id: 'vancouver', name: 'Vancouver', city: 'Vancouver', country: 'Canada', countryCode: 'CA', timezone: 'America/Vancouver', lat: 49.2827, lng: -123.1207, flag: '🇨🇦' },
  { id: 'sao_paulo', name: 'São Paulo', city: 'São Paulo', country: 'Brazil', countryCode: 'BR', timezone: 'America/Sao_Paulo', lat: -23.5505, lng: -46.6333, flag: '🇧🇷' },
  { id: 'buenos_aires', name: 'Buenos Aires', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', timezone: 'America/Argentina/Buenos_Aires', lat: -34.6037, lng: -58.3816, flag: '🇦🇷' },
  { id: 'mexico_city', name: 'Mexico City', city: 'Mexico City', country: 'Mexico', countryCode: 'MX', timezone: 'America/Mexico_City', lat: 19.4326, lng: -99.1332, flag: '🇲🇽' },

  // Oceania
  { id: 'sydney', name: 'Sydney', city: 'Sydney', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Sydney', lat: -33.8688, lng: 151.2093, flag: '🇦🇺' },
  { id: 'melbourne', name: 'Melbourne', city: 'Melbourne', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Melbourne', lat: -37.8136, lng: 144.9631, flag: '🇦🇺' },
  { id: 'auckland', name: 'Auckland', city: 'Auckland', country: 'New Zealand', countryCode: 'NZ', timezone: 'Pacific/Auckland', lat: -36.8485, lng: 174.7633, flag: '🇳🇿' },
  { id: 'honolulu', name: 'Honolulu', city: 'Honolulu', country: 'United States', countryCode: 'US', timezone: 'Pacific/Honolulu', lat: 21.3069, lng: -157.8583, flag: '🇺🇸' },

  // Africa
  { id: 'cairo', name: 'Cairo', city: 'Cairo', country: 'Egypt', countryCode: 'EG', timezone: 'Africa/Cairo', lat: 30.0444, lng: 31.2357, flag: '🇪🇬' },
  { id: 'johannesburg', name: 'Johannesburg', city: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', timezone: 'Africa/Johannesburg', lat: -26.2041, lng: 28.0473, flag: '🇿🇦' },
  { id: 'nairobi', name: 'Nairobi', city: 'Nairobi', country: 'Kenya', countryCode: 'KE', timezone: 'Africa/Nairobi', lat: -1.2921, lng: 36.8219, flag: '🇰🇪' },
  { id: 'lagos', name: 'Lagos', city: 'Lagos', country: 'Nigeria', countryCode: 'NG', timezone: 'Africa/Lagos', lat: 6.5244, lng: 3.3792, flag: '🇳🇬' },
];

export function findCity(query: string): CityData | null {
  if (!query) return null;
  const q = query.trim().toLowerCase().replace(/_/g, ' ');

  const exact = CITIES.find(
    (c) =>
      c.id.toLowerCase() === q ||
      c.city.toLowerCase() === q ||
      c.name.toLowerCase() === q ||
      c.timezone.toLowerCase() === q
  );
  if (exact) return exact;

  return (
    CITIES.find(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.timezone.toLowerCase().includes(q)
    ) || null
  );
}

export function searchCities(query: string): CityData[] {
  if (!query || !query.trim()) return CITIES.slice(0, 15);
  const q = query.trim().toLowerCase();

  return CITIES.filter(
    (c) =>
      c.city.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.timezone.toLowerCase().includes(q)
  );
}
