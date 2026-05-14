/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Cloud, 
  CloudSun, 
  Sun, 
  CloudRain, 
  CloudSnow,
  Wind, 
  Droplets,
  Moon,
  FlagTriangleRight,
  Thermometer,
  HelpCircle,
  Star,
  Beaker,
  LocateFixed,
  ExternalLink,
  ChevronRight,
  Info,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence, useAnimation, useMotionValue } from 'motion/react';
import { WeatherTab, DailyForecast, HourlyForecast, WeatherData, GolfData } from './types';
import { MOCK_WEATHER_DATA_MAP, MOCK_GOLF_DATA_MAP, DATES, getWeatherData, getGolfData, WEATHER_SOURCE } from './constants';
import { fetchRealTimeWeather, fetchDailyForecast } from './services/weatherService';

const LOCATION = { lat: 37.44, lng: 127.82 };

function getKSTDate() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  return new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + kstOffset);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WeatherTab>('current');
  const [selectedDate, setSelectedDate] = useState<number>(DATES[0].date);
  const [realTimeWeather, setRealTimeWeather] = useState<WeatherData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isAuthError, setIsAuthError] = useState(false);
  const [isSyncDelay, setIsSyncDelay] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => {
    const d = getKSTDate();
    // According to the table, API is available 10 minutes after generation every hour (00:10, 01:10...)
    if (d.getMinutes() < 10) {
      d.setHours(d.getHours() - 1);
    }
    d.setMinutes(0);
    d.setSeconds(0);
    return d;
  });

  const updateLastUpdatedTime = () => {
    const kst = getKSTDate();
    // According to the table, API is available 10 minutes after generation every hour (00:10, 01:10...)
    if (kst.getMinutes() < 10) {
      kst.setHours(kst.getHours() - 1);
    }
    kst.setMinutes(0);
    kst.setSeconds(0);
    setLastUpdated(kst);
  };

  const isFetching = useRef(false);

  const loadRealTimeWeather = async (force = false) => {
    if (isFetching.current) return;
    // If not forced and we already have data that is not too old (less than 1 minute old for safety)
    // we skip the fetch. The 10-minute interval handles periodic refreshes.
    if (!force && realTimeWeather) {
      console.log('Skipping weather fetch - data already available and not forced.');
      return;
    }

    try {
      isFetching.current = true;
      console.log('Fetching live weather data...');
      setFetchFailed(false);
      setIsQuotaExceeded(false);
      setIsAuthError(false);
      setIsSyncDelay(false);

      const [liveData, forecastArray] = await Promise.all([
        fetchRealTimeWeather(),
        fetchDailyForecast()
      ]);
      
      console.log('Live weather received');
      
      const mockData = getWeatherData(DATES[0].date);
      
      // Map forecastArray to match DATES structure if needed
      const mappedForecast = forecastArray.map(f => ({
        ...f,
        day: DATES.find(d => d.date === f.date)?.label || ''
      })).filter(f => f.day !== '');

      setRealTimeWeather({
        ...mockData,
        ...liveData,
        forecast: mappedForecast.length > 0 ? mappedForecast : mockData.forecast
      });
      
      if (liveData.baseTime && liveData.baseDate) {
        const h = parseInt(liveData.baseTime.substring(0, 2));
        const m = parseInt(liveData.baseTime.substring(2, 4));
        const y = parseInt(liveData.baseDate.substring(0, 4));
        const mon = parseInt(liveData.baseDate.substring(4, 6)) - 1;
        const day = parseInt(liveData.baseDate.substring(6, 8));
        setLastUpdated(new Date(y, mon, day, h, m));
      }
    } catch (error: any) {
      setFetchFailed(true);
      if (error.message === 'API_SYNC_DELAY') {
        console.warn('API is still in activation phase. Showing -- for live fields.');
        setIsSyncDelay(true);
      } else if (error.message === 'QUOTA_EXCEEDED') {
        console.error('API Quota Exceeded.');
        setIsQuotaExceeded(true);
        setFetchFailed(true);
      } else if (error.message === 'AUTH_ERROR') {
        console.error('API Key/Auth Error.');
        setIsAuthError(true);
        setFetchFailed(true);
      } else {
        console.error('Weather update failed:', error);
        setFetchFailed(true);
      }
    } finally {
      isFetching.current = false;
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadRealTimeWeather(true); // Initial fetch forced
    // Refresh every 10 minutes
    const interval = setInterval(() => loadRealTimeWeather(true), 600000);
    return () => clearInterval(interval);
  }, []);

  const getNullData = (date: number): WeatherData => {
    const mock = getWeatherData(date);
    let condition = '연동 확인 중';
    if (isQuotaExceeded) {
      condition = '일일 할당량 초과';
    } else if (isAuthError) {
      condition = '인증 오류';
    } else if (isSyncDelay) {
       condition = '데이터 연동 중';
    } else if (fetchFailed) {
      condition = '연동 실패';
    }

    return {
      ...mock,
      temp: null,
      condition,
      humidity: null,
      windSpeed: null,
      windDirection: null,
      precipitation: null,
      uvIndex: null,
      tempDiff: null,
      ozone: null,
      ozoneLabel: '정보없음',
      fineDust: null,
      fineDustLabel: '정보없음',
      ultraFineDust: null,
      ultraFineDustLabel: '정보없음',
      airForecastPM10: '',
      airForecastPM25: '',
      airForecastO3: '',
      sunrise: '',
      sunset: '',
      baseTime: '',
      baseDate: ''
    };
  };

  const activeWeatherData = (fetchFailed || isInitialLoading)
    ? getNullData(selectedDate)
    : (selectedDate === DATES[0].date 
        ? (realTimeWeather || getNullData(DATES[0].date)) 
        : getWeatherData(selectedDate));
    
  const golfWeather = getGolfData(selectedDate, activeWeatherData);

  const handleDateSelect = (date: number) => {
    setSelectedDate(date);
    if (date === DATES[0].date) {
      updateLastUpdatedTime();
      loadRealTimeWeather(false); // Only fetch if data is missing
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col relative overflow-x-hidden">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/70 backdrop-blur-md border-b border-outline-variant/30 px-4 sm:px-6 py-4 flex justify-between items-center h-[72px]">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          <div className="p-1.5 bg-primary-brand rounded-lg shrink-0">
            <Cloud className="w-5 h-5 text-on-primary-brand" />
          </div>
          <h1 className="text-[20px] sm:text-headline-md-brand text-primary-brand truncate">
            {activeTab === 'current' && '현재날씨'}
            {activeTab === 'golf' && '골프정보'}
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto pb-24 pt-[72px]">
        {/* 상단일자선택복구 요청 시 아래 DateSelector 주석을 해제하세요 */}
        {/* 
        <div className="mt-4">
          <DateSelector selectedDate={selectedDate} onSelect={handleDateSelect} />
        </div> 
        */}
        <AnimatePresence mode="wait">
          {activeTab === 'current' && (
            <CurrentWeather 
              key={`current-${selectedDate}`} 
              data={activeWeatherData} 
              lastUpdated={lastUpdated}
            />
          )}
          {activeTab === 'golf' && (
            <GolfWeather 
              key={`golf-${selectedDate}`} 
              data={golfWeather} 
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container/80 backdrop-blur-xl border-t border-outline-variant/30 px-6 py-4 flex justify-around sm:justify-center sm:gap-24 items-center shadow-lg safe-bottom">
        <NavButton 
          active={activeTab === 'current'} 
          onClick={() => setActiveTab('current')} 
          icon={<Sun className="w-6 h-6" />} 
          label="현재날씨" 
        />
        <NavButton 
          active={activeTab === 'golf'} 
          onClick={() => setActiveTab('golf')} 
          icon={<FlagTriangleRight className="w-6 h-6" />} 
          label="골프정보" 
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-primary-brand scale-110' : 'text-on-surface-variant opacity-60'}`}
    >
      <div className={`transition-transform ${active ? 'drop-shadow-[0_0_8px_rgba(23,25,27,0.3)]' : ''}`}>
        {icon}
      </div>
      <span className="text-label-caps uppercase">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-indicator" 
          className="w-1 h-1 rounded-full bg-primary-brand mt-0.5" 
        />
      )}
    </button>
  );
}

function DateSelector({ 
  selectedDate, 
  onSelect 
}: { 
  selectedDate: number; 
  onSelect: (date: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });
  const x = useMotionValue(0);
  const controls = useAnimation();

  const updateConstraints = () => {
    if (containerRef.current && contentRef.current) {
      const parentWidth = containerRef.current.offsetWidth;
      const contentWidth = contentRef.current.scrollWidth;
      const maxDrag = Math.max(0, contentWidth - parentWidth);
      setConstraints({
        left: -maxDrag,
        right: 0
      });
    }
  };

  useEffect(() => {
    updateConstraints();
    const observer = new ResizeObserver(updateConstraints);
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    window.addEventListener('resize', updateConstraints);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateConstraints);
    };
  }, []);

  useEffect(() => {
    if (selectedDate === DATES[0].date) {
      // Reset to 0 when Today is selected
      controls.start({ x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } });
    } else {
      const selectedElement = itemRefs.current[selectedDate];
      if (selectedElement && containerRef.current && contentRef.current) {
        const offsetLeft = selectedElement.offsetLeft;
        const parentWidth = containerRef.current.offsetWidth;
        const contentWidth = contentRef.current.scrollWidth;
        const maxScroll = Math.max(0, contentWidth - parentWidth);
        
        // Align exactly to left
        const targetX = -Math.min(offsetLeft, maxScroll);
        
        controls.start({ x: targetX, transition: { type: 'spring', damping: 25, stiffness: 200 } });
      }
    }
  }, [selectedDate, controls]);

  const today = DATES[0];
  const otherDates = DATES.slice(1);

  const renderDateButton = (d: typeof DATES[0], isFixed: boolean = false) => {
    const isSelected = selectedDate === d.date;
    const colorClass = d.isSunday ? 'text-red-500' : d.isSaturday ? 'text-blue-400' : 'text-gray-900';
    
    return (
      <button
        key={d.date}
        ref={el => itemRefs.current[d.date] = el}
        onClick={() => onSelect(d.date)}
        className={`flex flex-col items-center justify-center min-w-[68px] h-[80px] rounded-3xl transition-all duration-300 border ${
          isSelected 
            ? 'bg-gray-900 border-gray-900 shadow-lg -translate-y-0.5' 
            : 'bg-white/40 border-outline-variant/10 hover:bg-white hover:border-outline-variant/30'
        }`}
      >
        <span className={`text-[11px] font-bold mb-1 uppercase tracking-tighter ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
          {d.label}
        </span>
        <span className={`text-[20px] font-black leading-tight ${isSelected ? 'text-white' : colorClass}`}>
          {d.date}
        </span>
        {d.holidayName && (
          <span className={`text-[9px] font-bold mt-0.5 leading-none whitespace-nowrap ${isSelected ? 'text-red-400/80' : 'text-red-400'}`}>
            {d.holidayName}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex gap-3 px-container-padding py-2 select-none">
      {/* Today Fixed */}
      <div className="shrink-0">
        {renderDateButton(today, true)}
      </div>

      <div className="w-[1px] h-12 bg-gray-200 self-center opacity-30" />

      {/* Other Dates Draggable */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden"
      >
        <motion.div 
          ref={contentRef}
          drag="x"
          style={{ x }}
          dragConstraints={constraints}
          dragElastic={0.1}
          dragMomentum={true}
          animate={controls}
          className="flex gap-3 w-max cursor-grab active:cursor-grabbing"
        >
          {otherDates.map((d) => renderDateButton(d))}
        </motion.div>
      </div>
    </div>
  );
}

function DailyForecastBoard({ forecast }: { forecast: DailyForecast[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });

  const updateConstraints = () => {
    if (containerRef.current && contentRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const contentWidth = contentRef.current.scrollWidth;
      const maxDrag = Math.max(0, contentWidth - containerWidth);
      setConstraints({
        left: -maxDrag,
        right: 0
      });
    }
  };

  useEffect(() => {
    updateConstraints();
    
    // Use ResizeObserver for more robust updates
    const observer = new ResizeObserver(() => {
      updateConstraints();
    });

    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    window.addEventListener('resize', updateConstraints);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateConstraints);
    };
  }, [forecast]);

  const getWeekDay = (fullDate?: string) => {
    if (!fullDate) return '';
    const y = parseInt(fullDate.substring(0, 4));
    const m = parseInt(fullDate.substring(4, 6)) - 1;
    const d = parseInt(fullDate.substring(6, 8));
    const date = new Date(y, m, d);
    return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  };

  const getLabel = (fullDate?: string, index?: number) => {
    if (index === 0) return '오늘';
    if (index === 1) return '내일';
    if (index === 2) return '모레';
    return '';
  };

  const ForecastIcon = ({ icon, className = "w-6 h-6" }: { icon?: string, className?: string }) => {
    if (!icon) return <span className={className}>-</span>;
    return <WeatherIcon name={icon} className={className} />;
  };

  return (
    <div className="relative overflow-hidden w-full select-none px-container-padding">
      <div className="flex bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Fixed Side Headers */}
        <div className="flex flex-col w-[60px] sm:w-[70px] shrink-0 border-r border-gray-100 bg-white z-10">
          <div className="h-14 flex items-center justify-center text-[11px] sm:text-xs font-bold text-gray-400 bg-gray-50/50">날짜</div>
          <div className="h-10 flex items-center justify-center text-[11px] sm:text-xs font-bold text-gray-400 border-t border-gray-100">시각</div>
          <div className="h-14 flex items-center justify-center text-[11px] sm:text-xs font-bold text-gray-400 border-t border-gray-100">날씨</div>
          <div className="h-12 flex items-center justify-center text-[11px] sm:text-xs font-bold text-gray-400 border-t border-gray-100">기온</div>
          <div className="h-10 flex items-center justify-center text-[11px] sm:text-xs font-bold text-gray-400 border-t border-gray-100">강수</div>
        </div>

        {/* Draggable Content */}
        <div className="flex-1 overflow-hidden" ref={containerRef}>
          <motion.div 
            ref={contentRef}
            drag="x" 
            dragConstraints={constraints}
            dragElastic={0.1}
            className="flex w-max cursor-grab active:cursor-grabbing"
          >
            {forecast.slice(1).map((f, i) => {
              const weekDay = getWeekDay(f.fullDate);
              const label = getLabel(f.fullDate, i + 1);
              
              return (
                <div key={f.fullDate || i} className="flex flex-col w-[85px] sm:w-[100px] border-r border-gray-50 last:border-r-0">
                  {/* Date Header */}
                  <div className="h-14 flex flex-col items-center justify-center border-b border-gray-100 bg-gray-50/30">
                    <span className={`text-[12px] sm:text-[14px] font-bold ${weekDay === '일' ? 'text-red-500' : weekDay === '토' ? 'text-blue-500' : 'text-gray-900'}`}>
                      {f.date}일({weekDay})
                    </span>
                    {label && <span className="text-[10px] sm:text-[11px] font-bold text-blue-500 tracking-tight">{label}</span>}
                  </div>

                  {/* Time Labels */}
                  <div className="h-10 flex items-center justify-around px-1 border-b border-gray-50">
                    {!f.isSingle ? (
                      <>
                        <span className="text-[10px] font-bold text-gray-300">오전</span>
                        <span className="text-[10px] font-bold text-gray-300">오후</span>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300">종일</span>
                    )}
                  </div>

                  {/* Weather Icons */}
                  <div className="h-14 flex items-center justify-around px-1 border-b border-gray-50">
                    {!f.isSingle ? (
                      <>
                        <ForecastIcon icon={f.amIcon} />
                        <ForecastIcon icon={f.pmIcon} />
                      </>
                    ) : (
                      <ForecastIcon icon={f.icon} />
                    )}
                  </div>

                  {/* Temps */}
                  <div className="h-12 flex items-center justify-around px-1 border-b border-gray-50 text-[12px] sm:text-[13px] font-bold">
                    {!f.isSingle ? (
                      <>
                        <div className="flex flex-col items-center">
                          <span className="text-blue-500">{f.low}°</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-red-500">{f.high}°</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-500">{f.low}°</span>
                        <span className="text-red-500">{f.high}°</span>
                      </div>
                    )}
                  </div>

                  {/* Rain Prob */}
                  <div className="h-10 flex items-center justify-around px-1 text-[10px] sm:text-[11px] font-bold text-gray-400">
                    {!f.isSingle ? (
                      <>
                        <span>{f.amProb}%</span>
                        <span>{f.pmProb}%</span>
                      </>
                    ) : (
                      <span>{f.pmProb}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}


function CurrentWeather({ 
  data, 
  lastUpdated 
}: { 
  key?: string;
  data: WeatherData; 
  lastUpdated: Date;
}) {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  const AIR_QUALITY_INFO = {
    '초미세먼지(PM2.5)': {
      title: '초미세먼지(µm)',
      description: '입자의 크기가 2.5µm 이하인 먼지',
      levels: [
        { label: '좋음', range: '(0~15)', color: 'bg-[#0085FF]' },
        { label: '보통', range: '(16~35)', color: 'bg-[#34C759]' },
        { label: '나쁨', range: '(36~75)', color: 'bg-[#FF9500]' },
        { label: '매우나쁨', range: '(76~)', color: 'bg-[#FF3B30]' },
      ]
    },
    '미세먼지(PM10)': {
      title: '미세먼지(µm)',
      description: '입자의 크기가 10µm 이하인 먼지',
      levels: [
        { label: '좋음', range: '(0~30)', color: 'bg-[#0085FF]' },
        { label: '보통', range: '(31~80)', color: 'bg-[#34C759]' },
        { label: '나쁨', range: '(81~150)', color: 'bg-[#FF9500]' },
        { label: '매우나쁨', range: '(151~)', color: 'bg-[#FF3B30]' },
      ]
    },
    '오존(O3)': {
      title: '오존(ppm)',
      description: '태양광선과 화학반응하여 생성된 가스',
      levels: [
        { label: '좋음', range: '(0~0.03)', color: 'bg-[#0085FF]' },
        { label: '보통', range: '(0.031~0.09)', color: 'bg-[#34C759]' },
        { label: '나쁨', range: '(0.091~0.15)', color: 'bg-[#FF9500]' },
        { label: '매우나쁨', range: '(0.151~)', color: 'bg-[#FF3B30]' },
      ]
    },
    '자외선지수': {
      title: '자외선지수',
      description: '태양으로부터 방출되는 자외선의 강도',
      levels: [
        { label: '낮음', range: '(0~2)', color: 'bg-[#0085FF]' },
        { label: '보통', range: '(3~5)', color: 'bg-[#34C759]' },
        { label: '높음', range: '(6~7)', color: 'bg-[#FF9500]' },
        { label: '매우높음', range: '(8~10)', color: 'bg-[#FF3B30]' },
        { label: '위험', range: '(11~)', color: 'bg-[#7E11D4]' },
      ]
    }
  };

  const format = (val: any, decimals?: number) => {
    if (val === null || val === undefined) return '--';
    if (typeof val === 'number' && decimals !== undefined) return val.toFixed(decimals);
    return val;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="px-container-padding pb-6 space-y-6">
        {/* KMA Style Weather Card */}
        <div className="bg-white rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 shadow-sm border border-gray-100 flex flex-col items-center select-none relative">
          {/* Header Section from Screenshot */}
          <div className="w-full flex justify-between items-start mb-6 gap-2">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 text-gray-900 group">
                <div className="p-1 rounded-full border border-gray-300 shrink-0">
                  <LocateFixed className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600" />
                </div>
                <span className="text-[11px] font-medium text-gray-400 truncate">원주시 지정면</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                <span>{lastUpdated.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })} ({['일', '월', '화', '수', '목', '금', '토'][lastUpdated.getDay()]}) {lastUpdated.getHours()}:{String(lastUpdated.getMinutes()).padStart(2, '0')} 기준</span>
              </div>
            </div>
          </div>

          {/* Main Temperature Section */}
          <div className="flex flex-col items-center mb-10">
            {data.temp !== null ? (
              <div className="flex items-center justify-center gap-3 sm:gap-6 relative">
                <div className="flex items-center">
                  <div className="text-[60px] sm:text-[84px] font-normal tracking-tight leading-none text-gray-900">
                    {format(data.temp, 1)}
                  </div>
                  <span className="text-[36px] sm:text-[48px] font-medium align-top -mt-4 sm:-mt-6 ml-0.5 text-gray-900">°</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <WeatherIcon 
                    name={(() => {
                      const cond = data.condition;
                      if (cond === '맑음') return 'Sun';
                      if (cond === '구름많음') return 'CloudSun';
                      if (cond === '흐림') return 'Cloud';
                      if (cond === '비' || cond === '소나기' || cond === '비/눈') return 'CloudRain';
                      if (cond === '눈') return 'CloudSnow';
                      return 'Sun';
                    })()} 
                    className="w-[54px] h-[54px] sm:w-[76px] sm:h-[76px]" 
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {(() => {
                  const isQuota = data.condition === '일일 할당량 초과';
                  const isAuth = data.condition === '인증 오류';
                  const isSync = data.condition === '데이터 연동 중';
                  const isFailed = data.condition === '연동 실패';
                  
                  const showX = isQuota || isAuth || isFailed;
                  const icon = showX ? <X className="w-12 h-12 text-red-400" /> : <div className="text-[52px] sm:text-[64px] font-bold tracking-tight leading-none text-gray-200 animate-pulse">--°</div>;
      
                  return (
                    <div className="flex flex-col items-center">
                      {icon}
                      {isQuota && <span className="text-xs text-red-500 mt-2 font-bold bg-red-50 px-2 py-1 rounded-full border border-red-100">API 일일 할당량 초과</span>}
                      {isAuth && <span className="text-xs text-red-600 mt-2 font-bold p-2 bg-red-50 rounded-lg">API 키 확인 필요 (인증 오류)</span>}
                      {isSync && <span className="text-xs text-blue-400 mt-2 font-medium animate-pulse tracking-tight">수집 중 (기상청 동기화 지연)</span>}
                      {isFailed && !isQuota && !isAuth && <span className="text-xs text-red-400 mt-2 font-bold">API 연동 실패 (통신 확인)</span>}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Info Grid (Humidity, Wind, Rain) */}
          <div className="grid grid-cols-3 w-full border-t border-gray-100 pt-8 pb-6 mb-2">
            <div className="flex flex-col items-center px-0.5">
              <div className="flex items-center gap-1 sm:gap-1.5 text-gray-600 mb-2">
                <Droplets className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-[12px] sm:text-lg font-medium">습도</span>
              </div>
              <div className="text-[14px] sm:text-xl font-bold">{format(data.humidity)}%</div>
            </div>
            <div className="flex flex-col items-center border-x border-gray-100 px-0.5">
              <div className="flex items-center gap-1 sm:gap-1.5 text-gray-600 mb-2">
                <Wind className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-[12px] sm:text-lg font-medium">바람</span>
              </div>
              <div className="text-[14px] sm:text-xl font-bold text-center leading-tight">
                <span className="block sm:inline">{format(data.windSpeed)}m/s</span>
              </div>
            </div>
            <div className="flex flex-col items-center px-0.5">
              <div className="flex items-center gap-1 sm:gap-1.5 text-gray-600 mb-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-50/80 flex items-center justify-center rounded-sm">
                  <Beaker className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 text-blue-500" />
                </div>
                <span className="text-[12px] sm:text-lg font-medium">강수량</span>
              </div>
              <div className="text-[14px] sm:text-xl font-bold">{`${data.precipitation || 0}mm`}</div>
            </div>
          </div>

          {/* Sunrise/Sunset Section */}
          <div className="flex justify-center gap-8 w-full border-b border-gray-100 pb-6 mb-8 mt-2">
            <div className="flex items-center gap-2">
              <div className="p-1 px-2 rounded-full bg-amber-50 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-bold text-amber-700">일출</span>
              </div>
              <span className="text-[14px] sm:text-[17px] font-bold text-gray-900">{data.sunrise || '--:--'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 px-2 rounded-full bg-indigo-50 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-bold text-indigo-700">일몰</span>
              </div>
              <span className="text-[14px] sm:text-[17px] font-bold text-gray-900">{data.sunset || '--:--'}</span>
            </div>
          </div>

          {/* Air Quality Gauges */}
          <div className="relative w-full">
            <AnimatePresence>
              {activeInfo && AIR_QUALITY_INFO[activeInfo as keyof typeof AIR_QUALITY_INFO] && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute inset-x-0 -top-6 z-20 bg-white rounded-3xl p-4 sm:p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100"
                >
                  <button 
                    onClick={() => setActiveInfo(null)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  
                  <div className="mb-6 pr-8">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{AIR_QUALITY_INFO[activeInfo as keyof typeof AIR_QUALITY_INFO].title}</h4>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">{AIR_QUALITY_INFO[activeInfo as keyof typeof AIR_QUALITY_INFO].description}</p>
                  </div>

                  <div className="flex justify-between items-end gap-1 sm:gap-2">
                    {AIR_QUALITY_INFO[activeInfo as keyof typeof AIR_QUALITY_INFO].levels.map((level, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-0.5 group">
                        <span className="text-[11px] sm:text-[13px] font-medium text-gray-700">{level.label}</span>
                        <span className="text-[9px] sm:text-[11px] text-gray-500 mb-1.5 font-medium">{level.range}</span>
                        <div className={`w-full h-1.5 sm:h-2 ${level.color} rounded-sm opacity-90`} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 sm:grid-cols-4 w-full gap-6 sm:gap-4">
              <AirQualityGauge 
                label="초미세먼지(PM2.5)" 
                value={data.ultraFineDust} 
                unit="μg/m³" 
                status={data.ultraFineDustLabel} 
                progress={data.ultraFineDust !== null ? data.ultraFineDust / 50 * 100 : 0}
                onInfoClick={() => setActiveInfo('초미세먼지(PM2.5)')}
              />
              <AirQualityGauge 
                label="미세먼지(PM10)" 
                value={data.fineDust} 
                unit="μg/m³" 
                status={data.fineDustLabel} 
                progress={data.fineDust !== null ? data.fineDust / 100 * 100 : 0}
                onInfoClick={() => setActiveInfo('미세먼지(PM10)')}
              />
              <AirQualityGauge 
                label="오존(O3)" 
                value={data.ozone} 
                unit="ppm" 
                status={data.ozoneLabel} 
                progress={data.ozone !== null ? (data.ozone / 0.15) * 100 : 0}
                onInfoClick={() => setActiveInfo('오존(O3)')}
              />
              <AirQualityGauge 
                label="자외선지수" 
                value={data.uvIndex} 
                unit="단계" 
                status={data.uvLabel} 
                progress={data.uvIndex !== null ? (data.uvIndex / 11) * 100 : 0}
                onInfoClick={() => setActiveInfo('자외선지수')}
              />
            </div>
          </div>
        </div>

        {/* Info Attribution Footer */}
        <div className="w-full text-right pb-10">
          <p className="text-[11px] text-gray-400 font-medium tracking-tight">
            정보출처: 날씨(기상청 단기예보 및 생활기상정보), 대기질(한국환경공단)
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function AirQualityGauge({ label, value, unit, status, progress, onInfoClick }: { label: string; value: number | null; unit: string; status: string; progress: number, onInfoClick: () => void }) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case '좋음':
      case '낮음': return { stroke: 'text-blue-400', bg: 'text-blue-50', text: 'text-blue-500' };
      case '보통': return { stroke: 'text-green-500', bg: 'text-green-50', text: 'text-green-600' };
      case '나쁨':
      case '높음': return { stroke: 'text-orange-400', bg: 'text-orange-50', text: 'text-orange-500' };
      case '매우나쁨':
      case '매우높음':
      case '위험': return { stroke: 'text-red-500', bg: 'text-red-50', text: 'text-red-600' };
      default: return { stroke: 'text-gray-200', bg: 'text-gray-50', text: 'text-gray-400' };
    }
  };

  const colors = getStatusColor(status);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-3">
        {/* SVG Gauge Background */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle 
            cx="64" cy="64" r="56" 
            className="text-gray-50"
            fill="none" stroke="currentColor" strokeWidth="8" 
          />
          <motion.circle 
            initial={{ strokeDashoffset: 352 }}
            animate={{ strokeDashoffset: 352 - (352 * Math.min(progress, 100) / 100) }}
            cx="64" cy="64" r="56" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="10" 
            strokeDasharray={352}
            strokeLinecap="round"
            className={`${value === null ? 'text-gray-100' : colors.stroke} transition-all duration-1000`}
          />
        </svg>
        <div className="flex flex-col items-center">
          <span className="text-lg sm:text-xl font-bold">{value !== null ? value : '-'}</span>
          <span className="text-[9px] sm:text-[10px] font-bold text-gray-400">{unit}</span>
        </div>
      </div>
      <div className="text-[13px] sm:text-[14px] font-bold text-gray-900 mb-0.5">{label}</div>
      <div className="flex items-center gap-1 group cursor-pointer" onClick={onInfoClick}>
        <span className={`text-[15px] sm:text-[17px] font-bold ${colors.text}`}>{status}</span>
        <HelpCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 fill-gray-50 group-hover:${colors.text} transition-colors`} />
      </div>
    </div>
  );
}

function GolfWeather({ 
  data
}: { 
  key?: string; 
  data: GolfData;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="px-container-padding space-y-8">
        {/* Current Rounding Index Dashboard */}
        <section className="space-y-4">
          <div className="flex flex-col ml-1">
            <div className="flex justify-between items-end mb-1">
              <h3 className="text-body-sm text-on-surface-variant font-medium uppercase tracking-widest mt-2.5 mx-0">
                {(() => {
                  const now = getKSTDate();
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const dateNum = String(now.getDate()).padStart(2, '0');
                  const weekDay = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
                  return `${year}-${month}-${dateNum}(${weekDay})`;
                })()}
              </h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Section */}
            <div className="md:col-span-2 bg-surface-container-low rounded-3xl p-5 sm:p-6 border border-outline-variant/20 flex flex-col md:flex-row items-center gap-4 sm:gap-6">
              <div className={`w-full md:w-32 h-20 sm:h-24 rounded-2xl flex items-center justify-center border-2 shrink-0 ${
                data.roundingIndex === 'Great' ? 'bg-emerald-50 border-emerald-500/50 text-emerald-600' :
                data.roundingIndex === 'Good' ? 'bg-blue-50 border-blue-500/50 text-blue-600' :
                data.roundingIndex === 'Fair' ? 'bg-orange-50 border-orange-500/50 text-orange-600' :
                data.roundingIndex === 'Poor' ? 'bg-red-50 border-red-500/50 text-red-600' :
                'bg-gray-50 border-gray-300 text-gray-500'
              }`}>
                <span className="text-3xl sm:text-4xl font-bold tracking-tighter">
                  {data.roundingIndex === 'Great' && '최적'}
                  {data.roundingIndex === 'Good' && '좋음'}
                  {data.roundingIndex === 'Fair' && '보통'}
                  {data.roundingIndex === 'Poor' && '주의'}
                  {data.roundingIndex === 'N/A' && '--'}
                </span>
              </div>
              <div className="flex-1 space-y-1 text-center md:text-left">
                <p className="text-[17px] sm:text-lg text-on-surface font-semibold leading-snug">
                  {data.roundingIndex === 'N/A' ? '기상 정보를 불러올 수 없습니다.' : 
                   data.roundingIndex === 'Great' ? '라운딩하기 최적의 조건입니다.' :
                   data.roundingIndex === 'Good' ? '좋은 라운딩 조건입니다.' :
                   data.roundingIndex === 'Fair' ? '무난한 라운딩 조건입니다.' :
                   '라운딩 시 주의가 필요합니다.'}
                </p>
                <p className="text-sm sm:text-body-md text-on-surface-variant opacity-70">
                  {data.roundingIndex === 'N/A' ? 'API 연동 상태를 확인해주세요.' : 
                   (data.precipitation !== null && data.precipitation > 0) ? `강수(${data.precipitation}mm)가 예상되니 대비하세요.` :
                   (data.windGusts !== null && data.windGusts > 5) ? '강한 바람에 주의하세요.' : 
                   '현재 기상 조건이 양호합니다.'}
                </p>
              </div>
            </div>

            {/* Side Metrics Card */}
            <div className="bg-surface-container-low rounded-3xl p-5 border border-outline-variant/20 relative overflow-hidden flex flex-col justify-center min-h-[120px]">
              {/* Background Icon Watermark */}
              <Wind className="absolute -right-4 -top-4 w-20 h-20 sm:w-24 sm:h-24 text-on-surface-variant/5 -rotate-12" />
              
              <div className="space-y-4 relative z-10 w-full">
                <div className="space-y-1.5 w-full">
                  <div className="flex justify-between items-center text-on-surface-variant uppercase tracking-tight font-normal text-xs sm:text-body-md">
                    <span>풍속</span>
                    <span className="text-primary-brand font-bold text-xl sm:text-2xl">
                      <ValueWithUnit value={data.windGusts !== null ? `${data.windGusts} m/s` : '--'} />
                    </span>
                  </div>
                  <div className="h-1 bg-surface-container rounded-full overflow-hidden w-full">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: data.windGusts !== null ? `${Math.min(data.windGusts * 10, 100)}%` : '0%' }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="h-full bg-blue-500 rounded-full" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 w-full">
                  <div className="flex justify-between items-center text-on-surface-variant uppercase tracking-tight font-normal text-xs sm:text-body-md">
                    <span>습도 영향</span>
                    <span className="text-primary-brand font-bold text-xl sm:text-2xl">
                      <ValueWithUnit value={data.humidity !== null ? `${data.humidity}% / ${data.humidityLabel}` : '--'} />
                    </span>
                  </div>
                  <div className="h-1 bg-surface-container rounded-full overflow-hidden w-full">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: data.humidity !== null ? `${data.humidity}%` : '0%' }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="h-full bg-emerald-500 rounded-full" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-surface-container-low rounded-3xl p-5 border border-outline-variant/20">
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 opacity-60">비거리 영향</div>
                <div className="text-base text-on-surface font-medium tracking-tight">공기 저항 최소화</div>
             </div>
             <div className="bg-surface-container-low rounded-3xl p-5 border border-outline-variant/20">
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 opacity-60">클럽 선택</div>
                <div className="text-base text-on-surface font-medium tracking-tight">정상 거리 공략</div>
             </div>
          </div>

          {/* Green Speed Section */}
          {data.greenSpeed && Number(data.greenSpeed) !== 0 && (
            <div className="bg-surface-container-low rounded-3xl p-5 border border-outline-variant/20 flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <FlagTriangleRight className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base text-on-surface font-bold">그린 스피드</span>
                </div>
              </div>

              <div className="text-2xl font-black text-on-surface relative z-10">
                {data.greenSpeed}
              </div>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}


function ValueWithUnit({ value, className }: { value: string; className?: string }) {
  if (!value) return null;

  // Handle "value / label" pattern
  if (value.includes(' / ')) {
    const parts = value.split(' / ');
    return (
      <span className={className}>
        <ValueWithUnit value={parts[0]} />
        <span className="text-[0.36em] ml-1 opacity-60 font-normal normal-case">{parts[1]}</span>
      </span>
    );
  }

  // Special handle for air quality labels like "좋음/좋음"
  if (value.includes('/') && /[가-힣]/.test(value) && !/[0-9]/.test(value)) {
    const parts = value.split('/');
    if (parts.length === 2) {
      return (
        <span className={className}>
          <span className="text-[0.54em]">{parts[0]}</span>
          <span className="text-[0.36em] opacity-40 mx-0.5">/</span>
          <span className="text-[0.3em] opacity-80">{parts[1]}</span>
        </span>
      );
    }
  }

  // Special handle for values like "8 매우높음" (UV Index)
  const uvMatch = value.match(/^(\d+)\s+([가-힣\s]+)$/);
  if (uvMatch) {
    const num = uvMatch[1];
    const fullLabel = uvMatch[2].trim();
    const compactedLabel = fullLabel.replace(/\s+/g, '');

    if (compactedLabel === '매우높음') {
      return (
        <span className={className}>
          {num}
          <span className="text-[0.36em] ml-1 opacity-80 font-normal inline-flex flex-col text-left leading-[1.1] align-middle">
            <span>매우</span>
            <span>높음</span>
          </span>
        </span>
      );
    }

    return (
      <span className={className}>
        {num}
        <span className="text-[0.36em] ml-1 opacity-80 font-normal">{fullLabel}</span>
      </span>
    );
  }

  const parts = value.split(/(\s*[a-zA-Z\/%°]+)$/);
  if (parts.length > 1) {
    return (
      <span className={className}>
        {parts[0]}
        <span className="text-[0.36em] ml-0.5 opacity-80 font-normal normal-case">{parts[1].toLowerCase()}</span>
      </span>
    );
  }
  return <span className={className}>{value}</span>;
}


function GolfMetric({ icon, label, value, subValue, highlight }: { icon: React.ReactNode; label: string; value: string; subValue?: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-outline-variant/10 last:border-0 group">
      <div className="flex items-center gap-4">
        <div className="text-on-surface-variant group-hover:scale-110 transition-transform scale-125">
          {icon}
        </div>
        <span className="text-xl text-on-surface font-normal">{label}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className={`${highlight ? 'text-3xl' : 'text-xl'} font-normal text-primary-brand`}>
          <ValueWithUnit value={value} />
        </span>
        {subValue && <span className="text-label-caps text-on-surface-variant mt-1 font-normal">{subValue}</span>}
      </div>
    </div>
  );
}

function WeatherIcon({ name, className }: { name: string; className?: string }) {
  const iconProps = { strokeWidth: 2.2, className: "w-full h-full" };
  
  switch (name) {
    case 'Sun':
      return (
        <div className={className}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-full h-full text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          >
            <Sun {...iconProps} />
          </motion.div>
        </div>
      );
    case 'CloudSun':
      return (
        <div className={className + " relative"}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 right-0 w-3/4 h-3/4 text-amber-500 z-0"
          >
            <Sun strokeWidth={2} />
          </motion.div>
          <motion.div
            animate={{ 
              y: [0, -2, 0],
              x: [0, 1, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-full h-full text-blue-400 z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
          >
            <Cloud {...iconProps} fill="white" fillOpacity={0.1} />
          </motion.div>
        </div>
      );
    case 'Cloud':
      return (
        <div className={className}>
          <motion.div
            animate={{ 
              y: [0, -3, 0],
              scale: [1, 1.02, 1]
            }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full text-gray-500/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
          >
            <Cloud {...iconProps} fill="currentColor" fillOpacity={0.05} />
          </motion.div>
        </div>
      );
    case 'CloudRain':
      return (
        <div className={className}>
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full text-blue-500 relative"
          >
            <Cloud strokeWidth={2.2} fill="currentColor" fillOpacity={0.05} />
            <motion.div
              animate={{ 
                y: [0, 6, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-1 left-1/4"
            >
              <div className="w-0.5 h-2 bg-blue-400 rounded-full" />
            </motion.div>
            <motion.div
              animate={{ 
                y: [0, 6, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "linear", delay: 0.2 }}
              className="absolute bottom-1 left-1/2"
            >
              <div className="w-0.5 h-2 bg-blue-400 rounded-full" />
            </motion.div>
            <motion.div
              animate={{ 
                y: [0, 6, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "linear", delay: 0.4 }}
              className="absolute bottom-1 right-1/4"
            >
              <div className="w-0.5 h-2 bg-blue-400 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      );
    case 'CloudSnow':
      return (
        <div className={className}>
          <motion.div
            animate={{ x: [-1, 1, -1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full text-blue-200"
          >
            <CloudSnow {...iconProps} />
          </motion.div>
        </div>
      );
    case 'Moon':
      return (
        <div className={className}>
          <motion.div
            animate={{ 
              rotate: [-5, 5, -5],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.2)]"
          >
            <Moon {...iconProps} fill="currentColor" fillOpacity={0.1} />
          </motion.div>
        </div>
      );
    default:
      return (
        <div className={className}>
          <Sun {...iconProps} className="text-amber-500" />
        </div>
      );
  }
}
