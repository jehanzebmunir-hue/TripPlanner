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
// guard, not just a key gate. The default is a conservative placeholder,
// not a researched dollar figure: check current Google Places pricing and
// set GOOGLE_PLACES_MAX_CALLS_PER_DAY deliberately before ever adding a
// real key, rather than trusting this number.
const DEFAULT_MAX_CALLS_PER_DAY = 200;

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
