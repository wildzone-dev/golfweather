import { WeatherData, GolfData, DailyForecast, HourlyForecast } from './types';

export const WEATHER_SOURCE = '기상청 날씨누리';

export const MOCK_WEATHER_DATA_MAP: Record<number, WeatherData> = {
  11: {
    temp: 18,
    condition: '대체로 흐림',
    humidity: 82,
    windSpeed: 3,
    windDirection: '북서',
    precipitation: 20,
    uvIndex: 3,
    uvLabel: '보통',
    tempDiff: 3,
    ozone: 0.028,
    ozoneLabel: '좋음',
    fineDust: 24,
    fineDustLabel: '좋음',
    ultraFineDust: 12,
    ultraFineDustLabel: '좋음',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 11, icon: 'CloudSun', high: 18, low: 12, condition: '구름 조금' },
      { day: '내일', date: 12, icon: 'Cloud', high: 16, low: 10, condition: '흐림' },
      { day: '수', date: 13, icon: 'CloudRain', high: 14, low: 9, condition: '비' },
      { day: '목', date: 14, icon: 'Sun', high: 20, low: 11, condition: '맑음' },
      { day: '금', date: 15, icon: 'Sun', high: 22, low: 13, condition: '맑음' },
    ]
  },
  12: {
    temp: 22.2,
    condition: '맑음',
    humidity: 68,
    windSpeed: 1.5,
    windDirection: '서',
    precipitation: 0,
    uvIndex: 4,
    uvLabel: '보통',
    tempDiff: 3,
    ozone: 0.047,
    ozoneLabel: '보통',
    fineDust: 17,
    fineDustLabel: '좋음',
    ultraFineDust: 1,
    ultraFineDustLabel: '좋음',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 12, icon: 'Sun', high: 24, low: 11, condition: '맑음' },
      { day: '내일', date: 13, icon: 'CloudRain', high: 14, low: 9, condition: '비' },
      { day: '수', date: 14, icon: 'Sun', high: 20, low: 11, condition: '맑음' },
      { day: '목', date: 15, icon: 'Sun', high: 22, low: 13, condition: '맑음' },
      { day: '금', date: 16, icon: 'Cloud', high: 19, low: 12, condition: '흐림' },
    ]
  },
  13: {
    temp: 14,
    condition: '비',
    humidity: 90,
    windSpeed: 5,
    windDirection: '동',
    precipitation: 80,
    uvIndex: 1,
    uvLabel: '낮음',
    tempDiff: -2,
    ozone: 0.030,
    ozoneLabel: '좋음',
    fineDust: 18,
    fineDustLabel: '좋음',
    ultraFineDust: 8,
    ultraFineDustLabel: '좋음',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 13, icon: 'CloudRain', high: 14, low: 9, condition: '비' },
      { day: '내일', date: 14, icon: 'Sun', high: 20, low: 11, condition: '맑음' },
      { day: '수', date: 15, icon: 'Sun', high: 22, low: 13, condition: '맑음' },
      { day: '목', date: 16, icon: 'Cloud', high: 19, low: 12, condition: '흐림' },
      { day: '금', date: 17, icon: 'CloudSun', high: 21, low: 14, condition: '구름 조금' },
    ]
  },
  14: {
    temp: 20,
    condition: '맑음',
    humidity: 40,
    windSpeed: 2,
    windDirection: '서',
    precipitation: 10,
    uvIndex: 6,
    uvLabel: '높음',
    tempDiff: 1,
    ozone: 0.035,
    ozoneLabel: '좋음',
    fineDust: 32,
    fineDustLabel: '보통',
    ultraFineDust: 20,
    ultraFineDustLabel: '보통',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 14, icon: 'Sun', high: 20, low: 11, condition: '맑음' },
      { day: '내일', date: 15, icon: 'Sun', high: 22, low: 13, condition: '맑음' },
      { day: '수', date: 16, icon: 'Cloud', high: 19, low: 12, condition: '흐림' },
      { day: '목', date: 17, icon: 'CloudSun', high: 21, low: 14, condition: '구름 조금' },
      { day: '금', date: 18, icon: 'Sun', high: 23, low: 15, condition: '맑음' },
    ]
  },
  15: {
    temp: 23,
    condition: '매우 맑음',
    humidity: 35,
    windSpeed: 2,
    windDirection: '남',
    precipitation: 5,
    uvIndex: 8,
    uvLabel: '매우 높음',
    tempDiff: 2,
    ozone: 0.040,
    ozoneLabel: '좋음',
    fineDust: 55,
    fineDustLabel: '보통',
    ultraFineDust: 30,
    ultraFineDustLabel: '보통',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 15, icon: 'Sun', high: 23, low: 14, condition: '맑음' },
      { day: '내일', date: 16, icon: 'CloudSun', high: 21, low: 13, condition: '구름 조금' },
      { day: '수', date: 17, icon: 'Cloud', high: 20, low: 12, condition: '흐림' },
      { day: '목', date: 18, icon: 'Sun', high: 24, low: 15, condition: '맑음' },
      { day: '금', date: 19, icon: 'Sun', high: 25, low: 16, condition: '맑음' },
    ]
  },
  16: {
    temp: 21,
    condition: '구름 조금',
    humidity: 55,
    windSpeed: 4,
    windDirection: '북동',
    precipitation: 25,
    uvIndex: 4,
    uvLabel: '보통',
    tempDiff: -2,
    ozone: 0.032,
    ozoneLabel: '좋음',
    fineDust: 82,
    fineDustLabel: '나쁨',
    ultraFineDust: 42,
    ultraFineDustLabel: '나쁨',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 16, icon: 'CloudSun', high: 21, low: 13, condition: '구름 조금' },
      { day: '내일', date: 17, icon: 'Cloud', high: 20, low: 12, condition: '흐림' },
      { day: '수', date: 18, icon: 'Sun', high: 24, low: 15, condition: '맑음' },
      { day: '목', date: 19, icon: 'Sun', high: 25, low: 16, condition: '맑음' },
      { day: '금', date: 20, icon: 'CloudRain', high: 18, low: 11, condition: '비' },
    ]
  },
  17: {
    temp: 19,
    condition: '흐림',
    humidity: 65,
    windSpeed: 5,
    windDirection: '북',
    precipitation: 40,
    uvIndex: 2,
    uvLabel: '낮음',
    tempDiff: -2,
    ozone: 0.030,
    ozoneLabel: '좋음',
    fineDust: 38,
    fineDustLabel: '보통',
    ultraFineDust: 22,
    ultraFineDustLabel: '보통',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 17, icon: 'Cloud', high: 19, low: 12, condition: '흐림' },
      { day: '내일', date: 18, icon: 'Sun', high: 24, low: 15, condition: '맑음' },
      { day: '수', date: 19, icon: 'Sun', high: 25, low: 16, condition: '맑음' },
      { day: '목', date: 20, icon: 'CloudRain', high: 18, low: 11, condition: '비' },
      { day: '금', date: 21, icon: 'Cloud', high: 20, low: 14, condition: '흐림' },
    ]
  },
  18: {
    temp: 24,
    condition: '맑음',
    humidity: 42,
    windSpeed: 3,
    windDirection: '남서',
    precipitation: 15,
    uvIndex: 7,
    uvLabel: '높음',
    tempDiff: 3,
    ozone: 0.038,
    ozoneLabel: '좋음',
    fineDust: 28,
    fineDustLabel: '좋음',
    ultraFineDust: 15,
    ultraFineDustLabel: '좋음',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 18, icon: 'Sun', high: 24, low: 15, condition: '맑음' },
      { day: '내일', date: 19, icon: 'Sun', high: 25, low: 16, condition: '맑음' },
      { day: '수', date: 20, icon: 'CloudRain', high: 18, low: 11, condition: '비' },
      { day: '목', date: 21, icon: 'Cloud', high: 20, low: 14, condition: '흐림' },
      { day: '금', date: 22, icon: 'Sun', high: 26, low: 17, condition: '맑음' },
    ]
  },
  19: {
    temp: 25,
    condition: '맑음',
    humidity: 38,
    windSpeed: 2,
    windDirection: '서',
    precipitation: 10,
    uvIndex: 8,
    uvLabel: '매우 높음',
    tempDiff: 1,
    ozone: 0.042,
    ozoneLabel: '좋음',
    fineDust: 42,
    fineDustLabel: '보통',
    ultraFineDust: 25,
    ultraFineDustLabel: '보통',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 19, icon: 'Sun', high: 25, low: 16, condition: '맑음' },
      { day: '내일', date: 20, icon: 'CloudRain', high: 18, low: 11, condition: '비' },
      { day: '수', date: 21, icon: 'Cloud', high: 20, low: 14, condition: '흐림' },
      { day: '목', date: 22, icon: 'Sun', high: 26, low: 17, condition: '맑음' },
      { day: '금', date: 23, icon: 'Sun', high: 27, low: 18, condition: '맑음' },
    ]
  },
  20: {
    temp: 18,
    condition: '비 온 후 흐림',
    humidity: 85,
    windSpeed: 4,
    windDirection: '북서',
    precipitation: 90,
    uvIndex: 2,
    uvLabel: '낮음',
    tempDiff: -4,
    ozone: 0.028,
    ozoneLabel: '좋음',
    fineDust: 20,
    fineDustLabel: '좋음',
    ultraFineDust: 10,
    ultraFineDustLabel: '좋음',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: [
      { day: '오늘', date: 20, icon: 'CloudRain', high: 18, low: 12, condition: '비' },
      { day: '내일', date: 21, icon: 'Cloud', high: 20, low: 14, condition: '흐림' },
      { day: '수', date: 22, icon: 'Sun', high: 26, low: 17, condition: '맑음' },
      { day: '목', date: 23, icon: 'Sun', high: 27, low: 18, condition: '맑음' },
      { day: '금', date: 24, icon: 'CloudSun', high: 24, low: 16, condition: '구름 조금' },
    ]
  }
};

// Default generator to ensure all dates have data
export const getWeatherData = (date: number): WeatherData => {
  if (MOCK_WEATHER_DATA_MAP[date]) return MOCK_WEATHER_DATA_MAP[date];
  
  // Dynamic fallback logic
  const baseData = MOCK_WEATHER_DATA_MAP[11];
  const shift = date - 11;
  const newTemp = baseData.temp + (shift % 5);
  
  return {
    ...baseData,
    temp: newTemp,
    tempDiff: 2,
    ozone: 0.035,
    ozoneLabel: '좋음',
    fineDust: 40,
    fineDustLabel: '보통',
    ultraFineDust: 20,
    ultraFineDustLabel: '보통',
    airForecastPM10: '',
    airForecastPM25: '',
    airForecastO3: '',
    forecast: baseData.forecast.map(f => ({
      ...f, 
      date: date + (f.date - 11),
      high: f.high + (shift % 3),
      low: f.low + (shift % 2)
    }))
  };
};

export const MOCK_GOLF_DATA_MAP: Record<number, GolfData> = {
  11: {
    date: '2026-05-11(월)',
    roundingIndex: 'Great',
    windGusts: 4,
    humidity: 45,
    humidityLabel: '쾌적함',
    precipitation: 20,
    rainfall: 0.5,
    fineDust: 24,
    fineDustLabel: '좋음',
    ultraFineDust: 15,
    ultraFineDustLabel: '좋음',
    hourly: [
      { time: '14:00', icon: 'Sun', temp: 22 },
      { time: '15:00', icon: 'Cloud', temp: 21 },
      { time: '16:00', icon: 'Cloud', temp: 20 },
      { time: '17:00', icon: 'CloudSun', temp: 19 },
      { time: '18:00', icon: 'Moon', temp: 17 },
    ]
  },
  12: {
    date: '2026-05-12(화)',
    roundingIndex: 'Good',
    windGusts: 5,
    humidity: 50,
    humidityLabel: '보통',
    precipitation: 30,
    rainfall: 0.0,
    fineDust: 45,
    fineDustLabel: '보통',
    ultraFineDust: 25,
    ultraFineDustLabel: '보통',
    hourly: [
      { time: '14:00', icon: 'Cloud', temp: 16 },
      { time: '15:00', icon: 'Cloud', temp: 15 },
      { time: '16:00', icon: 'CloudSun', temp: 14 },
      { time: '17:00', icon: 'Sun', temp: 14 },
      { time: '18:00', icon: 'Moon', temp: 12 },
    ]
  }
};

// More robust golf data generation
export const getGolfData = (date: number, overrideWeather?: WeatherData): GolfData => {
  const weather = overrideWeather || getWeatherData(date);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  // Simplified weekday calculation for May 2026
  // May 1st 2026 is Friday (5)
  const dayName = days[(date + 4) % 7]; 
  
  const getHumidityLabel = (humidity: number | null): string => {
    if (humidity === null) return '정보없음';
    if (humidity < 30) return '매우 건조';
    if (humidity < 50) return '쾌적함';
    if (humidity < 70) return '보통';
    return '습함';
  };

  const roundingIndex: 'Great' | 'Good' | 'Fair' | 'Poor' | 'N/A' = 
    (weather.windSpeed === null || weather.temp === null) ? 'N/A' :
    (weather.windSpeed > 10 || weather.temp > 35 || weather.temp < 0) ? 'Poor' : 
    (weather.windSpeed > 5 || weather.temp > 30 || weather.temp < 10) ? 'Fair' : 'Great';

  // Base dynamic data
  const baseData: GolfData = {
    date: `2026-05-${date}(${dayName})`,
    roundingIndex: roundingIndex,
    windGusts: weather.windSpeed,
    humidity: weather.humidity,
    humidityLabel: getHumidityLabel(weather.humidity),
    precipitation: weather.precipitation,
    rainfall: (weather.precipitation !== null && weather.precipitation > 50) ? 2.5 : 0,
    fineDust: weather.fineDust,
    fineDustLabel: weather.fineDustLabel,
    ultraFineDust: weather.ultraFineDust,
    ultraFineDustLabel: weather.ultraFineDustLabel,
    greenSpeed: (weather as any).greenSpeed,
    hourly: [
      { time: '14:00', icon: weather.forecast[0].icon, temp: weather.temp || 0 },
      { time: '15:00', icon: weather.forecast[0].icon, temp: (weather.temp || 0) - 1 },
      { time: '16:00', icon: 'Cloud', temp: (weather.temp || 0) - 2 },
      { time: '17:00', icon: 'CloudSun', temp: (weather.temp || 0) - 3 },
      { time: '18:00', icon: 'Moon', temp: (weather.temp || 0) - 5 },
    ]
  };

  // If we have manual overrides in MOCK_GOLF_DATA_MAP, we could apply them,
  // but for consistency it's better to stick to the weather data.
  // We'll ignore the static map if the goal is absolute consistency.
  return baseData;
};

const baseHourly = (date: number, baseTemp: number): HourlyForecast[] => {
  return [
    { time: '14:00', icon: (date % 2 === 0 ? 'Sun' : 'Cloud'), temp: baseTemp + 2 },
    { time: '15:00', icon: 'Cloud', temp: baseTemp + 1 },
    { time: '16:00', icon: 'CloudSun', temp: baseTemp },
    { time: '17:00', icon: 'CloudSun', temp: baseTemp - 1 },
    { time: '18:00', icon: 'Moon', temp: baseTemp - 3 },
  ];
};

const now = new Date();
const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const KOREAN_HOLIDAYS: Record<string, string> = {
  '5-5': '어린이날',
  '5-24': '부처님 오신 날',
  '5-25': '대체공휴일',
  '6-6': '현충일',
  '8-15': '광복절',
  '10-3': '개천절',
  '10-9': '한글날',
  '12-25': '크리스마스',
};

export const DATES = Array.from({ length: 10 }, (_, i) => {
  const d = new Date(now);
  d.setDate(now.getDate() + i);
  const month = d.getMonth() + 1;
  const dateVal = d.getDate();
  const dayOfWeek = d.getDay();
  const dayName = i === 0 ? '오늘' : weekDays[dayOfWeek];
  
  const holidayKey = `${month}-${dateVal}`;
  const holidayName = KOREAN_HOLIDAYS[holidayKey];
  
  return { 
    label: dayName, 
    date: dateVal,
    isSaturday: dayOfWeek === 6,
    isSunday: dayOfWeek === 0,
    isHoliday: !!holidayName,
    holidayName: holidayName || null
  };
});
