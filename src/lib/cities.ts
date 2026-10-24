import { CityData } from '@/types';

export const CITIES: CityData[] = [
  // ==========================================
  // ASIA & SOUTH ASIA
  // ==========================================
  { id: 'tokyo', name: 'Tokyo', city: 'Tokyo', country: 'Japan', countryCode: 'JP', timezone: 'Asia/Tokyo', lat: 35.6762, lng: 139.6503, flag: '🇯🇵' },
  { id: 'osaka', name: 'Osaka', city: 'Osaka', country: 'Japan', countryCode: 'JP', timezone: 'Asia/Tokyo', lat: 34.6937, lng: 135.5023, flag: '🇯🇵' },
  { id: 'kyoto', name: 'Kyoto', city: 'Kyoto', country: 'Japan', countryCode: 'JP', timezone: 'Asia/Tokyo', lat: 35.0116, lng: 135.7681, flag: '🇯🇵' },
  { id: 'seoul', name: 'Seoul', city: 'Seoul', country: 'South Korea', countryCode: 'KR', timezone: 'Asia/Seoul', lat: 37.5665, lng: 126.9780, flag: '🇰🇷' },
  { id: 'busan', name: 'Busan', city: 'Busan', country: 'South Korea', countryCode: 'KR', timezone: 'Asia/Seoul', lat: 35.1796, lng: 129.0756, flag: '🇰🇷' },
  { id: 'beijing', name: 'Beijing', city: 'Beijing', country: 'China', countryCode: 'CN', timezone: 'Asia/Shanghai', lat: 39.9042, lng: 116.4074, flag: '🇨🇳' },
  { id: 'shanghai', name: 'Shanghai', city: 'Shanghai', country: 'China', countryCode: 'CN', timezone: 'Asia/Shanghai', lat: 31.2304, lng: 121.4737, flag: '🇨🇳' },
  { id: 'shenzhen', name: 'Shenzhen', city: 'Shenzhen', country: 'China', countryCode: 'CN', timezone: 'Asia/Shanghai', lat: 22.5431, lng: 114.0579, flag: '🇨🇳' },
  { id: 'guangzhou', name: 'Guangzhou', city: 'Guangzhou', country: 'China', countryCode: 'CN', timezone: 'Asia/Shanghai', lat: 23.1291, lng: 113.2644, flag: '🇨🇳' },
  { id: 'hong_kong', name: 'Hong Kong', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', timezone: 'Asia/Hong_Kong', lat: 22.3193, lng: 114.1694, flag: '🇭🇰' },
  { id: 'taipei', name: 'Taipei', city: 'Taipei', country: 'Taiwan', countryCode: 'TW', timezone: 'Asia/Taipei', lat: 25.0330, lng: 121.5654, flag: '🇹🇼' },
  { id: 'singapore', name: 'Singapore', city: 'Singapore', country: 'Singapore', countryCode: 'SG', timezone: 'Asia/Singapore', lat: 1.3521, lng: 103.8198, flag: '🇸🇬' },
  { id: 'bangkok', name: 'Bangkok', city: 'Bangkok', country: 'Thailand', countryCode: 'TH', timezone: 'Asia/Bangkok', lat: 13.7563, lng: 100.5018, flag: '🇹🇭' },
  { id: 'jakarta', name: 'Jakarta', city: 'Jakarta', country: 'Indonesia', countryCode: 'ID', timezone: 'Asia/Jakarta', lat: -6.2088, lng: 106.8456, flag: '🇮🇩' },
  { id: 'bali', name: 'Bali (Denpasar)', city: 'Denpasar', country: 'Indonesia', countryCode: 'ID', timezone: 'Asia/Makassar', lat: -8.6705, lng: 115.2126, flag: '🇮🇩' },
  { id: 'kuala_lumpur', name: 'Kuala Lumpur', city: 'Kuala Lumpur', country: 'Malaysia', countryCode: 'MY', timezone: 'Asia/Kuala_Lumpur', lat: 3.1390, lng: 101.6869, flag: '🇲🇾' },
  { id: 'manila', name: 'Manila', city: 'Manila', country: 'Philippines', countryCode: 'PH', timezone: 'Asia/Manila', lat: 14.5995, lng: 120.9842, flag: '🇵🇭' },
  { id: 'hanoi', name: 'Hanoi', city: 'Hanoi', country: 'Vietnam', countryCode: 'VN', timezone: 'Asia/Ho_Chi_Minh', lat: 21.0285, lng: 105.8542, flag: '🇻🇳' },
  { id: 'ho_chi_minh', name: 'Ho Chi Minh City', city: 'Ho Chi Minh City', country: 'Vietnam', countryCode: 'VN', timezone: 'Asia/Ho_Chi_Minh', lat: 10.8231, lng: 106.6297, flag: '🇻🇳' },
  { id: 'delhi', name: 'New Delhi', city: 'New Delhi', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 28.6139, lng: 77.2090, flag: '🇮🇳' },
  { id: 'mumbai', name: 'Mumbai', city: 'Mumbai', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 19.0760, lng: 72.8777, flag: '🇮🇳' },
  { id: 'bengaluru', name: 'Bengaluru (Bangalore)', city: 'Bengaluru', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 12.9716, lng: 77.5946, flag: '🇮🇳' },
  { id: 'hyderabad', name: 'Hyderabad', city: 'Hyderabad', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 17.3850, lng: 78.4867, flag: '🇮🇳' },
  { id: 'kolkata', name: 'Kolkata (Calcutta)', city: 'Kolkata', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 22.5726, lng: 88.3639, flag: '🇮🇳' },
  { id: 'chennai', name: 'Chennai (Madras)', city: 'Chennai', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 13.0827, lng: 80.2707, flag: '🇮🇳' },
  { id: 'ahmedabad', name: 'Ahmedabad', city: 'Ahmedabad', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 23.0225, lng: 72.5714, flag: '🇮🇳' },
  { id: 'pune', name: 'Pune', city: 'Pune', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 18.5204, lng: 73.8567, flag: '🇮🇳' },
  { id: 'jaipur', name: 'Jaipur', city: 'Jaipur', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 26.9124, lng: 75.7873, flag: '🇮🇳' },
  { id: 'dhaka', name: 'Dhaka', city: 'Dhaka', country: 'Bangladesh', countryCode: 'BD', timezone: 'Asia/Dhaka', lat: 23.8103, lng: 90.4125, flag: '🇧🇩' },
  { id: 'karachi', name: 'Karachi', city: 'Karachi', country: 'Pakistan', countryCode: 'PK', timezone: 'Asia/Karachi', lat: 24.8607, lng: 67.0011, flag: '🇵🇰' },
  { id: 'lahore', name: 'Lahore', city: 'Lahore', country: 'Pakistan', countryCode: 'PK', timezone: 'Asia/Karachi', lat: 31.5204, lng: 74.3587, flag: '🇵🇰' },
  { id: 'islamabad', name: 'Islamabad', city: 'Islamabad', country: 'Pakistan', countryCode: 'PK', timezone: 'Asia/Karachi', lat: 33.6844, lng: 73.0479, flag: '🇵🇰' },
  { id: 'colombo', name: 'Colombo', city: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', timezone: 'Asia/Colombo', lat: 6.9271, lng: 79.8612, flag: '🇱🇰' },
  { id: 'kathmandu', name: 'Kathmandu', city: 'Kathmandu', country: 'Nepal', countryCode: 'NP', timezone: 'Asia/Kathmandu', lat: 27.7172, lng: 85.3240, flag: '🇳🇵' },
  { id: 'tashkent', name: 'Tashkent', city: 'Tashkent', country: 'Uzbekistan', countryCode: 'UZ', timezone: 'Asia/Tashkent', lat: 41.2995, lng: 69.2401, flag: '🇺🇿' },
  { id: 'almaty', name: 'Almaty', city: 'Almaty', country: 'Kazakhstan', countryCode: 'KZ', timezone: 'Asia/Almaty', lat: 43.2220, lng: 76.8512, flag: '🇰🇿' },

  // ==========================================
  // MIDDLE EAST & WEST ASIA
  // ==========================================
  { id: 'dubai', name: 'Dubai', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', timezone: 'Asia/Dubai', lat: 25.2048, lng: 55.2708, flag: '🇦🇪' },
  { id: 'abu_dhabi', name: 'Abu Dhabi', city: 'Abu Dhabi', country: 'United Arab Emirates', countryCode: 'AE', timezone: 'Asia/Dubai', lat: 24.4539, lng: 54.3773, flag: '🇦🇪' },
  { id: 'riyadh', name: 'Riyadh', city: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', timezone: 'Asia/Riyadh', lat: 24.7136, lng: 46.6753, flag: '🇸🇦' },
  { id: 'jeddah', name: 'Jeddah', city: 'Jeddah', country: 'Saudi Arabia', countryCode: 'SA', timezone: 'Asia/Riyadh', lat: 21.5433, lng: 39.1728, flag: '🇸🇦' },
  { id: 'doha', name: 'Doha', city: 'Doha', country: 'Qatar', countryCode: 'QA', timezone: 'Asia/Qatar', lat: 25.2854, lng: 51.5310, flag: '🇶🇦' },
  { id: 'kuwait_city', name: 'Kuwait City', city: 'Kuwait City', country: 'Kuwait', countryCode: 'KW', timezone: 'Asia/Kuwait', lat: 29.3759, lng: 47.9774, flag: '🇰🇼' },
  { id: 'muscat', name: 'Muscat', city: 'Muscat', country: 'Oman', countryCode: 'OM', timezone: 'Asia/Muscat', lat: 23.5880, lng: 58.3829, flag: '🇴🇲' },
  { id: 'tel_aviv', name: 'Tel Aviv', city: 'Tel Aviv', country: 'Israel', countryCode: 'IL', timezone: 'Asia/Jerusalem', lat: 32.0853, lng: 34.7818, flag: '🇮🇱' },
  { id: 'beirut', name: 'Beirut', city: 'Beirut', country: 'Lebanon', countryCode: 'LB', timezone: 'Asia/Beirut', lat: 33.8938, lng: 35.5018, flag: '🇱🇧' },
  { id: 'baghdad', name: 'Baghdad', city: 'Baghdad', country: 'Iraq', countryCode: 'IQ', timezone: 'Asia/Baghdad', lat: 33.3152, lng: 44.3661, flag: '🇮🇶' },
  { id: 'tehran', name: 'Tehran', city: 'Tehran', country: 'Iran', countryCode: 'IR', timezone: 'Asia/Tehran', lat: 35.6892, lng: 51.3890, flag: '🇮🇷' },
  { id: 'istanbul', name: 'Istanbul', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', timezone: 'Europe/Istanbul', lat: 41.0082, lng: 28.9784, flag: '🇹🇷' },
  { id: 'ankara', name: 'Ankara', city: 'Ankara', country: 'Turkey', countryCode: 'TR', timezone: 'Europe/Istanbul', lat: 39.9334, lng: 32.8597, flag: '🇹🇷' },

  // ==========================================
  // EUROPE
  // ==========================================
  { id: 'london', name: 'London', city: 'London', country: 'United Kingdom', countryCode: 'GB', timezone: 'Europe/London', lat: 51.5074, lng: -0.1278, flag: '🇬🇧' },
  { id: 'manchester', name: 'Manchester', city: 'Manchester', country: 'United Kingdom', countryCode: 'GB', timezone: 'Europe/London', lat: 53.4808, lng: -2.2426, flag: '🇬🇧' },
  { id: 'edinburgh', name: 'Edinburgh', city: 'Edinburgh', country: 'United Kingdom', countryCode: 'GB', timezone: 'Europe/London', lat: 55.9533, lng: -3.1883, flag: '🇬🇧' },
  { id: 'dublin', name: 'Dublin', city: 'Dublin', country: 'Ireland', countryCode: 'IE', timezone: 'Europe/Dublin', lat: 53.3498, lng: -6.2603, flag: '🇮🇪' },
  { id: 'paris', name: 'Paris', city: 'Paris', country: 'France', countryCode: 'FR', timezone: 'Europe/Paris', lat: 48.8566, lng: 2.3522, flag: '🇫🇷' },
  { id: 'berlin', name: 'Berlin', city: 'Berlin', country: 'Germany', countryCode: 'DE', timezone: 'Europe/Berlin', lat: 52.5200, lng: 13.4050, flag: '🇩🇪' },
  { id: 'munich', name: 'Munich', city: 'Munich', country: 'Germany', countryCode: 'DE', timezone: 'Europe/Berlin', lat: 48.1351, lng: 11.5820, flag: '🇩🇪' },
  { id: 'frankfurt', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', countryCode: 'DE', timezone: 'Europe/Berlin', lat: 50.1109, lng: 8.6821, flag: '🇩🇪' },
  { id: 'amsterdam', name: 'Amsterdam', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', timezone: 'Europe/Amsterdam', lat: 52.3676, lng: 4.9041, flag: '🇳🇱' },
  { id: 'brussels', name: 'Brussels', city: 'Brussels', country: 'Belgium', countryCode: 'BE', timezone: 'Europe/Brussels', lat: 50.8503, lng: 4.3517, flag: '🇧🇪' },
  { id: 'madrid', name: 'Madrid', city: 'Madrid', country: 'Spain', countryCode: 'ES', timezone: 'Europe/Madrid', lat: 40.4168, lng: -3.7038, flag: '🇪🇸' },
  { id: 'barcelona', name: 'Barcelona', city: 'Barcelona', country: 'Spain', countryCode: 'ES', timezone: 'Europe/Madrid', lat: 41.3879, lng: 2.1699, flag: '🇪🇸' },
  { id: 'rome', name: 'Rome', city: 'Rome', country: 'Italy', countryCode: 'IT', timezone: 'Europe/Rome', lat: 41.9028, lng: 12.4964, flag: '🇮🇹' },
  { id: 'milan', name: 'Milan', city: 'Milan', country: 'Italy', countryCode: 'IT', timezone: 'Europe/Rome', lat: 45.4642, lng: 9.1900, flag: '🇮🇹' },
  { id: 'zurich', name: 'Zurich', city: 'Zurich', country: 'Switzerland', countryCode: 'CH', timezone: 'Europe/Zurich', lat: 47.3769, lng: 8.5417, flag: '🇨🇭' },
  { id: 'geneva', name: 'Geneva', city: 'Geneva', country: 'Switzerland', countryCode: 'CH', timezone: 'Europe/Zurich', lat: 46.2044, lng: 6.1432, flag: '🇨🇭' },
  { id: 'vienna', name: 'Vienna', city: 'Vienna', country: 'Austria', countryCode: 'AT', timezone: 'Europe/Vienna', lat: 48.2082, lng: 16.3738, flag: '🇦🇹' },
  { id: 'lisbon', name: 'Lisbon', city: 'Lisbon', country: 'Portugal', countryCode: 'PT', timezone: 'Europe/Lisbon', lat: 38.7223, lng: -9.1393, flag: '🇵🇹' },
  { id: 'stockholm', name: 'Stockholm', city: 'Stockholm', country: 'Sweden', countryCode: 'SE', timezone: 'Europe/Stockholm', lat: 59.3293, lng: 18.0686, flag: '🇸🇪' },
  { id: 'oslo', name: 'Oslo', city: 'Oslo', country: 'Norway', countryCode: 'NO', timezone: 'Europe/Oslo', lat: 59.9139, lng: 10.7522, flag: '🇳🇴' },
  { id: 'copenhagen', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark', countryCode: 'DK', timezone: 'Europe/Copenhagen', lat: 55.6761, lng: 12.5683, flag: '🇩🇰' },
  { id: 'helsinki', name: 'Helsinki', city: 'Helsinki', country: 'Finland', countryCode: 'FI', timezone: 'Europe/Helsinki', lat: 60.1699, lng: 24.9384, flag: '🇫🇮' },
  { id: 'athens', name: 'Athens', city: 'Athens', country: 'Greece', countryCode: 'GR', timezone: 'Europe/Athens', lat: 37.9838, lng: 23.7275, flag: '🇬🇷' },
  { id: 'warsaw', name: 'Warsaw', city: 'Warsaw', country: 'Poland', countryCode: 'PL', timezone: 'Europe/Warsaw', lat: 52.2297, lng: 21.0122, flag: '🇵🇱' },
  { id: 'prague', name: 'Prague', city: 'Prague', country: 'Czech Republic', countryCode: 'CZ', timezone: 'Europe/Prague', lat: 50.0755, lng: 14.4378, flag: '🇨🇿' },
  { id: 'budapest', name: 'Budapest', city: 'Budapest', country: 'Hungary', countryCode: 'HU', timezone: 'Europe/Budapest', lat: 47.4979, lng: 19.0402, flag: '🇭🇺' },
  { id: 'kyiv', name: 'Kyiv', city: 'Kyiv', country: 'Ukraine', countryCode: 'UA', timezone: 'Europe/Kyiv', lat: 50.4501, lng: 30.5234, flag: '🇺🇦' },
  { id: 'moscow', name: 'Moscow', city: 'Moscow', country: 'Russia', countryCode: 'RU', timezone: 'Europe/Moscow', lat: 55.7558, lng: 37.6173, flag: '🇷🇺' },

  // ==========================================
  // NORTH AMERICA
  // ==========================================
  { id: 'new_york', name: 'New York', city: 'New York', country: 'United States', countryCode: 'US', timezone: 'America/New_York', lat: 40.7128, lng: -74.0060, flag: '🇺🇸' },
  { id: 'boston', name: 'Boston', city: 'Boston', country: 'United States', countryCode: 'US', timezone: 'America/New_York', lat: 42.3601, lng: -71.0589, flag: '🇺🇸' },
  { id: 'washington_dc', name: 'Washington D.C.', city: 'Washington D.C.', country: 'United States', countryCode: 'US', timezone: 'America/New_York', lat: 38.9072, lng: -77.0369, flag: '🇺🇸' },
  { id: 'miami', name: 'Miami', city: 'Miami', country: 'United States', countryCode: 'US', timezone: 'America/New_York', lat: 25.7617, lng: -80.1918, flag: '🇺🇸' },
  { id: 'atlanta', name: 'Atlanta', city: 'Atlanta', country: 'United States', countryCode: 'US', timezone: 'America/New_York', lat: 33.7490, lng: -84.3880, flag: '🇺🇸' },
  { id: 'chicago', name: 'Chicago', city: 'Chicago', country: 'United States', countryCode: 'US', timezone: 'America/Chicago', lat: 41.8781, lng: -87.6298, flag: '🇺🇸' },
  { id: 'houston', name: 'Houston', city: 'Houston', country: 'United States', countryCode: 'US', timezone: 'America/Chicago', lat: 29.7604, lng: -95.3698, flag: '🇺🇸' },
  { id: 'dallas', name: 'Dallas', city: 'Dallas', country: 'United States', countryCode: 'US', timezone: 'America/Chicago', lat: 32.7767, lng: -96.7970, flag: '🇺🇸' },
  { id: 'austin', name: 'Austin', city: 'Austin', country: 'United States', countryCode: 'US', timezone: 'America/Chicago', lat: 30.2672, lng: -97.7431, flag: '🇺🇸' },
  { id: 'denver', name: 'Denver', city: 'Denver', country: 'United States', countryCode: 'US', timezone: 'America/Denver', lat: 39.7392, lng: -104.9903, flag: '🇺🇸' },
  { id: 'phoenix', name: 'Phoenix', city: 'Phoenix', country: 'United States', countryCode: 'US', timezone: 'America/Phoenix', lat: 33.4484, lng: -112.0740, flag: '🇺🇸' },
  { id: 'los_angeles', name: 'Los Angeles', city: 'Los Angeles', country: 'United States', countryCode: 'US', timezone: 'America/Los_Angeles', lat: 34.0522, lng: -118.2437, flag: '🇺🇸' },
  { id: 'san_francisco', name: 'San Francisco', city: 'San Francisco', country: 'United States', countryCode: 'US', timezone: 'America/Los_Angeles', lat: 37.7749, lng: -122.4194, flag: '🇺🇸' },
  { id: 'seattle', name: 'Seattle', city: 'Seattle', country: 'United States', countryCode: 'US', timezone: 'America/Los_Angeles', lat: 47.6062, lng: -122.3321, flag: '🇺🇸' },
  { id: 'las_vegas', name: 'Las Vegas', city: 'Las Vegas', country: 'United States', countryCode: 'US', timezone: 'America/Los_Angeles', lat: 36.1699, lng: -115.1398, flag: '🇺🇸' },
  { id: 'honolulu', name: 'Honolulu', city: 'Honolulu', country: 'United States', countryCode: 'US', timezone: 'Pacific/Honolulu', lat: 21.3069, lng: -157.8583, flag: '🇺🇸' },
  { id: 'anchorage', name: 'Anchorage', city: 'Anchorage', country: 'United States', countryCode: 'US', timezone: 'America/Anchorage', lat: 61.2181, lng: -149.9003, flag: '🇺🇸' },
  { id: 'toronto', name: 'Toronto', city: 'Toronto', country: 'Canada', countryCode: 'CA', timezone: 'America/Toronto', lat: 43.6532, lng: -79.3832, flag: '🇨🇦' },
  { id: 'montreal', name: 'Montreal', city: 'Montreal', country: 'Canada', countryCode: 'CA', timezone: 'America/Toronto', lat: 45.5017, lng: -73.5673, flag: '🇨🇦' },
  { id: 'vancouver', name: 'Vancouver', city: 'Vancouver', country: 'Canada', countryCode: 'CA', timezone: 'America/Vancouver', lat: 49.2827, lng: -123.1207, flag: '🇨🇦' },
  { id: 'calgary', name: 'Calgary', city: 'Calgary', country: 'Canada', countryCode: 'CA', timezone: 'America/Edmonton', lat: 51.0447, lng: -114.0719, flag: '🇨🇦' },
  { id: 'mexico_city', name: 'Mexico City', city: 'Mexico City', country: 'Mexico', countryCode: 'MX', timezone: 'America/Mexico_City', lat: 19.4326, lng: -99.1332, flag: '🇲🇽' },
  { id: 'cancun', name: 'Cancún', city: 'Cancún', country: 'Mexico', countryCode: 'MX', timezone: 'America/Cancun', lat: 21.1619, lng: -86.8515, flag: '🇲🇽' },

  // ==========================================
  // LATIN AMERICA
  // ==========================================
  { id: 'sao_paulo', name: 'São Paulo', city: 'São Paulo', country: 'Brazil', countryCode: 'BR', timezone: 'America/Sao_Paulo', lat: -23.5505, lng: -46.6333, flag: '🇧🇷' },
  { id: 'rio_de_janeiro', name: 'Rio de Janeiro', city: 'Rio de Janeiro', country: 'Brazil', countryCode: 'BR', timezone: 'America/Sao_Paulo', lat: -22.9068, lng: -43.1729, flag: '🇧🇷' },
  { id: 'buenos_aires', name: 'Buenos Aires', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', timezone: 'America/Argentina/Buenos_Aires', lat: -34.6037, lng: -58.3816, flag: '🇦🇷' },
  { id: 'santiago', name: 'Santiago', city: 'Santiago', country: 'Chile', countryCode: 'CL', timezone: 'America/Santiago', lat: -33.4489, lng: -70.6693, flag: '🇨🇱' },
  { id: 'bogota', name: 'Bogotá', city: 'Bogotá', country: 'Colombia', countryCode: 'CO', timezone: 'America/Bogota', lat: 4.7110, lng: -74.0721, flag: '🇨🇴' },
  { id: 'lima', name: 'Lima', city: 'Lima', country: 'Peru', countryCode: 'PE', timezone: 'America/Lima', lat: -12.0464, lng: -77.0428, flag: '🇵🇪' },
  { id: 'panama_city', name: 'Panama City', city: 'Panama City', country: 'Panama', countryCode: 'PA', timezone: 'America/Panama', lat: 8.9824, lng: -79.5199, flag: '🇵🇦' },
  { id: 'montevideo', name: 'Montevideo', city: 'Montevideo', country: 'Uruguay', countryCode: 'UY', timezone: 'America/Montevideo', lat: -34.9011, lng: -56.1645, flag: '🇺🇾' },

  // ==========================================
  // OCEANIA & PACIFIC
  // ==========================================
  { id: 'sydney', name: 'Sydney', city: 'Sydney', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Sydney', lat: -33.8688, lng: 151.2093, flag: '🇦🇺' },
  { id: 'melbourne', name: 'Melbourne', city: 'Melbourne', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Melbourne', lat: -37.8136, lng: 144.9631, flag: '🇦🇺' },
  { id: 'brisbane', name: 'Brisbane', city: 'Brisbane', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Brisbane', lat: -27.4698, lng: 153.0251, flag: '🇦🇺' },
  { id: 'perth', name: 'Perth', city: 'Perth', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Perth', lat: -31.9505, lng: 115.8605, flag: '🇦🇺' },
  { id: 'adelaide', name: 'Adelaide', city: 'Adelaide', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Adelaide', lat: -34.9285, lng: 138.6007, flag: '🇦🇺' },
  { id: 'auckland', name: 'Auckland', city: 'Auckland', country: 'New Zealand', countryCode: 'NZ', timezone: 'Pacific/Auckland', lat: -36.8485, lng: 174.7633, flag: '🇳🇿' },
  { id: 'wellington', name: 'Wellington', city: 'Wellington', country: 'New Zealand', countryCode: 'NZ', timezone: 'Pacific/Auckland', lat: -41.2865, lng: 174.7762, flag: '🇳🇿' },
  { id: 'fiji', name: 'Suva', city: 'Suva', country: 'Fiji', countryCode: 'FJ', timezone: 'Pacific/Fiji', lat: -18.1416, lng: 178.4419, flag: '🇫🇯' },

  // ==========================================
  // AFRICA
  // ==========================================
  { id: 'cairo', name: 'Cairo', city: 'Cairo', country: 'Egypt', countryCode: 'EG', timezone: 'Africa/Cairo', lat: 30.0444, lng: 31.2357, flag: '🇪🇬' },
  { id: 'johannesburg', name: 'Johannesburg', city: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', timezone: 'Africa/Johannesburg', lat: -26.2041, lng: 28.0473, flag: '🇿🇦' },
  { id: 'cape_town', name: 'Cape Town', city: 'Cape Town', country: 'South Africa', countryCode: 'ZA', timezone: 'Africa/Johannesburg', lat: -33.9249, lng: 18.4241, flag: '🇿🇦' },
  { id: 'nairobi', name: 'Nairobi', city: 'Nairobi', country: 'Kenya', countryCode: 'KE', timezone: 'Africa/Nairobi', lat: -1.2921, lng: 36.8219, flag: '🇰🇪' },
  { id: 'lagos', name: 'Lagos', city: 'Lagos', country: 'Nigeria', countryCode: 'NG', timezone: 'Africa/Lagos', lat: 6.5244, lng: 3.3792, flag: '🇳🇬' },
  { id: 'accra', name: 'Accra', city: 'Accra', country: 'Ghana', countryCode: 'GH', timezone: 'Africa/Accra', lat: 5.6037, lng: -0.1870, flag: '🇬🇭' },
  { id: 'casablanca', name: 'Casablanca', city: 'Casablanca', country: 'Morocco', countryCode: 'MA', timezone: 'Africa/Casablanca', lat: 33.5731, lng: -7.5898, flag: '🇲🇦' },
  { id: 'addis_ababa', name: 'Addis Ababa', city: 'Addis Ababa', country: 'Ethiopia', countryCode: 'ET', timezone: 'Africa/Addis_Ababa', lat: 9.0320, lng: 38.7469, flag: '🇪🇹' },
];

/**
 * Normalizes common timezone alias discrepancies across browser vendors
 */
export function normalizeTimezone(tz: string): string {
  if (!tz) return '';
  const trimmed = tz.trim();
  const aliasMap: Record<string, string> = {
    'Asia/Calcutta': 'Asia/Kolkata',
    'US/Eastern': 'America/New_York',
    'US/Central': 'America/Chicago',
    'US/Mountain': 'America/Denver',
    'US/Pacific': 'America/Los_Angeles',
    'US/Alaska': 'America/Anchorage',
    'US/Hawaii': 'Pacific/Honolulu',
    'UTC': 'Europe/London',
    'GMT': 'Europe/London',
    'Etc/UTC': 'Europe/London',
    'Etc/GMT': 'Europe/London',
  };
  return aliasMap[trimmed] || trimmed;
}

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
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.timezone.toLowerCase().includes(q)
    ) || null
  );
}

export function searchCities(query: string): CityData[] {
  if (!query || !query.trim()) return CITIES.slice(0, 20);
  const q = query.trim().toLowerCase().replace(/_/g, ' ');

  return CITIES.filter(
    (c) =>
      c.city.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.timezone.toLowerCase().includes(q)
  );
}

/**
 * Finds the nearest geographic city using the Haversine formula
 */
export function findNearestCity(lat: number, lng: number): CityData {
  let closest = CITIES[0];
  let minDistance = Infinity;

  for (const city of CITIES) {
    const dLat = ((city.lat - lat) * Math.PI) / 180;
    const dLng = ((city.lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((city.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = 6371 * c;

    if (distanceKm < minDistance) {
      minDistance = distanceKm;
      closest = city;
    }
  }

  return closest;
}

/**
 * Robust auto-resolver for user browser timezone
 */
export function resolveUserCity(userTz?: string): CityData {
  let resolvedTz = userTz;
  if (!resolvedTz) {
    try {
      resolvedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return CITIES[0];
    }
  }

  const normalized = normalizeTimezone(resolvedTz);

  // 1. Direct match on normalized timezone
  const directMatch = CITIES.find((c) => c.timezone.toLowerCase() === normalized.toLowerCase());
  if (directMatch) return directMatch;

  // 2. City name inside timezone string (e.g. "Asia/Kolkata" -> "Kolkata")
  const parts = normalized.split('/');
  const tzCityPart = parts[parts.length - 1].replace(/_/g, ' ').toLowerCase();
  const cityMatch = CITIES.find(
    (c) =>
      c.city.toLowerCase() === tzCityPart ||
      c.name.toLowerCase().includes(tzCityPart)
  );
  if (cityMatch) return cityMatch;

  // 3. Indian subcontinent fallback
  if (normalized.includes('Kolkata') || normalized.includes('Calcutta') || normalized.includes('India')) {
    return CITIES.find((c) => c.id === 'delhi') || CITIES[0];
  }

  // 4. Default to first city (Tokyo)
  return CITIES[0];
}
