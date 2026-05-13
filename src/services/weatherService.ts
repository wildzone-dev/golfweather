/**
 * Weather Service using Korea Meteorological Administration (KMA) and AirKorea APIs
 */

import { DailyForecast } from '../types';

const LOCATION = { 
  lat: 37.3593, 
  lng: 127.8424,
  nx: 75,
  ny: 122,
  stationName: '지정면'
};

export interface RealTimeWeather {
  temp: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  condition: string;
  fineDust: number;
  fineDustLabel: string;
  ultraFineDust: number;
  ultraFineDustLabel: string;
  ozone: number;
  ozoneLabel: string;
  uvIndex: number | null;
  uvLabel: string;
  greenSpeed: string | null;
  airForecastPM10?: string;
  airForecastPM25?: string;
  airForecastO3?: string;
  sunrise?: string;
  sunset?: string;
  tempDiff: number;
  baseTime?: string;
  baseDate?: string;
}

// KMA Grid Conversion (LCC Projection)
function dfs_xy_conv(v1: number, v2: number) {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 투영 위도1(degree)
  const SLAT2 = 60.0; // 투영 위도2(degree)
  const OLON = 126.0; // 기준점 경도(degree)
  const OLAT = 38.0; // 기준점 위도(degree)
  const XO = 43; // 기준점 X좌표(GRID)
  const YO = 136; // 기준점 Y좌표(GRID)

  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + (v1) * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = v2 * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    x: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    y: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
  };
}

function getWindDirection(degree: number): string {
  const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  const index = Math.round(degree / 45) % 8;
  return directions[index];
}

function getSkyCondition(sky: string, pty: string): string {
  const ptyCode = parseInt(pty);
  const skyCode = parseInt(sky);

  if (ptyCode === 1) return '비';
  if (ptyCode === 2) return '비/눈';
  if (ptyCode === 3) return '눈';
  if (ptyCode === 4) return '소나기';

  if (skyCode === 1) return '맑음';
  if (skyCode === 3) return '구름많음';
  if (skyCode === 4) return '흐림';
  
  return '맑음';
}

function getDustLabel(value: string): string {
  const val = parseInt(value);
  if (isNaN(val)) return '정보없음';
  if (val <= 30) return '좋음';
  if (val <= 80) return '보통';
  if (val <= 150) return '나쁨';
  return '매우나쁨';
}

function getUltraFineDustLabel(value: string): string {
  const val = parseInt(value);
  if (isNaN(val)) return '정보없음';
  if (val <= 15) return '좋음';
  if (val <= 35) return '보통';
  if (val <= 75) return '나쁨';
  return '매우나쁨';
}

function getOzoneLabel(value: string): string {
  const val = parseFloat(value);
  if (isNaN(val)) return '정보없음';
  if (val <= 0.03) return '좋음';
  if (val <= 0.09) return '보통';
  if (val <= 0.15) return '나쁨';
  return '매우나쁨';
}

function getUVLabel(value: number | null): string {
  if (value === null || isNaN(value)) return '정보없음';
  if (value >= 0 && value <= 2) return '낮음';
  if (value >= 3 && value <= 5) return '보통';
  if (value >= 6 && value <= 7) return '높음';
  if (value >= 8 && value <= 10) return '매우높음';
  if (value >= 11) return '위험';
  return '정보없음';
}

function getKSTDate() {
  const now = new Date();
  // Korea is UTC+9
  const kstOffset = 9 * 60 * 60 * 1000;
  return new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + kstOffset);
}

export async function fetchDailyForecast(): Promise<DailyForecast[]> {
  const kst = getKSTDate();
  const baseDate = kst.getFullYear() + 
                 String(kst.getMonth() + 1).padStart(2, '0') + 
                 String(kst.getDate()).padStart(2, '0');
  
  // Village forecast for days 0-2
  const hours = [2, 5, 8, 11, 14, 17, 20, 23];
  const currentHour = kst.getHours();
  let baseHour = 2;
  for (const h of hours) {
    if (currentHour > h || (currentHour === h && kst.getMinutes() > 15)) {
      baseHour = h;
    } else {
      break;
    }
  }
  
  let adjustedBaseDate = baseDate;
  if (currentHour < 2 || (currentHour === 2 && kst.getMinutes() <= 15)) {
     const yesterday = new Date(kst);
     yesterday.setDate(yesterday.getDate() - 1);
     adjustedBaseDate = yesterday.getFullYear() + 
                      String(yesterday.getMonth() + 1).padStart(2, '0') + 
                      String(yesterday.getDate()).padStart(2, '0');
     baseHour = 23;
  }

  const obsBaseTime = String(baseHour).padStart(2, '0') + '00';
  const villageUrl = `/api/weather/village-forecast?nx=${LOCATION.nx}&ny=${LOCATION.ny}&baseDate=${adjustedBaseDate}&baseTime=${obsBaseTime}`;

  try {
    const villRes = await fetch(villageUrl);

    if (!villRes.ok) {
      console.warn('Village weather API returned non-ok status:', villRes.status);
    }

    const villData = await villRes.json();
    const forecasts: DailyForecast[] = [];
    
    // Process Village Forecast (Days 0-2)
    if (villData?.response?.header?.resultCode === '00') {
      const items = villData?.response?.body?.items?.item || [];
      const dailyMap: Record<string, any> = {};

      items.forEach((item: any) => {
        const date = item.fcstDate;
        if (!dailyMap[date]) dailyMap[date] = { temp: [], sky: [], pty: [], pop: [] };
        
        if (item.category === 'TMP') dailyMap[date].temp.push(parseFloat(item.fcstValue));
        if (item.category === 'SKY') dailyMap[date].sky.push(item.fcstValue);
        if (item.category === 'PTY') dailyMap[date].pty.push(item.fcstValue);
        if (item.category === 'POP') dailyMap[date].pop.push(parseFloat(item.fcstValue));
        if (item.category === 'TMN') dailyMap[date].low = parseFloat(item.fcstValue);
        if (item.category === 'TMX') dailyMap[date].high = parseFloat(item.fcstValue);
      });

      Object.keys(dailyMap).sort().forEach(dateStr => {
        const dayData = dailyMap[dateStr];
        const low = dayData.low ?? Math.min(...dayData.temp);
        const high = dayData.high ?? Math.max(...dayData.temp);
        
        const dayItems = items.filter((i: any) => i.fcstDate === dateStr);
        const amItems = dayItems.filter((i: any) => parseInt(i.fcstTime) >= 0 && parseInt(i.fcstTime) <= 1200);
        const pmItems = dayItems.filter((i: any) => parseInt(i.fcstTime) > 1200 && parseInt(i.fcstTime) <= 2300);
        
        const amSky = amItems.find((i: any) => i.category === 'SKY')?.fcstValue || '1';
        const amPty = amItems.find((i: any) => i.category === 'PTY')?.fcstValue || '0';
        const amPop = amItems.find((i: any) => i.category === 'POP')?.fcstValue || '10';
        
        const pmSky = pmItems.find((i: any) => i.category === 'SKY')?.fcstValue || '1';
        const pmPty = pmItems.find((i: any) => i.category === 'PTY')?.fcstValue || '0';
        const pmPop = pmItems.find((i: any) => i.category === 'POP')?.fcstValue || '10';

        const getIcon = (sky: string, pty: string) => {
          const cond = getSkyCondition(sky, pty);
          if (cond === '흐림') return 'Cloud';
          if (cond === '구름많음') return 'CloudSun';
          if (cond === '비' || cond === '소나기') return 'CloudRain';
          if (cond === '눈' || cond === '비/눈') return 'CloudSnow';
          return 'Sun';
        };

        forecasts.push({
          day: '',
          date: parseInt(dateStr.substring(6, 8)),
          fullDate: dateStr,
          icon: getIcon(pmSky, pmPty),
          amIcon: getIcon(amSky, amPty),
          pmIcon: getIcon(pmSky, pmPty),
          amProb: Math.round(parseFloat(amPop)),
          pmProb: Math.round(parseFloat(pmPop)),
          high: Math.round(high),
          low: Math.round(low),
          condition: getSkyCondition(pmSky, pmPty)
        });
      });
    }

    return forecasts;
  } catch (error) {
    console.error('Fetch daily forecast error:', error);
    return [];
  }
}

export async function fetchRealTimeWeather(): Promise<RealTimeWeather> {
  const kst = getKSTDate();
  
  // Observation (UltraSrtNcst) logic from the provided table:
  // Base_time is generated every hour (0000, 0100...)
  // API is available 10 minutes after generation (00:10, 01:10...)
  const obsTime = new Date(kst);
  if (obsTime.getMinutes() < 10) {
    obsTime.setHours(obsTime.getHours() - 1);
  }
  
  const baseDate = obsTime.getFullYear() + 
                 String(obsTime.getMonth() + 1).padStart(2, '0') + 
                 String(obsTime.getDate()).padStart(2, '0');

  const yesterday = new Date(obsTime);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.getFullYear() + 
                      String(yesterday.getMonth() + 1).padStart(2, '0') + 
                      String(yesterday.getDate()).padStart(2, '0');
  
  const obsBaseTime = String(obsTime.getHours()).padStart(2, '0') + '00';

  // Forecast (UltraSrtFcst) logic:
  // Announcement every hour at minute 30.
  const fcstTime = new Date(kst);
  if (fcstTime.getMinutes() < 45) {
    fcstTime.setHours(fcstTime.getHours() - 1);
  }
  const fcstBaseTime = String(fcstTime.getHours()).padStart(2, '0') + '30';

  const weatherUrl = `/api/weather/current?nx=${LOCATION.nx}&ny=${LOCATION.ny}&baseDate=${baseDate}&baseTime=${obsBaseTime}`;
  const yesterdayWeatherUrl = `/api/weather/current?nx=${LOCATION.nx}&ny=${LOCATION.ny}&baseDate=${yesterdayDate}&baseTime=${obsBaseTime}`;
  const forecastUrl = `/api/weather/forecast?nx=${LOCATION.nx}&ny=${LOCATION.ny}&baseDate=${baseDate}&baseTime=${fcstBaseTime}`;
  const airUrl = `/api/weather/air?stationName=${encodeURIComponent(LOCATION.stationName)}`;
  
  const searchDate = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
  const airFrcstPm10Url = `/api/weather/air-forecast?searchDate=${searchDate}&informCode=PM10`;
  const airFrcstPm25Url = `/api/weather/air-forecast?searchDate=${searchDate}&informCode=PM25`;
  const airFrcstO3Url = `/api/weather/air-forecast?searchDate=${searchDate}&informCode=O3`;
  // UV index logic uses specific announcement times: 00, 06, 12, 18
  const uvKst = new Date(kst);
  const uvHours = [0, 6, 12, 18];
  let uvBaseHour = 0;
  for (const h of uvHours) {
    if (uvKst.getHours() >= h) {
      uvBaseHour = h;
    }
  }
  const uvBaseDate = uvKst.getFullYear() + 
                   String(uvKst.getMonth() + 1).padStart(2, '0') + 
                   String(uvKst.getDate()).padStart(2, '0');
  const uvUrl = `/api/weather/uv?areaNo=5113033000&time=${uvBaseDate}${String(uvBaseHour).padStart(2, '0')}`;
  
  // Versions
  const nowStr = baseDate + String(kst.getHours()).padStart(2, '0') + String(kst.getMinutes()).padStart(2, '0');
  const versionUrl = `/api/weather/version?ftype=ODAM&basedatetime=${nowStr}`;
  const sunUrl = `/api/weather/sun?location=${encodeURIComponent("원주")}&locdate=${baseDate}`;
  const greenSpeedUrl = `/api/golf/green-speed`;

  try {
    const responses = await Promise.all([
      fetch(weatherUrl),
      fetch(yesterdayWeatherUrl),
      fetch(forecastUrl),
      fetch(airUrl),
      fetch(airFrcstPm10Url),
      fetch(airFrcstPm25Url),
      fetch(airFrcstO3Url),
      fetch(uvUrl),
      fetch(versionUrl),
      fetch(sunUrl),
      fetch(greenSpeedUrl)
    ]);

    const [weatherRes, yesterdayRes, forecastRes, airRes, airFrcstPm10Res, airFrcstPm25Res, airFrcstO3Res, uvRes, versionRes, sunRes, greenRes] = responses;

    const failed = responses.filter(r => !r.ok);
    if (failed.length > 0) {
      console.warn('Some RealTimeWeather APIs returned non-ok status codes:', 
        failed.map(r => `${r.url.split('?')[0]}: ${r.status}`).join(', '));
    }

    const weatherText = await weatherRes.text();
    const yesterdayText = await yesterdayRes.text();
    const forecastText = await forecastRes.text();
    const airText = await airRes.text();
    const airFrcstPm10Text = await airFrcstPm10Res.text();
    const airFrcstPm25Text = await airFrcstPm25Res.text();
    const airFrcstO3Text = await airFrcstO3Res.text();
    const uvText = await uvRes.text();
    const versionText = await versionRes.text();
    const sunText = await sunRes.text();
    const greenText = await greenRes.text();

    let weatherData, yesterdayData, forecastData, airData, pm10FrcstData, pm25FrcstData, o3FrcstData, uvData, versionData, sunData, greenData;
    try {
      weatherData = JSON.parse(weatherText);
      yesterdayData = JSON.parse(yesterdayText);
      forecastData = JSON.parse(forecastText);
      airData = JSON.parse(airText);
      pm10FrcstData = JSON.parse(airFrcstPm10Text);
      pm25FrcstData = JSON.parse(airFrcstPm25Text);
      o3FrcstData = JSON.parse(airFrcstO3Text);
      uvData = JSON.parse(uvText);
      try { versionData = JSON.parse(versionText); } catch(e) { versionData = null; }
      try { sunData = JSON.parse(sunText); } catch(e) { sunData = null; }
      try { greenData = JSON.parse(greenText); } catch(e) { greenData = null; }
    } catch (e) {
      console.warn('Weather API response was not valid JSON. Likely key issue or service down.');
      throw new Error('API_SYNC_DELAY');
    }

    // Log the error but don't crash, instead use a specific error that can be handled for fallback
    if (weatherData.proxyError || forecastData.proxyError || airData.proxyError) {
      console.warn('API Proxy returned error:', weatherData.error || forecastData.error || airData.error);
      throw new Error('API_SYNC_DELAY');
    }

    // Robust check for resultCode and items
    const weatherResultCode = weatherData?.response?.header?.resultCode;
    const forecastResultCode = forecastData?.response?.header?.resultCode;

    if (weatherResultCode !== '00' || forecastResultCode !== '00') {
      console.warn('KMA API Error Code:', weatherResultCode, forecastResultCode);
      // If NO_DATA (03), maybe it's too early.
      throw new Error('API_SYNC_DELAY');
    }

    const weatherItems = weatherData?.response?.body?.items?.item;
    const yesterdayItems = yesterdayData?.response?.body?.items?.item;
    const forecastItems = forecastData?.response?.body?.items?.item;
    const airItems = airData?.response?.body?.items;

    if (!weatherItems || !forecastItems) {
      console.warn('KMA API returned empty items list');
      throw new Error('API_SYNC_DELAY');
    }

    const airItem = Array.isArray(airItems) && airItems.length > 0 ? airItems[0] : {};

    // Process Air Forecasts
    const pm10FrcstItems = pm10FrcstData?.response?.body?.items || [];
    const pm25FrcstItems = pm25FrcstData?.response?.body?.items || [];
    const o3FrcstItems = o3FrcstData?.response?.body?.items || [];
    
    // Get the latest forecast for today
    const currentPm10Frcst = pm10FrcstItems.length > 0 ? pm10FrcstItems[0] : null;
    const currentPm25Frcst = pm25FrcstItems.length > 0 ? pm25FrcstItems[0] : null;
    const currentO3Frcst = o3FrcstItems.length > 0 ? o3FrcstItems[0] : null;

    // UV Index processing
    const rawUvItems = uvData?.response?.body?.items;
    const uvItems = Array.isArray(rawUvItems) ? rawUvItems : (rawUvItems?.item || []);
    let uvValue: number | null = null;
    
    // Find Wonju (5113033000) or use the first item if only one
    let targetItem = null;
    if (uvItems.length === 1) {
      targetItem = uvItems[0];
    } else {
      targetItem = uvItems.find((item: any) => 
        item.areaNo === "5113033000" || 
        item.code === "5113033000" ||
        item.region === "원주" ||
        item.point === "5113033000"
      );
    }

    if (targetItem) {
      const val = targetItem.h0 || targetItem.uvIdx || targetItem.uv;
      if (val !== undefined && val !== null && val !== '') {
        uvValue = parseInt(val.toString());
      }
    }

    // Extraction helpers
    const getVal = (items: any[], category: string) => {
      const item = items?.find((i: any) => i.category === category);
      return item?.obsrValue || item?.fcstValue;
    };

    const tempVal = getVal(weatherItems, 'T1H');
    if (tempVal === undefined) throw new Error('API_SYNC_DELAY');

    const temp = parseFloat(tempVal);

    // Calculate tempDiff from yesterday
    let tempDiff = 0;
    if (yesterdayItems) {
      const yesterdayTemp = parseFloat(getVal(yesterdayItems, 'T1H') || tempVal);
      tempDiff = Number((temp - yesterdayTemp).toFixed(1));
    }

    const humidity = parseFloat(getVal(weatherItems, 'REH') || '50');
    const windSpeed = parseFloat(getVal(weatherItems, 'WSD') || '0');
    const windDir = parseFloat(getVal(weatherItems, 'VEC') || '0');
    const precip = parseFloat(getVal(weatherItems, 'RN1') || '0');

    // Condition from forecast (SKY, PTY)
    const sky = getVal(forecastItems, 'SKY') || '1';
    const pty = getVal(forecastItems, 'PTY') || '0';

    return {
      temp,
      humidity,
      windSpeed,
      windDirection: getWindDirection(windDir),
      precipitation: precip,
      condition: getSkyCondition(sky, pty),
      fineDust: parseInt(airItem.pm10Value || '0'),
      fineDustLabel: getDustLabel(airItem.pm10Value || ''),
      ultraFineDust: parseInt(airItem.pm25Value || '0'),
      ultraFineDustLabel: getUltraFineDustLabel(airItem.pm25Value || ''),
      ozone: parseFloat(airItem.o3Value || '0'),
      ozoneLabel: getOzoneLabel(airItem.o3Value || ''),
      uvIndex: uvValue,
      uvLabel: getUVLabel(uvValue),
      airForecastPM10: currentPm10Frcst?.informOverall || '',
      airForecastPM25: currentPm25Frcst?.informOverall || '',
      airForecastO3: currentO3Frcst?.informOverall || '',
      sunrise: sunData?.sunrise || null,
      sunset: sunData?.sunset || null,
      greenSpeed: (() => {
        if (!greenData?.resultData || !Array.isArray(greenData.resultData)) return null;
        
        // Find item where CODE is 'M' first, otherwise take the first item
        const item = greenData.resultData.find((item: any) => item.CODE === 'M') || greenData.resultData[0];
        
        return item?.SPPED || item?.SPEED || null;
      })(),
      baseTime: obsBaseTime,
      baseDate: baseDate,
      tempDiff
    };
  } catch (error: any) {
    if (error.message === 'API_SYNC_DELAY') {
      throw error;
    }
    console.error('KMA API Error:', error);
    throw error;
  }
}
