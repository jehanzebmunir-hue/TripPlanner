import { fetchWithRetry } from "../lib/httpRetry";
import { NormalizedRecord, SourceAdapter } from "../types";

const DATASET_URL = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records";

function categoryFor(tags: string | null): string {
  const t = (tags ?? "").toLowerCase();
  if (t.includes("sport")) return "sports-major-events";
  if (
    t.includes("concert") ||
    t.includes("spectacle") ||
    t.includes("cirque") ||
    t.includes("humour") ||
    t.includes("musique") ||
    t.includes("danse")
  ) {
    return "arts-entertainment-nightlife";
  }
  return "sightseeing-culture";
}

interface ParisEventRecord {
  id: string;
  title: string;
  lead_text?: string;
  qfap_tags?: string;
  date_start?: string;
  date_end?: string;
  url?: string;
  address_name?: string;
  address_street?: string;
  lat_lon?: { lat: number; lon: number };
}

export const parisEventsAdapter: SourceAdapter = {
  name: "paris-events",
  async run() {
    const params = new URLSearchParams({
      where: "date_start > now()",
      order_by: "date_start",
      limit: "15",
      select: "id,title,lead_text,qfap_tags,date_start,date_end,url,address_name,address_street,lat_lon",
    });

    const res = await fetchWithRetry(`${DATASET_URL}?${params.toString()}`);
    if (!res.ok) {
      console.warn(`[paris-events] request failed: ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { results?: ParisEventRecord[] };
    const rows = body.results ?? [];

    const records: NormalizedRecord[] = rows.map((row) => ({
      externalId: row.id,
      category: categoryFor(row.qfap_tags ?? null),
      tier: "volatile",
      name: row.title,
      description: row.lead_text,
      address: [row.address_name, row.address_street].filter(Boolean).join(", ") || undefined,
      lat: row.lat_lon?.lat,
      lng: row.lat_lon?.lon,
      expiryAt: row.date_end ? new Date(row.date_end) : undefined,
      bookingLabel: "Details on paris.fr",
      bookingRef: row.url,
    }));

    return records;
  },
};
