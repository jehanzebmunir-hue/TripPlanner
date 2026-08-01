import { fetchWithRetry } from "../lib/httpRetry";
import { NormalizedRecord, SourceAdapter } from "../types";

const DATASET_URL = "https://data.cityofnewyork.us/resource/tvpp-9vvx.json";

function categoryFor(eventType: string | undefined): string {
  const t = (eventType ?? "").toLowerCase();
  if (t.includes("sport")) return "sports-major-events";
  if (t.includes("special event") || t.includes("festival") || t.includes("parade")) {
    return "arts-entertainment-nightlife";
  }
  return "sightseeing-culture";
}

interface NycEventRow {
  event_id: string;
  event_name: string;
  start_date_time: string;
  end_date_time?: string;
  event_agency?: string;
  event_type?: string;
  event_borough?: string;
  event_location?: string;
}

export const nycOpenDataEventsAdapter: SourceAdapter = {
  name: "nyc-open-data-events",
  async run() {
    const nowFloating = new Date().toISOString().slice(0, 19);
    const params = new URLSearchParams({
      $where: `start_date_time > '${nowFloating}'`,
      $order: "start_date_time ASC",
      $limit: "15",
    });

    const res = await fetchWithRetry(`${DATASET_URL}?${params.toString()}`);
    if (!res.ok) {
      console.warn(`[nyc-open-data-events] request failed: ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as NycEventRow[];

    const records: NormalizedRecord[] = rows.map((row) => ({
      externalId: row.event_id,
      category: categoryFor(row.event_type),
      tier: "volatile",
      name: row.event_name,
      description: [row.event_type, row.event_borough].filter(Boolean).join(" · ") || undefined,
      address: row.event_location,
      expiryAt: row.end_date_time ? new Date(row.end_date_time) : undefined,
    }));

    return records;
  },
};
