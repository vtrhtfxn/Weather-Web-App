import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { condition, fetchWeather, localDate, searchPlace, searchPlaces, weatherKind, windCompass, type Hour, type Place, type Weather } from './weather';
import './styles.css';

const FALLBACK_PLACE: Place = { name: 'Tashkent', country: 'Uzbekistan', latitude: 41.2995, longitude: 69.2401 };

type IconName = 'search' | 'cross' | 'refresh' | 'locate' | 'wind' | 'drop' | 'sun' | 'moon' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog' | 'arrow';

function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  const base = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className, 'aria-hidden': true as const };
  switch (name) {
    case 'search': return <svg {...base}><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 5 5" /></svg>;
    case 'cross': return <svg {...base}><path d="M5 5 19 19M19 5 5 19" /></svg>;
    case 'refresh': return <svg {...base}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7.5 7.5 0 0 1 19 7l1 5M4 12l1 5a7.5 7.5 0 0 0 13.5-2" /></svg>;
    case 'locate': return <svg {...base}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" /></svg>;
    case 'wind': return <svg {...base}><path d="M2 8h13c3 0 3-4 0-4-1.4 0-2.2.8-2.4 1.6M2 12h18c3 0 3 4 0 4-1.4 0-2.2-.8-2.4-1.6M2 16h9c3 0 3 4 0 4-1.4 0-2.2-.8-2.4-1.6" /></svg>;
    case 'drop': return <svg {...base}><path d="M12 2C9 6 5.5 10 5.5 14a6.5 6.5 0 0 0 13 0C18.5 10 15 6 12 2Z" /></svg>;
    case 'sun': return <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 1v2.5M12 20.5V23M1 12h2.5M20.5 12H23M4.2 4.2l1.8 1.8M18 18l1.8 1.8M19.8 4.2 18 6M6 18l-1.8 1.8" /></svg>;
    case 'moon': return <svg {...base}><path d="M20.2 15.6A8.5 8.5 0 0 1 8.4 3.8 8.5 8.5 0 1 0 20.2 15.6Z" /></svg>;
    case 'cloud': return <svg {...base}><path d="M6 18h12a4 4 0 0 0 .4-8A6.5 6.5 0 0 0 6 9.8 4.1 4.1 0 0 0 6 18Z" /></svg>;
    case 'rain': return <svg {...base}><path d="M6 15h12a4 4 0 0 0 .4-8A6.5 6.5 0 0 0 6 6.8 4.1 4.1 0 0 0 6 15ZM8 18l-1 3M13 18l-1 3M18 18l-1 3" /></svg>;
    case 'snow': return <svg {...base}><path d="M6 14h12a4 4 0 0 0 .4-8A6.5 6.5 0 0 0 6 5.8 4.1 4.1 0 0 0 6 14ZM8 18h.01M12 20h.01M17 18h.01" /></svg>;
    case 'storm': return <svg {...base}><path d="M6 14h12a4 4 0 0 0 .4-8A6.5 6.5 0 0 0 6 5.8 4.1 4.1 0 0 0 6 14ZM13 15l-3 4h3l-2 4" /></svg>;
    case 'fog': return <svg {...base}><path d="M3 7h18M5 11h14M2 15h20M6 19h12" /></svg>;
    case 'arrow': return <svg {...base}><path d="M4 12h16m-6-6 6 6-6 6" /></svg>;
  }
}

function displayPlace(place: Place): string {
  if (place.isCurrentLocation) return 'Your location';
  return [...new Set([place.name, place.admin1, place.country].filter(Boolean))].join(', ');
}

function Chart({ hours, period, timezone }: { hours: Hour[]; period: 'past' | 'future'; timezone: string }) {
  const temperatures = hours.map((hour) => hour.temperature);
  const floor = Math.floor((Math.min(...temperatures) - 2) / 5) * 5;
  const ceiling = Math.ceil((Math.max(...temperatures) + 2) / 5) * 5;
  const range = Math.max(5, ceiling - floor);
  const left = 52;
  const right = 1120;
  const top = 34;
  const bottom = 184;
  const x = (index: number) => left + index * ((right - left) / 23);
  const y = (value: number) => bottom - ((value - floor) / range) * (bottom - top);
  const line = hours.map((hour, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(hour.temperature).toFixed(1)}`).join(' ');
  const area = `${line} L${right} ${bottom} L${left} ${bottom} Z`;
  const ticks = [0, 1, 2, 3].map((index) => Math.round(floor + (range / 3) * index));

  return <div className="chart-scroll" role="region" aria-label={`${period === 'past' ? 'Previous' : 'Next'} 24 hours of hourly weather data`} tabIndex={0}>
    <svg className="chart" viewBox="0 0 1170 260" role="img" aria-label={`${period === 'past' ? 'Previous' : 'Next'} 24 hours. Temperatures from ${Math.round(Math.min(...temperatures))} to ${Math.round(Math.max(...temperatures))} degrees Celsius.`}>
      <defs>
        <linearGradient id="temp-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f28b54" stopOpacity=".19" /><stop offset="1" stopColor="#f28b54" stopOpacity=".015" /></linearGradient>
      </defs>
      {ticks.map((tick) => <g key={tick}><line x1="52" x2="1120" y1={y(tick)} y2={y(tick)} className="chart-grid" /><text x="34" y={y(tick) + 4} className="chart-axis" textAnchor="end">{tick}°</text></g>)}
      {hours.map((hour, index) => index % 3 === 0 && <line key={hour.time} x1={x(index)} x2={x(index)} y1="34" y2="184" className="chart-grid vertical" />)}
      <path d={area} fill="url(#temp-fill)" />
      {hours.map((hour, index) => <rect key={`rain-${hour.time}`} x={x(index) - 8} y={bottom - ((hour.rainChance ?? 0) / 100) * 67} width="16" height={((hour.rainChance ?? 0) / 100) * 67} rx="3" className="rain-bar"><title>{localDate(hour.time, timezone, { hour: 'numeric' })}: {hour.rainChance === null ? 'rain chance unavailable' : `${hour.rainChance}% chance of rain`}</title></rect>)}
      <path d={line} fill="none" stroke="#e87342" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {hours.map((hour, index) => index % 3 === 0 && <g key={`point-${hour.time}`}><circle cx={x(index)} cy={y(hour.temperature)} r="4" fill="#e87342" /><text x={x(index)} y={y(hour.temperature) - 12} textAnchor="middle" className="chart-value">{Math.round(hour.temperature)}°</text></g>)}
      {hours.map((hour, index) => index % 3 === 0 && <text key={`label-${hour.time}`} x={x(index)} y="218" textAnchor="middle" className="chart-label">{localDate(hour.time, timezone, { hour: 'numeric' })}</text>)}
      <text x="52" y="246" className="chart-date">{localDate(hours[0].time, timezone, { month: 'short', day: 'numeric' })}</text>
      <text x="1120" y="246" textAnchor="end" className="chart-date">{localDate(hours[23].time, timezone, { month: 'short', day: 'numeric' })}</text>
    </svg>
  </div>;
}

function App() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'past' | 'future'>('future');
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [composing, setComposing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const suggestionController = useRef<AbortController | null>(null);
  const requestNumber = useRef(0);
  const manualSelection = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchWrap = useRef<HTMLDivElement>(null);

  const runRequest = useCallback(async (getPlace: (signal: AbortSignal) => Promise<Place>) => {
    const number = ++requestNumber.current;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setError('');
    try {
      const place = await getPlace(nextController.signal);
      const result = await fetchWeather(place, nextController.signal);
      if (number === requestNumber.current) {
        setWeather(result);
        setPeriod('future');
      }
    } catch (cause) {
      if (number === requestNumber.current && !(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'Unable to load weather. Please try again.');
      }
    } finally {
      if (number === requestNumber.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runRequest(async () => FALLBACK_PLACE);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!manualSelection.current) {
            void runRequest(async () => ({ name: 'Your location', latitude: coords.latitude, longitude: coords.longitude, isCurrentLocation: true }));
          }
        },
        () => {},
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 600000 },
      );
    }
    return () => { requestNumber.current += 1; controller.current?.abort(); };
  }, [runRequest]);

  useEffect(() => {
    suggestionController.current?.abort();
    const value = query.trim();
    if (!showSuggestions || composing || value.length < 2) {
      setSuggestions([]);
      return;
    }
    const nextController = new AbortController();
    suggestionController.current = nextController;
    const timer = setTimeout(() => {
      void searchPlaces(value, nextController.signal)
        .then((places) => { if (!nextController.signal.aborted) setSuggestions(places); })
        .catch(() => { if (!nextController.signal.aborted) setSuggestions([]); });
    }, 350);
    return () => { clearTimeout(timer); nextController.abort(); };
  }, [query, composing, showSuggestions]);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!searchWrap.current?.contains(event.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setError('Enter a city or location to search.');
      searchInput.current?.focus();
      return;
    }
    manualSelection.current = true;
    setShowSuggestions(false);
    void runRequest((signal) => searchPlace(value, signal));
  }

  function choosePlace(place: Place) {
    manualSelection.current = true;
    setShowSuggestions(false);
    setQuery(displayPlace(place));
    void runRequest(async () => place);
  }

  function handleLocate() {
    manualSelection.current = true;
    if (!('geolocation' in navigator)) {
      setError('Your browser does not support location access. Search for a city instead.');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => void runRequest(async () => ({ name: 'Your location', latitude: coords.latitude, longitude: coords.longitude, isCurrentLocation: true })),
      () => setError('Location access was unavailable. Search for a city instead.'),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 600000 },
    );
  }

  const kind = weather ? weatherKind(weather.code) : 'sun';
  const conditionIcon: IconName = weather && !weather.isDay && kind === 'sun' ? 'moon' : kind;
  const displayDate = weather ? localDate(weather.observedAt, weather.timezone, { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  const displayTime = weather ? localDate(weather.observedAt, weather.timezone, { hour: 'numeric', minute: '2-digit' }) : '';
  const updatedTime = weather ? new Intl.DateTimeFormat('en-US', { timeZone: weather.timezone, hour: 'numeric', minute: '2-digit' }).format(weather.fetchedAt) : '';

  return <div className="app-shell" data-weather={kind} data-night={weather && !weather.isDay ? 'true' : 'false'}>
    <header className="topbar">
      <a className="brand" href="/" aria-label="Daybreak home"><span className="brand-sun" aria-hidden="true" />DAYBREAK</a>
      <div className="search-wrap" ref={searchWrap}>
        <form className="search-form" onSubmit={handleSearch} role="search" aria-busy={loading}>
          <label className="sr-only" htmlFor="place-search">Search for a city or location</label>
          <Icon name="search" size={21} className="search-icon" />
          <input id="place-search" ref={searchInput} value={query} onChange={(event) => { setQuery(event.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={(event) => { if (event.key === 'Escape') setShowSuggestions(false); if (event.key === 'ArrowDown' && suggestions.length && showSuggestions) { event.preventDefault(); searchWrap.current?.querySelector<HTMLButtonElement>('.suggestion-option')?.focus(); } }} placeholder="Search a city or location" autoComplete="off" />
          {query && <button type="button" className="clear-button" aria-label="Clear search" onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); searchInput.current?.focus(); }}><Icon name="cross" size={16} /></button>}
          <button className="search-submit" type="submit">Search</button>
        </form>
        {showSuggestions && suggestions.length > 0 && <div className="search-suggestions" role="group" aria-label="Matching locations">
          {suggestions.map((place, index) => <button className="suggestion-option" key={`${place.latitude}-${place.longitude}-${index}`} type="button" onClick={() => choosePlace(place)} onKeyDown={(event) => { if (event.key === 'Escape') { setShowSuggestions(false); searchInput.current?.focus(); } if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const options = Array.from(searchWrap.current?.querySelectorAll<HTMLButtonElement>('.suggestion-option') ?? []); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus(); } }}><strong>{place.name}</strong><span>{[place.admin1, place.country].filter(Boolean).join(', ')}</span></button>)}
          <p>Choose a location to get its forecast</p>
        </div>}
      </div>
      <div className="top-actions">
        <button className="icon-button locate-button" type="button" onClick={handleLocate} aria-label="Use my current location" title="Use my current location"><Icon name="locate" size={19} /></button>
        <button className="refresh-button" type="button" disabled={!weather || loading} onClick={() => { if (weather) { manualSelection.current = true; void runRequest(async () => weather.place); } }}><Icon name="refresh" size={18} className={loading ? 'spinning' : ''} /> <span>Refresh</span></button>
      </div>
    </header>

    {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss message" onClick={() => setError('')}><Icon name="cross" size={16} /></button></div>}

    <main>
      <section className="weather-hero" aria-labelledby="current-heading">
        <div className="hero-scene" aria-hidden="true" />
        <div className="hero-content">
          {weather ? <>
            <div className="place-line"><h1 id="current-heading">{displayPlace(weather.place)}</h1>{weather.place.isCurrentLocation && <Icon name="locate" size={20} />}</div>
            <p className="local-time">{displayDate} <span aria-hidden="true">·</span> {displayTime} local time</p>
            <div className="current-reading"><span className="temperature">{Math.round(weather.temperature)}</span><span className="degree">°C</span></div>
            <div className="condition-line"><Icon name={conditionIcon} size={32} /><h2>{condition(weather.code)}</h2></div>
            <p className="feels-like">Feels like {Math.round(weather.feelsLike)}°C right now.</p>
            <div className="conditions-strip">
              <div className="condition-stat"><span className="stat-icon"><Icon name="wind" size={27} /></span><span><span className="stat-label">Wind speed</span><strong>{Math.round(weather.windSpeed)} <small>km/h</small></strong><span className="stat-note">{windCompass(weather.windDirection)} wind</span></span></div>
              <div className="condition-stat"><span className="stat-icon droplet"><Icon name="drop" size={27} /></span><span><span className="stat-label">Rain chance</span><strong>{weather.rainChance === null ? '—' : `${Math.round(weather.rainChance)}%`}</strong><span className="stat-note">Next hour</span></span></div>
            </div>
          </> : <div className="hero-loading" id="current-heading" role="status"><span className="loading-sun" aria-hidden="true" /><h1>Finding the weather</h1><p>Looking up current conditions and the hourly outlook…</p></div>}
        </div>
        {weather && <div className="hero-footer"><span className="source-label">Illustrative scenery</span><span>Updated {updatedTime}</span></div>}
      </section>

      <section className="outlook" aria-labelledby="outlook-heading">
        <div className="section-heading"><div><h2 id="outlook-heading">24-hour weather</h2><p>See where the weather has been, and where it’s headed.</p></div><div className="period-switch" role="group" aria-label="Choose an hourly period"><button type="button" className={period === 'past' ? 'active' : ''} aria-pressed={period === 'past'} onClick={() => setPeriod('past')}>Past 24h</button><button type="button" className={period === 'future' ? 'active' : ''} aria-pressed={period === 'future'} onClick={() => setPeriod('future')}>Next 24h</button></div></div>
        <div className="chart-card">
          {weather ? <><div className="chart-topline"><div className="chart-legend"><span><i className="legend-dot temperature-dot" />Temperature (°C)</span><span><i className="legend-dot rain-dot" />Rain chance (%)</span></div><div className="period-caption">{period === 'past' ? 'Previous 24 hours' : 'Next 24 hours'} <Icon name="arrow" size={17} /></div></div><Chart hours={period === 'past' ? weather.past : weather.future} period={period} timezone={weather.timezone} /><div className="hourly-summary" aria-label="Hourly summary">{(period === 'past' ? weather.past : weather.future).filter((_, index) => index % 3 === 0).map((hour) => <div className="hourly-item" key={hour.time}><span>{localDate(hour.time, weather.timezone, { hour: 'numeric' })}</span><Icon name={!hour.isDay && weatherKind(hour.code) === 'sun' ? 'moon' : weatherKind(hour.code)} size={21} /><strong>{Math.round(hour.temperature)}°</strong><small>{hour.rainChance === null ? '—' : `${hour.rainChance}%`} rain</small></div>)}</div>{period === 'past' && <p className="model-note">Past hours are recent modeled weather, not station observations.</p>}</> : <div className="chart-placeholder" role="status">The hourly outlook will appear here.</div>}
        </div>
      </section>
    </main>
    <footer className="site-footer"><span>Daybreak</span><span>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
