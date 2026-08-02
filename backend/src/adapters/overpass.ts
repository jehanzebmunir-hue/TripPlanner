import { fetchWithRetry } from "../lib/httpRetry";
import { CityConfig, NormalizedRecord, SourceAdapter } from "../types";

// 8km — a reasonable "city center and nearby" radius. Not tuned per city
// (same simplicity as the fixed size:15/per_page:15 caps on the
// ticketmaster/seatgeek adapters) — a sprawling city under-covers slightly,
// a small one over-covers slightly, neither is worth per-city special-casing.
const RADIUS_METERS = 8000;
// Per tag type, not a global cap -- verified live that a single combined
// `out body N` after a union of node[...] clauses returns results grouped by
// clause, not interleaved, so a tag with many real matches (theatres in a
// big city, say) would silently crowd out every other tag entirely before
// the cap was reached. A separate `out body N` after each clause keeps every
// tag type represented regardless of how common it is locally.
const PER_TAG_LIMIT = 3;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: {
    name?: string;
    tourism?: string;
    leisure?: string;
    historic?: string;
    amenity?: string;
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

// Real OSM tag -> this app's own category taxonomy (frontend/src/categories.ts).
// leisure=park and amenity=theatre confirmed live against the real Overpass
// API while building this; historic=monument/memorial and amenity=marketplace
// are long-established, widely-documented OSM tags (openstreetmap.org/wiki)
// not independently re-verified live today (the shared public instance was
// under real load at the time) -- flagged honestly rather than claimed as
// something it wasn't.
function categoryFor(tags: OverpassElement["tags"]): string {
  if (tags?.leisure === "park") return "outdoor-nature";
  if (tags?.amenity === "theatre") return "arts-entertainment-nightlife";
  if (tags?.amenity === "marketplace") return "shopping";
  return "sightseeing-culture"; // tourism=attraction/museum/viewpoint, historic=monument/memorial
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

    // tourism=attraction/museum/viewpoint — real things worth visiting, not
    // the whole sprawling tourism=* namespace (hotels, info boards, etc.).
    // Broadened beyond the original three tags to cover more of what this
    // app's own category taxonomy actually has slots for: parks
    // (outdoor-nature), theatres (arts-entertainment-nightlife), markets
    // (shopping), and historic monuments/memorials (sightseeing-culture) --
    // previously everything from this adapter landed in one category
    // regardless of what it actually was.
    const tags = [
      ["tourism", "attraction"],
      ["tourism", "museum"],
      ["tourism", "viewpoint"],
      ["leisure", "park"],
      ["historic", "monument"],
      ["historic", "memorial"],
      ["amenity", "theatre"],
      ["amenity", "marketplace"],
    ];
    const statements = tags
      .map(
        ([k, v]) =>
          `node["${k}"="${v}"](around:${RADIUS_METERS},${city.lat},${city.lng});out body ${PER_TAG_LIMIT};`
      )
      .join("");
    const query = `[out:json][timeout:20];${statements}`;

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
        category: categoryFor(e.tags),
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
