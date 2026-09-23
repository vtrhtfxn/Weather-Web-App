export type Place = {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  isCurrentLocation?: boolean;
};

export type Hour = {
  time: number;
  temperature: number;
  rainChance: number | null;
  code: number;
  isDay: boolean;
};

export type Weather = {
  place: Place;
  timezone: string;
  observedAt: number;
  fetchedAt: Date;
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  windDirection: number;
  code: number;
  isDay: boolean;
  rainChance: number | null;
  past: Hour[];
  future: Hour[];
};

type GeocodingResult = {
  results?: Array<Place>;
  error?: boolean;
  reason?: string;
};

type ForecastResult = {
  timezone?: string;
  current?: {
    time: number;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    is_day: number;
  };
  hourly?: {
    time: number[];
    temperature_2m: Array<number | null>;
    precipitation_probability: Array<number | null>;
    weather_code: Array<number | null>;
    is_day: Array<number | null>;
  };
  error?: boolean;
  reason?: string;
};

async function getJson<T>(url: URL, signal: AbortSignal): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if (signal.aborted) throw error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        if (signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
        continue;
      }
      throw new Error('Could not reach the weather service. Check your connection and try again.');
    }
    if ([502, 503, 504].includes(response.status) && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      if (signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
      continue;
    }
    if (!response.ok) throw new Error(`Weather service returned ${response.status}. Please try again.`);
    return response.json() as Promise<T>;
  }
  throw new Error('Weather service is temporarily unavailable. Please try again.');
}

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query.trim());
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');
  const data = await getJson<GeocodingResult>(url, signal);
  if (data.error) throw new Error(data.reason || 'Location search is unavailable.');
  const places = data.results ?? [];
  const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const cityQuery = normalized(query.split(',')[0].trim());
  const namedMatches = places.filter((place) => normalized(place.name).startsWith(cityQuery));
  return namedMatches.length ? namedMatches : places;
}

export async function searchPlace(query: string, signal: AbortSignal): Promise<Place> {
  const places = await searchPlaces(query, signal);
  if (!places.length) throw new Error(`No location found for “${query.trim()}”. Try a city and country.`);
  return places[0];
}

export async function fetchWeather(place: Place, signal: AbortSignal): Promise<Weather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(place.latitude));
  url.searchParams.set('longitude', String(place.longitude));
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day');
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code,is_day');
  url.searchParams.set('past_days', '2');
  url.searchParams.set('forecast_days', '3');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('timeformat', 'unixtime');

  const data = await getJson<ForecastResult>(url, signal);
  if (data.error) throw new Error(data.reason || 'Weather data is unavailable.');
  if (!data.current || !data.hourly || !data.timezone) throw new Error('Weather data is incomplete. Please refresh.');
  if (![data.current.time, data.current.temperature_2m, data.current.apparent_temperature, data.current.weather_code, data.current.wind_speed_10m, data.current.wind_direction_10m, data.current.is_day].every(Number.isFinite)) {
    throw new Error('Current conditions are incomplete for this location. Try refreshing.');
  }

  const hourly = data.hourly;
  let currentIndex = hourly.time.length - 1;
  while (currentIndex >= 0 && hourly.time[currentIndex] > data.current.time) currentIndex -= 1;
  if (currentIndex < 24 || currentIndex + 24 >= hourly.time.length) {
    throw new Error('The 24-hour outlook is temporarily unavailable. Please refresh.');
  }

  const hourAt = (index: number): Hour => {
    const temperature = hourly.temperature_2m[index];
    const code = hourly.weather_code[index];
    const isDay = hourly.is_day[index];
    if (![hourly.time[index], temperature, code, isDay].every(Number.isFinite)) {
      throw new Error('The hourly outlook is incomplete for this location. Try refreshing.');
    }
    return {
      time: hourly.time[index],
      temperature: temperature!,
      rainChance: hourly.precipitation_probability[index] ?? null,
      code: code!,
      isDay: isDay === 1,
    };
  };

  return {
    place,
    timezone: data.timezone,
    observedAt: data.current.time,
    fetchedAt: new Date(),
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    code: data.current.weather_code,
    isDay: data.current.is_day === 1,
    rainChance: hourly.precipitation_probability[currentIndex + 1] ?? null,
    past: Array.from({ length: 24 }, (_, offset) => hourAt(currentIndex - 24 + offset)),
    future: Array.from({ length: 24 }, (_, offset) => hourAt(currentIndex + 1 + offset)),
  };
}

export function condition(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mostly sunny';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzly';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snowy';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Variable skies';
}

export function weatherKind(code: number): 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog' {
  if ([0, 1].includes(code)) return 'sun';
  if ([2, 3].includes(code)) return 'cloud';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'cloud';
}

export function windCompass(degrees: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8];
}

export function localDate(time: number, timezone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }).format(new Date(time * 1000));
}
