import { fetchWithRetry } from "./httpRetry";
import { prisma } from "./prisma";
import { CityConfig } from "../types";

export type WeatherSource = "forecast" | "historical-average";

export interface WeatherSummary {
  source: WeatherSource;
  avgHighC: number;
  avgLowC: number;
  rainChancePercent: number;
}

// Open-Meteo -- free, no key, no signup required for non-commercial use
// (10,000 calls/day), verified live against the real API before building
// this: both the forecast and archive endpoints return exactly the shape
// used below. https://open-meteo.com/en/docs
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

// Open-Meteo's real forecast horizon -- a trip ending further out than this
// can't get a genuine day-by-day forecast, so it falls back to a real
// historical average instead of a partial or guessed one.
const FORECAST_MAX_DAYS_OUT = 16;

// Forecasts materially change as they're updated upstream (several times a
// day); historical averages, drawn from years-old recorded weather, don't
// meaningfully change day to day. Two different real cache lifetimes for two
// different kinds of data, not one blanket TTL.
const FORECAST_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const HISTORICAL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// How many past years' real recorded weather to average for a historical
// estimate -- enough to smooth out one unusual year, not so many that very
// old data (climate drift) dominates the average.
const HISTORICAL_YEARS_BACK = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

interface RawSummary {
  avgHighC: number;
  avgLowC: number;
  rainChancePercent: number;
}

async function fetchForecast(lat: number, lng: number, startDate: Date, endDate: Date): Promise<RawSummary | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    start_date: dateKey(startDate),
    end_date: dateKey(endDate),
  });

  const res = await fetchWithRetry(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) {
    console.warn(`[weather] forecast request failed: ${res.status}`);
    return null;
  }
  const body = (await res.json()) as {
    daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[] };
  };
  const highs = body.daily?.temperature_2m_max;
  const lows = body.daily?.temperature_2m_min;
  if (!highs?.length || !lows?.length) return null;

  const rainChances = body.daily?.precipitation_probability_max;
  return {
    avgHighC: average(highs),
    avgLowC: average(lows),
    rainChancePercent: rainChances?.length ? average(rainChances) : 0,
  };
}

// Real recorded weather for the same calendar dates across the last
// HISTORICAL_YEARS_BACK years, averaged -- a real historical estimate, not a
// forecast and not a guess. Shifting each end of the range by the same
// offset (rather than assuming both ends fall in the same year) keeps a
// range that spans a calendar year boundary (e.g. Dec 28 - Jan 3) correct.
async function fetchHistoricalAverage(lat: number, lng: number, startDate: Date, endDate: Date): Promise<RawSummary | null> {
  const highs: number[] = [];
  const lows: number[] = [];
  let rainyDays = 0;
  let totalDays = 0;

  for (let yearsBack = 1; yearsBack <= HISTORICAL_YEARS_BACK; yearsBack++) {
    const pastStart = new Date(startDate);
    pastStart.setFullYear(pastStart.getFullYear() - yearsBack);
    const pastEnd = new Date(endDate);
    pastEnd.setFullYear(pastEnd.getFullYear() - yearsBack);

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      start_date: dateKey(pastStart),
      end_date: dateKey(pastEnd),
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
      timezone: "auto",
    });

    const res = await fetchWithRetry(`${ARCHIVE_URL}?${params.toString()}`);
    if (!res.ok) continue; // one bad year shouldn't sink the whole average

    const body = (await res.json()) as {
      daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[] };
    };
    highs.push(...(body.daily?.temperature_2m_max ?? []));
    lows.push(...(body.daily?.temperature_2m_min ?? []));
    // >= 1mm counts as a real wet day -- a trace amount below that is noise,
    // not something worth packing a rain jacket over.
    (body.daily?.precipitation_sum ?? []).forEach((mm) => {
      totalDays++;
      if (mm >= 1) rainyDays++;
    });
  }

  if (highs.length === 0 || lows.length === 0) return null;
  return {
    avgHighC: average(highs),
    avgLowC: average(lows),
    rainChancePercent: totalDays > 0 ? (rainyDays / totalDays) * 100 : 0,
  };
}

/**
 * Real weather for a trip's destination and dates -- a genuine forecast when
 * the trip falls within Open-Meteo's real forecast horizon, otherwise a real
 * historical average from past years' recorded weather at the same
 * coordinates and calendar dates. Never a guessed or interpolated number
 * either way. Returns null when no real data could be obtained (and no
 * usable cache exists to fall back to) -- same "no citation, no claim"
 * discipline as price data elsewhere in this app.
 */
export async function getWeatherSummary(city: CityConfig, startDate: Date, endDate: Date): Promise<WeatherSummary | null> {
  const now = Date.now();
  const daysUntilEnd = (endDate.getTime() - now) / MS_PER_DAY;
  const daysUntilStart = (startDate.getTime() - now) / MS_PER_DAY;
  // -1 day of grace so a trip that started yesterday still gets a real
  // forecast for its remaining days, rather than falling back for the sake
  // of a single already-past day.
  const withinForecastWindow = daysUntilEnd <= FORECAST_MAX_DAYS_OUT && daysUntilStart >= -1;
  const source: WeatherSource = withinForecastWindow ? "forecast" : "historical-average";

  const startKey = dateKey(startDate);
  const endKey = dateKey(endDate);
  const cacheTtl = source === "forecast" ? FORECAST_CACHE_TTL_MS : HISTORICAL_CACHE_TTL_MS;

  const cached = await prisma.weatherCache.findUnique({
    where: { citySlug_startDate_endDate_source: { citySlug: city.slug, startDate: startKey, endDate: endKey, source } },
  });
  if (cached && now - cached.fetchedAt.getTime() < cacheTtl) {
    return { source, avgHighC: cached.avgHighC, avgLowC: cached.avgLowC, rainChancePercent: cached.rainChancePercent };
  }

  const fresh =
    source === "forecast"
      ? await fetchForecast(city.lat, city.lng, startDate, endDate)
      : await fetchHistoricalAverage(city.lat, city.lng, startDate, endDate);

  if (!fresh) {
    // A live failure with a real (if stale) cache to fall back on beats
    // showing nothing at all -- the cache entry itself is still real data,
    // just from an earlier fetch.
    if (cached) return { source, avgHighC: cached.avgHighC, avgLowC: cached.avgLowC, rainChancePercent: cached.rainChancePercent };
    return null;
  }

  await prisma.weatherCache.upsert({
    where: { citySlug_startDate_endDate_source: { citySlug: city.slug, startDate: startKey, endDate: endKey, source } },
    create: { citySlug: city.slug, startDate: startKey, endDate: endKey, source, ...fresh },
    update: { ...fresh, fetchedAt: new Date() },
  });

  return { source, ...fresh };
}
