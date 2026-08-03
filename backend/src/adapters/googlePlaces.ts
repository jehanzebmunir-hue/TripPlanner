import { fetchWithRetry } from "../lib/httpRetry";
import { withinDailyBudget } from "../lib/rateLimiter";
import { CityConfig, NormalizedRecord, SourceAdapter } from "../types";

interface GPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
}

// This is the one metered/paid adapter in the app — worth a real spend
// guard, not just a key gate. 161 = floor(5,000 / 31), the real free-tier
// ceiling (Text Search Pro SKU's 5,000 calls/month) divided by the longest
// possible month rather than 30 -- the previous value here (166 = 5,000/30)
// could theoretically total 5,146 calls across a real 31-day month if the
// cap were hit every single day, slightly over the free allowance. 161
// guarantees that can never happen regardless of month length. Scoped to
// only priorityTier cities (see adapters/index.ts's adaptersForCity —
// overpass covers baseline static-tier coverage for every other city, for
// free): the registry currently has 53 priority cities, and each can only
// be re-fetched once per STRUCTURED_REFRESH_MS (24h default), so real
// worst-case volume is ~53 calls/day -- this cap is a hard backstop far
// above what the registry can actually generate today, not the thing
// actually constraining spend in practice. Raise this only if you've
// deliberately decided to start paying $32/1,000 calls past the free
// allowance.
const DEFAULT_MAX_CALLS_PER_DAY = 161;

export const googlePlacesAdapter: SourceAdapter = {
  name: "google-places",
  async run(city: CityConfig) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn("[google-places] GOOGLE_PLACES_API_KEY not set — skipping (metered API, see architecture notes)");
      return null;
    }

    const maxCallsPerDay = Number(process.env.GOOGLE_PLACES_MAX_CALLS_PER_DAY ?? DEFAULT_MAX_CALLS_PER_DAY);
    const allowed = await withinDailyBudget("google-places", maxCallsPerDay);
    if (!allowed) {
      console.warn(`[google-places] daily call budget (${maxCallsPerDay}) already reached — skipping until tomorrow`);
      return [];
    }

    const res = await fetchWithRetry("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({ textQuery: `top attractions in ${city.name}` }),
    });

    if (!res.ok) {
      console.warn(`[google-places] request failed: ${res.status}`);
      return [];
    }

    const body = (await res.json()) as { places?: GPlace[] };
    const places = body.places ?? [];

    const records: NormalizedRecord[] = places.map((p) => ({
      externalId: p.id,
      category: "sightseeing-culture",
      tier: "static",
      name: p.displayName?.text ?? "Unnamed place",
      address: p.formattedAddress,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    }));

    return records;
  },
};
