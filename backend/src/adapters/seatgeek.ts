import { fetchWithRetry } from "../lib/httpRetry";
import { CityConfig, NormalizedRecord, SourceAdapter } from "../types";

function categoryFor(type: string | undefined): string {
  const t = (type ?? "").toLowerCase();
  if (t.includes("sport") || t.includes("nba") || t.includes("nfl") || t.includes("mlb")) {
    return "sports-major-events";
  }
  if (t.includes("concert") || t.includes("music") || t.includes("theater") || t.includes("comedy")) {
    return "arts-entertainment-nightlife";
  }
  return "sightseeing-culture";
}

interface SgEvent {
  id: number;
  title: string;
  type?: string;
  url?: string;
  datetime_local?: string;
  venue?: { name?: string; address?: string; location?: { lat?: number; lon?: number } };
  // Real field the API returns when a secondary market has listings priced
  // for an event — absent for events with no active listings yet, so this
  // stays undefined rather than guessed when absent.
  stats?: { lowest_price?: number };
}

export const seatgeekAdapter: SourceAdapter = {
  name: "seatgeek",
  async run(city: CityConfig) {
    const clientId = process.env.SEATGEEK_CLIENT_ID;
    if (!clientId) {
      console.warn("[seatgeek] SEATGEEK_CLIENT_ID not set — skipping");
      return [];
    }

    const params = new URLSearchParams({
      client_id: clientId,
      "venue.city": city.seatgeekVenueCity ?? city.name,
      per_page: "15",
      sort: "datetime_local.asc",
    });

    const res = await fetchWithRetry(`https://api.seatgeek.com/2/events?${params.toString()}`);
    if (!res.ok) {
      console.warn(`[seatgeek] request failed: ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { events?: SgEvent[] };
    const events = body.events ?? [];

    const records: NormalizedRecord[] = events.map((e) => ({
      externalId: String(e.id),
      category: categoryFor(e.type),
      tier: "volatile",
      name: e.title,
      description: e.venue?.name,
      address: e.venue?.address,
      lat: e.venue?.location?.lat,
      lng: e.venue?.location?.lon,
      expiryAt: e.datetime_local ? new Date(e.datetime_local) : undefined,
      bookingLabel: "Buy on SeatGeek",
      bookingRef: e.url,
      priceAmount: e.stats?.lowest_price,
    }));

    return records;
  },
};
