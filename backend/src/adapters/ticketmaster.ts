import { fetchWithRetry } from "../lib/httpRetry";
import { withinDailyBudget } from "../lib/rateLimiter";
import { CityConfig, NormalizedRecord, SourceAdapter } from "../types";

// Ticketmaster's real, confirmed quota (their own developer FAQ, not a
// third-party summary): 2 requests/second and 5,000/day. Unlike
// google-places this isn't a spend guard -- Ticketmaster is free -- it's an
// operational one: this adapter runs for all 159 cities (DEFAULT_ADAPTERS),
// demand-driven, so real volume tracks actual traffic rather than a fixed
// schedule. Previously had no proactive guard at all, only reactive
// retry-on-429 (lib/httpRetry.ts) -- real margin exists under normal usage,
// but nothing stopped a real traffic spike from silently exceeding the
// day's free allowance and risking the key getting rate-limited. 4,500
// leaves deliberate headroom under the real 5,000 cap rather than cutting
// it close.
const DEFAULT_MAX_CALLS_PER_DAY = 4500;

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

    const maxCallsPerDay = Number(process.env.TICKETMASTER_MAX_CALLS_PER_DAY ?? DEFAULT_MAX_CALLS_PER_DAY);
    const allowed = await withinDailyBudget("ticketmaster", maxCallsPerDay);
    if (!allowed) {
      console.warn(`[ticketmaster] daily call budget (${maxCallsPerDay}) already reached — skipping until tomorrow`);
      return [];
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
