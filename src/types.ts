export type WeatherTab = 'current' | 'golf';

export interface DailyForecast {
  day: string;
  date: number;
  icon: string;
  high: number;
  low: number;
  condition: string;
  amIcon?: string;
  pmIcon?: string;
  amProb?: number;
  pmProb?: number;
  fullDate?: string; // YYYYMMDD
  isSingle?: boolean; // For days 8-10
}

export interface HourlyForecast {
  time: string;
  icon: string;
  temp: number;
}

export interface WeatherData {
  temp: number | null;
  condition: string;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  precipitation: number | null;
  uvIndex: number | null;
  uvLabel: string;
  tempDiff: number | null;
  ozone: number | null;
  ozoneLabel: string;
  fineDust: number | null;
  fineDustLabel: string;
  ultraFineDust: number | null;
  ultraFineDustLabel: string;
  airForecastPM10?: string;
  airForecastPM25?: string;
  airForecastO3?: string;
  sunrise?: string;
  sunset?: string;
  baseTime?: string;
  baseDate?: string;
  forecast: DailyForecast[];
}

export interface GolfData {
  date: string;
  roundingIndex: 'Great' | 'Good' | 'Fair' | 'Poor' | 'N/A';
  windGusts: number | null;
  humidity: number | null;
  humidityLabel: string;
  precipitation: number | null;
  rainfall: number | null;
  fineDust: number | null;
  fineDustLabel: string;
  ultraFineDust: number | null;
  ultraFineDustLabel: string;
  greenSpeed?: string | null;
  hourly: HourlyForecast[];
}
