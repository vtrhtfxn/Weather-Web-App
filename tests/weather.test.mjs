import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/weather.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fetchWeather, localDate, searchPlaces } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

test('location suggestions distinguish cities with the same name', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    json: async () => ({ results: [
      { name: 'Springfield', admin1: 'Missouri', country: 'United States', latitude: 37.21, longitude: -93.29 },
      { name: 'Palmyra', admin1: 'Missouri', country: 'United States', latitude: 39.79, longitude: -91.52 },
      { name: 'Springfield', admin1: 'Illinois', country: 'United States', latitude: 39.8, longitude: -89.64 },
    ] }),
  }));
  const results = await searchPlaces('Springfield', new AbortController().signal);
  assert.deepEqual(results.map((place) => place.admin1), ['Missouri', 'Illinois']);
});

test('24-hour periods stay distinct across a daylight-saving repeat', async (context) => {
  const current = Date.parse('2026-11-01T06:45:00Z') / 1000;
  const currentHour = Math.floor(current / 3600) * 3600;
  const times = Array.from({ length: 121 }, (_, index) => currentHour - 60 * 3600 + index * 3600);
  context.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    json: async () => ({
      timezone: 'America/New_York',
      current: { time: current, temperature_2m: 9, apparent_temperature: 7, weather_code: 3, wind_speed_10m: 12, wind_direction_10m: 270, is_day: 0 },
      hourly: {
        time: times,
        temperature_2m: times.map((_, index) => index),
        precipitation_probability: times.map((_, index) => index),
        weather_code: times.map(() => 3),
        is_day: times.map(() => 0),
      },
    }),
  }));
  const weather = await fetchWeather({ name: 'New York', latitude: 40.71, longitude: -74.01 }, new AbortController().signal);
  assert.equal(weather.past.length, 24);
  assert.equal(weather.future.length, 24);
  assert.equal(weather.past.at(-1).time, currentHour - 3600);
  assert.equal(weather.future[0].time, currentHour + 3600);
  assert.equal(weather.rainChance, 61);
  assert.equal(localDate(currentHour - 3600, weather.timezone, { hour: 'numeric' }), '1 AM');
  assert.equal(localDate(currentHour, weather.timezone, { hour: 'numeric' }), '1 AM');
});
