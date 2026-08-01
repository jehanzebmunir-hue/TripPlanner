import { fetchWithRetry } from "../lib/httpRetry";
import { CityConfig, NormalizedRecord, SourceAdapter } from "../types";

// 8km — a reasonable "city center and nearby" radius. Not tuned per city
// (same simplicity as the fixed size:15/per_page:15 caps on the
// ticketmaster/seatgeek adapters) — a sprawling city under-covers slightly,
// a small one over-covers slightly, neither is worth per-city special-casing.
const RADIUS_METERS = 8000;
const MAX_RESULTS = 20;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: {
    name?: string;
    tourism?: string;
    "addr:housenumber"?: string;
    "addr:street"?: string;
    "addr:city"?: string;
  };
}

function addressFor(tags: OverpassElement["tags"]): string | undefined {
  if (!tags) return undefined;
  const parts = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean);
  if (parts.length === 0) return undefined;
  return tags["addr:city"] ? `${parts.join(" ")}, ${tags["addr:city"]}` : parts.join(" ");
}

export const overpassAdapter: SourceAdapter = {
  name: "overpass",
  async run(city: CityConfig) {
    // Real coordinates only, geocoded live against Nominatim when this
    // adapter was built — see config/cities.ts. Every registered city has
    // them, but this guards against a future city added without one rather
    // than silently querying (around:8000,0,0) — the Gulf of Guinea.
    if (!city.lat || !city.lng) {
      console.warn(`[overpass] ${city.slug} has no coordinates — skipping`);
      return [];
    }

    // tourism=attraction/museum/viewpoint/artwork — the OSM tags that
    // actually correspond to "a real thing worth visiting," not the whole
    // sprawling tourism=* namespace (which also covers hotels, information
    // boards, etc.). Matches google-places' "top attractions" scope.
    const query = `[out:json][timeout:15];(node["tourism"="attraction"](around:${RADIUS_METERS},${city.lat},${city.lng});node["tourism"="museum"](around:${RADIUS_METERS},${city.lat},${city.lng});node["tourism"="viewpoint"](around:${RADIUS_METERS},${city.lat},${city.lng}););out body ${MAX_RESULTS};`;

    // A real, identifying User-Agent is Overpass's own stated expectation
    // for well-behaved clients (same as Nominatim's) -- verified live that
    // omitting it makes requests start failing under load, not just a
    // theoretical courtesy.
    const res = await fetchWithRetry("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "TripPlanner/1.0 (+https://github.com/jehanzebmunir-hue/TripPlanner)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      console.warn(`[overpass] request failed: ${res.status}`);
      return [];
    }

    const body = (await res.json()) as { elements?: OverpassElement[] };
    const elements = body.elements ?? [];

    // Real, verified caveat: this is crowdsourced OSM data, not a curated
    // dataset — quality varies more than Google Places'. A missing name is
    // the one case worth filtering rather than showing a useless card.
    const records: NormalizedRecord[] = elements
      .filter((e) => e.tags?.name && e.lat != null && e.lon != null)
      .map((e) => ({
        externalId: `${e.type}/${e.id}`,
        category: "sightseeing-culture",
        tier: "static",
        name: e.tags!.name!,
        address: addressFor(e.tags),
        lat: e.lat,
        lng: e.lon,
        // No price extraction: OSM's fee/charge tags are free-text
        // ("10 EUR", "full:12;discount:10;...") not a reliable structured
        // number — parsing them would risk exactly the kind of guessed
        // figure this project's pricing model is built to avoid.
      }));

    return records;
  },
};
