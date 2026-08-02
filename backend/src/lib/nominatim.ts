import { fetchWithRetry } from "./httpRetry";

export interface GeocodedPlace {
  name: string;
  // A state/county-level disambiguator when Nominatim provides one --
  // without it, two real, distinct places with the same name in the same
  // country (Springfield, IL vs. Springfield, MO) would collide onto the
  // same cache slug.
  region?: string;
  countryCode: string; // uppercase ISO 3166-1 alpha-2
  lat: number;
  lng: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    state?: string;
    county?: string;
    country_code?: string;
  };
}

// Nominatim's usage policy caps free/anonymous use at 1 request/second and
// requires a real, identifying User-Agent -- the same lesson already learned
// live with Overpass (see adapters/overpass.ts). A module-level timestamp
// gate enforces the interval across every call in this process, since a
// burst of city-search requests could otherwise fire closer together than
// that.
const MIN_INTERVAL_MS = 1100;
let lastCallAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle(): Promise<void> {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

/**
 * Free-text place search against OpenStreetMap's own geocoder -- no key, no
 * cost, real coverage for any real place rather than just this app's
 * curated registry. Only returns results Nominatim itself resolved to an
 * actual settlement (city/town/village/...), filtering out a bare street,
 * landmark, or country-level match.
 */
export async function geocodePlace(query: string): Promise<GeocodedPlace[]> {
  await throttle();

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=5`;
  const res = await fetchWithRetry(url, {
    headers: { "User-Agent": "TripPlanner/1.0 (+https://github.com/jehanzebmunir-hue/TripPlanner)" },
  });

  if (!res.ok) {
    console.warn(`[nominatim] search failed: ${res.status}`);
    return [];
  }

  const results = (await res.json()) as NominatimResult[];

  const places: GeocodedPlace[] = [];
  for (const r of results) {
    const settlement =
      r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.hamlet ?? r.address?.municipality;
    const countryCode = r.address?.country_code;
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!settlement || !countryCode || !r.name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const region = r.address?.state ?? r.address?.county;
    places.push({ name: r.name, countryCode: countryCode.toUpperCase(), lat, lng, ...(region ? { region } : {}) });
  }
  return places;
}
