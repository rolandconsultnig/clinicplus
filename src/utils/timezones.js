/**
 * Comprehensive list of all timezones
 * Based on IANA Time Zone Database
 */

export const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
  
  // North America
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)', offset: '-06:00' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)', offset: '-07:00' },
  { value: 'America/Phoenix', label: 'Arizona', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', offset: '-08:00' },
  { value: 'America/Anchorage', label: 'Alaska', offset: '-09:00' },
  { value: 'America/Honolulu', label: 'Hawaii', offset: '-10:00' },
  { value: 'America/Toronto', label: 'Toronto', offset: '-05:00' },
  { value: 'America/Vancouver', label: 'Vancouver', offset: '-08:00' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: '-06:00' },
  { value: 'America/Monterrey', label: 'Monterrey', offset: '-06:00' },
  { value: 'America/Guatemala', label: 'Guatemala', offset: '-06:00' },
  { value: 'America/Bogota', label: 'Bogota', offset: '-05:00' },
  { value: 'America/Lima', label: 'Lima', offset: '-05:00' },
  { value: 'America/Caracas', label: 'Caracas', offset: '-04:00' },
  { value: 'America/Santiago', label: 'Santiago', offset: '-03:00' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: '-03:00' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo', offset: '-03:00' },
  
  // Europe
  { value: 'Europe/London', label: 'London', offset: '+00:00' },
  { value: 'Europe/Dublin', label: 'Dublin', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Paris', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00' },
  { value: 'Europe/Rome', label: 'Rome', offset: '+01:00' },
  { value: 'Europe/Madrid', label: 'Madrid', offset: '+01:00' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', offset: '+01:00' },
  { value: 'Europe/Brussels', label: 'Brussels', offset: '+01:00' },
  { value: 'Europe/Vienna', label: 'Vienna', offset: '+01:00' },
  { value: 'Europe/Zurich', label: 'Zurich', offset: '+01:00' },
  { value: 'Europe/Stockholm', label: 'Stockholm', offset: '+01:00' },
  { value: 'Europe/Oslo', label: 'Oslo', offset: '+01:00' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen', offset: '+01:00' },
  { value: 'Europe/Helsinki', label: 'Helsinki', offset: '+02:00' },
  { value: 'Europe/Warsaw', label: 'Warsaw', offset: '+01:00' },
  { value: 'Europe/Prague', label: 'Prague', offset: '+01:00' },
  { value: 'Europe/Budapest', label: 'Budapest', offset: '+01:00' },
  { value: 'Europe/Bucharest', label: 'Bucharest', offset: '+02:00' },
  { value: 'Europe/Athens', label: 'Athens', offset: '+02:00' },
  { value: 'Europe/Istanbul', label: 'Istanbul', offset: '+03:00' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: '+03:00' },
  { value: 'Europe/Kiev', label: 'Kiev', offset: '+02:00' },
  { value: 'Europe/Lisbon', label: 'Lisbon', offset: '+00:00' },
  
  // Asia
  { value: 'Asia/Dubai', label: 'Dubai', offset: '+04:00' },
  { value: 'Asia/Karachi', label: 'Karachi', offset: '+05:00' },
  { value: 'Asia/Kolkata', label: 'Mumbai, New Delhi', offset: '+05:30' },
  { value: 'Asia/Dhaka', label: 'Dhaka', offset: '+06:00' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: '+07:00' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: '+08:00' },
  { value: 'Asia/Shanghai', label: 'Beijing, Shanghai', offset: '+08:00' },
  { value: 'Asia/Taipei', label: 'Taipei', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: '+09:00' },
  { value: 'Asia/Manila', label: 'Manila', offset: '+08:00' },
  { value: 'Asia/Jakarta', label: 'Jakarta', offset: '+07:00' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur', offset: '+08:00' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: '+07:00' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh', offset: '+07:00' },
  { value: 'Asia/Riyadh', label: 'Riyadh', offset: '+03:00' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem', offset: '+02:00' },
  { value: 'Asia/Baghdad', label: 'Baghdad', offset: '+03:00' },
  { value: 'Asia/Tehran', label: 'Tehran', offset: '+03:30' },
  { value: 'Asia/Kabul', label: 'Kabul', offset: '+04:30' },
  { value: 'Asia/Yekaterinburg', label: 'Yekaterinburg', offset: '+05:00' },
  { value: 'Asia/Almaty', label: 'Almaty', offset: '+06:00' },
  { value: 'Asia/Ulaanbaatar', label: 'Ulaanbaatar', offset: '+08:00' },
  { value: 'Asia/Vladivostok', label: 'Vladivostok', offset: '+10:00' },
  
  // Africa
  { value: 'Africa/Cairo', label: 'Cairo', offset: '+02:00' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: '+02:00' },
  { value: 'Africa/Lagos', label: 'Lagos', offset: '+01:00' },
  { value: 'Africa/Nairobi', label: 'Nairobi', offset: '+03:00' },
  { value: 'Africa/Casablanca', label: 'Casablanca', offset: '+01:00' },
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa', offset: '+03:00' },
  { value: 'Africa/Tunis', label: 'Tunis', offset: '+01:00' },
  { value: 'Africa/Algiers', label: 'Algiers', offset: '+01:00' },
  
  // Australia & Pacific
  { value: 'Australia/Sydney', label: 'Sydney', offset: '+10:00' },
  { value: 'Australia/Melbourne', label: 'Melbourne', offset: '+10:00' },
  { value: 'Australia/Brisbane', label: 'Brisbane', offset: '+10:00' },
  { value: 'Australia/Perth', label: 'Perth', offset: '+08:00' },
  { value: 'Australia/Adelaide', label: 'Adelaide', offset: '+09:30' },
  { value: 'Australia/Darwin', label: 'Darwin', offset: '+09:30' },
  { value: 'Australia/Hobart', label: 'Hobart', offset: '+10:00' },
  { value: 'Pacific/Auckland', label: 'Auckland', offset: '+12:00' },
  { value: 'Pacific/Fiji', label: 'Fiji', offset: '+12:00' },
  { value: 'Pacific/Guam', label: 'Guam', offset: '+10:00' },
  { value: 'Pacific/Honolulu', label: 'Honolulu', offset: '-10:00' },
  { value: 'Pacific/Samoa', label: 'Samoa', offset: '+13:00' },
  { value: 'Pacific/Tahiti', label: 'Tahiti', offset: '-10:00' },
  
  // Additional timezones
  { value: 'Atlantic/Azores', label: 'Azores', offset: '-01:00' },
  { value: 'Atlantic/Cape_Verde', label: 'Cape Verde', offset: '-01:00' },
  { value: 'Indian/Mauritius', label: 'Mauritius', offset: '+04:00' },
  { value: 'Indian/Maldives', label: 'Maldives', offset: '+05:00' },
  { value: 'Indian/Colombo', label: 'Colombo', offset: '+05:30' },
  { value: 'Asia/Kathmandu', label: 'Kathmandu', offset: '+05:45' },
  { value: 'Asia/Kathmandu', label: 'Kathmandu', offset: '+05:45' },
  { value: 'Asia/Yangon', label: 'Yangon', offset: '+06:30' },
  { value: 'Pacific/Chatham', label: 'Chatham Islands', offset: '+12:45' },
  
  // Additional US timezones
  { value: 'America/Detroit', label: 'Detroit', offset: '-05:00' },
  { value: 'America/Indianapolis', label: 'Indianapolis', offset: '-05:00' },
  { value: 'America/New_York', label: 'New York', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Chicago', offset: '-06:00' },
  { value: 'America/Denver', label: 'Denver', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', offset: '-08:00' },
  { value: 'America/Phoenix', label: 'Phoenix', offset: '-07:00' },
  
  // Additional European timezones
  { value: 'Europe/Luxembourg', label: 'Luxembourg', offset: '+01:00' },
  { value: 'Europe/Monaco', label: 'Monaco', offset: '+01:00' },
  { value: 'Europe/Andorra', label: 'Andorra', offset: '+01:00' },
  { value: 'Europe/San_Marino', label: 'San Marino', offset: '+01:00' },
  { value: 'Europe/Vatican', label: 'Vatican', offset: '+01:00' },
  
  // Additional Asian timezones
  { value: 'Asia/Macau', label: 'Macau', offset: '+08:00' },
  { value: 'Asia/Urumqi', label: 'Urumqi', offset: '+06:00' },
  { value: 'Asia/Pyongyang', label: 'Pyongyang', offset: '+09:00' },
  
  // Additional Pacific timezones
  { value: 'Pacific/Midway', label: 'Midway', offset: '-11:00' },
  { value: 'Pacific/Wake', label: 'Wake Island', offset: '+12:00' },
  { value: 'Pacific/Easter', label: 'Easter Island', offset: '-06:00' },
  { value: 'Pacific/Galapagos', label: 'Galapagos', offset: '-06:00' },
  
  // Additional South American timezones
  { value: 'America/Montevideo', label: 'Montevideo', offset: '-03:00' },
  { value: 'America/Asuncion', label: 'Asuncion', offset: '-04:00' },
  { value: 'America/La_Paz', label: 'La Paz', offset: '-04:00' },
  { value: 'America/Guayaquil', label: 'Guayaquil', offset: '-05:00' },
  { value: 'America/Manaus', label: 'Manaus', offset: '-04:00' },
  { value: 'America/Recife', label: 'Recife', offset: '-03:00' },
  { value: 'America/Fortaleza', label: 'Fortaleza', offset: '-03:00' },
  { value: 'America/Cayenne', label: 'Cayenne', offset: '-03:00' },
  { value: 'America/Paramaribo', label: 'Paramaribo', offset: '-03:00' },
  { value: 'America/Georgetown', label: 'Georgetown', offset: '-04:00' },
  
  // Additional African timezones
  { value: 'Africa/Dar_es_Salaam', label: 'Dar es Salaam', offset: '+03:00' },
  { value: 'Africa/Kampala', label: 'Kampala', offset: '+03:00' },
  { value: 'Africa/Khartoum', label: 'Khartoum', offset: '+02:00' },
  { value: 'Africa/Maputo', label: 'Maputo', offset: '+02:00' },
  { value: 'Africa/Windhoek', label: 'Windhoek', offset: '+02:00' },
  { value: 'Africa/Accra', label: 'Accra', offset: '+00:00' },
  { value: 'Africa/Abidjan', label: 'Abidjan', offset: '+00:00' },
  { value: 'Africa/Dakar', label: 'Dakar', offset: '+00:00' },
  
  // Additional Middle Eastern timezones
  { value: 'Asia/Beirut', label: 'Beirut', offset: '+02:00' },
  { value: 'Asia/Damascus', label: 'Damascus', offset: '+02:00' },
  { value: 'Asia/Amman', label: 'Amman', offset: '+02:00' },
  { value: 'Asia/Kuwait', label: 'Kuwait', offset: '+03:00' },
  { value: 'Asia/Bahrain', label: 'Bahrain', offset: '+03:00' },
  { value: 'Asia/Qatar', label: 'Qatar', offset: '+03:00' },
  { value: 'Asia/Muscat', label: 'Muscat', offset: '+04:00' },
  { value: 'Asia/Baku', label: 'Baku', offset: '+04:00' },
  { value: 'Asia/Tbilisi', label: 'Tbilisi', offset: '+04:00' },
  { value: 'Asia/Yerevan', label: 'Yerevan', offset: '+04:00' },
  
  // Additional Central Asian timezones
  { value: 'Asia/Tashkent', label: 'Tashkent', offset: '+05:00' },
  { value: 'Asia/Dushanbe', label: 'Dushanbe', offset: '+05:00' },
  { value: 'Asia/Ashgabat', label: 'Ashgabat', offset: '+05:00' },
  { value: 'Asia/Bishkek', label: 'Bishkek', offset: '+06:00' },
  
  // Additional Southeast Asian timezones
  { value: 'Asia/Rangoon', label: 'Rangoon', offset: '+06:30' },
  { value: 'Asia/Phnom_Penh', label: 'Phnom Penh', offset: '+07:00' },
  { value: 'Asia/Vientiane', label: 'Vientiane', offset: '+07:00' },
  
  // Additional East Asian timezones
  { value: 'Asia/Ulan_Bator', label: 'Ulan Bator', offset: '+08:00' },
  { value: 'Asia/Krasnoyarsk', label: 'Krasnoyarsk', offset: '+07:00' },
  { value: 'Asia/Irkutsk', label: 'Irkutsk', offset: '+08:00' },
  { value: 'Asia/Yakutsk', label: 'Yakutsk', offset: '+09:00' },
  { value: 'Asia/Magadan', label: 'Magadan', offset: '+11:00' },
  { value: 'Asia/Sakhalin', label: 'Sakhalin', offset: '+11:00' },
  { value: 'Asia/Kamchatka', label: 'Kamchatka', offset: '+12:00' },
  
  // Additional Australian timezones
  { value: 'Australia/Canberra', label: 'Canberra', offset: '+10:00' },
  { value: 'Australia/Lord_Howe', label: 'Lord Howe Island', offset: '+10:30' },
  
  // Additional Pacific timezones
  { value: 'Pacific/Norfolk', label: 'Norfolk Island', offset: '+11:00' },
  { value: 'Pacific/Port_Moresby', label: 'Port Moresby', offset: '+10:00' },
  { value: 'Pacific/Guadalcanal', label: 'Guadalcanal', offset: '+11:00' },
  { value: 'Pacific/Noumea', label: 'Noumea', offset: '+11:00' },
  { value: 'Pacific/Apia', label: 'Apia', offset: '+13:00' },
  { value: 'Pacific/Tongatapu', label: 'Tongatapu', offset: '+13:00' },
  { value: 'Pacific/Kiritimati', label: 'Kiritimati', offset: '+14:00' },
  
  // Additional Atlantic timezones
  { value: 'Atlantic/Bermuda', label: 'Bermuda', offset: '-04:00' },
  { value: 'Atlantic/Canary', label: 'Canary Islands', offset: '+00:00' },
  { value: 'Atlantic/Madeira', label: 'Madeira', offset: '+00:00' },
  { value: 'Atlantic/Reykjavik', label: 'Reykjavik', offset: '+00:00' },
  { value: 'Atlantic/Faroe', label: 'Faroe Islands', offset: '+00:00' },
  
  // Additional Indian Ocean timezones
  { value: 'Indian/Chagos', label: 'Chagos', offset: '+06:00' },
  { value: 'Indian/Cocos', label: 'Cocos Islands', offset: '+06:30' },
  { value: 'Indian/Christmas', label: 'Christmas Island', offset: '+07:00' },
  { value: 'Indian/Reunion', label: 'Reunion', offset: '+04:00' },
  { value: 'Indian/Seychelles', label: 'Seychelles', offset: '+04:00' },
  { value: 'Indian/Comoro', label: 'Comoro', offset: '+03:00' },
  { value: 'Indian/Mayotte', label: 'Mayotte', offset: '+03:00' },
  { value: 'Indian/Antananarivo', label: 'Antananarivo', offset: '+03:00' },
  
  // Additional Arctic timezones
  { value: 'Arctic/Longyearbyen', label: 'Longyearbyen', offset: '+01:00' },
  
  // Additional Antarctic timezones
  { value: 'Antarctica/McMurdo', label: 'McMurdo', offset: '+12:00' },
  { value: 'Antarctica/Casey', label: 'Casey', offset: '+08:00' },
  { value: 'Antarctica/Davis', label: 'Davis', offset: '+07:00' },
  { value: 'Antarctica/Mawson', label: 'Mawson', offset: '+05:00' },
  { value: 'Antarctica/Rothera', label: 'Rothera', offset: '-03:00' },
  { value: 'Antarctica/Palmer', label: 'Palmer', offset: '-03:00' },
  { value: 'Antarctica/Vostok', label: 'Vostok', offset: '+06:00' },
];

/**
 * Get timezone by value
 */
export const getTimezone = (value) => {
  return TIMEZONES.find(tz => tz.value === value);
};

/**
 * Get timezones grouped by region
 */
export const getTimezonesByRegion = () => {
  const regions = {
    'UTC': [],
    'North America': [],
    'South America': [],
    'Europe': [],
    'Africa': [],
    'Asia': [],
    'Australia & Pacific': [],
    'Atlantic': [],
    'Indian Ocean': [],
    'Arctic & Antarctic': []
  };
  
  TIMEZONES.forEach(tz => {
    if (tz.value === 'UTC') {
      regions['UTC'].push(tz);
    } else if (tz.value.startsWith('America/')) {
      if (['America/Santiago', 'America/Buenos_Aires', 'America/Sao_Paulo', 'America/Montevideo', 'America/Asuncion', 'America/La_Paz', 'America/Guayaquil', 'America/Manaus', 'America/Recife', 'America/Fortaleza', 'America/Cayenne', 'America/Paramaribo', 'America/Georgetown'].includes(tz.value)) {
        regions['South America'].push(tz);
      } else {
        regions['North America'].push(tz);
      }
    } else if (tz.value.startsWith('Europe/')) {
      regions['Europe'].push(tz);
    } else if (tz.value.startsWith('Africa/')) {
      regions['Africa'].push(tz);
    } else if (tz.value.startsWith('Asia/')) {
      regions['Asia'].push(tz);
    } else if (tz.value.startsWith('Australia/') || tz.value.startsWith('Pacific/')) {
      regions['Australia & Pacific'].push(tz);
    } else if (tz.value.startsWith('Atlantic/')) {
      regions['Atlantic'].push(tz);
    } else if (tz.value.startsWith('Indian/')) {
      regions['Indian Ocean'].push(tz);
    } else if (tz.value.startsWith('Arctic/') || tz.value.startsWith('Antarctica/')) {
      regions['Arctic & Antarctic'].push(tz);
    }
  });
  
  return regions;
};

/**
 * Get current user's timezone (browser detection)
 */
export const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return 'UTC';
  }
};

/**
 * Format timezone label with offset
 */
export const formatTimezoneLabel = (timezone) => {
  const tz = getTimezone(timezone);
  if (tz) {
    return `${tz.label} (${tz.offset})`;
  }
  return timezone;
};

export default TIMEZONES;

