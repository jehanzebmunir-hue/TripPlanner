import { fetchWithRetry } from "../lib/httpRetry";
import { CityConfig, NormalizedRecord, SourceAdapter } from "../types";

function categoryFor(segment: string | undefined): string {
  const s = (segment ?? "").toLowerCase();
  if (s.includes("sport")) return "sports-major-events";
  if (s.includes("music") || s.includes("arts") || s.includes("film")) {
    return "arts-entertainment-nightlife";
  }
  return "sightseeing-culture";
}

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { dateTime?: string; localDate?: string } };
  classifications?: Array<{ segment?: { name?: string } }>;
  // Real field the Discovery API returns when pricing is known for an
  // event — not present on every event (many genuinely don't have pricing
  // published yet), so this stays undefined rather than guessed when absent.
  priceRanges?: Array<{ min?: number; max?: number; currency?: string }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      address?: { line1?: string };
      location?: { longitude?: string; latitude?: string };
    }>;
  };
}

export const ticketmasterAdapter: SourceAdapter = {
  name: "ticketmaster",
  async run(city: CityConfig) {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.warn("[ticketmaster] TICKETMASTER_API_KEY not set — skipping");
      return null;
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      city: city.ticketmasterMarket ?? city.name,
      countryCode: city.country,
      size: "15",
      sort: "date,asc",
    });

    const res = await fetchWithRetry(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`);
    if (!res.ok) {
      console.warn(`[ticketmaster] request failed: ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { _embedded?: { events?: TmEvent[] } };
    const events = body._embedded?.events ?? [];

    const records: NormalizedRecord[] = events.map((e) => {
      const venue = e._embedded?.venues?.[0];
      const lat = venue?.location?.latitude ? Number(venue.location.latitude) : undefined;
      const lng = venue?.location?.longitude ? Number(venue.location.longitude) : undefined;
      return {
        externalId: e.id,
        category: categoryFor(e.classifications?.[0]?.segment?.name),
        tier: "volatile",
        name: e.name,
        description: venue?.name,
        address: venue?.address?.line1,
        lat,
        lng,
        expiryAt: e.dates?.start?.dateTime ? new Date(e.dates.start.dateTime) : undefined,
        bookingLabel: "Buy on Ticketmaster",
        bookingRef: e.url,
        priceAmount: e.priceRanges?.[0]?.min,
      };
    });

    return records;
  },
};
