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
// guard, not just a key gate. 166 = the real free-tier ceiling (Text Search
// Pro SKU's 5,000 calls/month ÷ 30), not an arbitrary placeholder. Now
// scoped to only priorityTier cities (see adapters/index.ts's
// adaptersForCity — overpass covers baseline static-tier coverage for
// every other city, for free), so real usage is ~44 cities/day at most —
// comfortably inside this ceiling with room to grow the priority tier
// itself before ever needing to raise it. Raise this only if you've
// deliberately decided to start paying $32/1,000 calls past the free
// allowance.
const DEFAULT_MAX_CALLS_PER_DAY = 166;

export const googlePlacesAdapter: SourceAdapter = {
  name: "google-places",
  async run(city: CityConfig) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn("[google-places] GOOGLE_PLACES_API_KEY not set — skipping (metered API, see architecture notes)");
      return [];
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
