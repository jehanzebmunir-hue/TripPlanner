import { fetchWithRetry } from "../lib/httpRetry";
import { NormalizedRecord, SourceAdapter } from "../types";

const DATASET_URL = "https://data.cityofchicago.org/resource/pk66-w54g.json";

// The raw dataset mixes real public events with private facility rentals and
// admin holds (athletic training, photo shoots, internal reservations). Only
// the event_types below are genuinely public-facing.
const INCLUDED_TYPES = ["Festival", "Performance", "Event 6/10,000", "Corporate Event"];

function categoryFor(eventType: string): string {
  const t = eventType.toLowerCase();
  if (t.includes("festival") || t.includes("performance")) return "arts-entertainment-nightlife";
  return "sightseeing-culture";
}

export interface ChicagoEventRow {
  event_description: string;
  event_type: string;
  reservation_start_date: string;
  reservation_end_date?: string;
  park_facility_name?: string;
  permit_status?: string;
}

// A single festival spans many rows — one per facility and per day. Group by
// name alone so a multi-day, multi-venue event becomes one record with the
// fullest date range, not a dozen near-identical cards. Exported standalone
// (no network call) so this grouping logic can be unit tested directly.
export function buildRecordsFromRows(rows: ChicagoEventRow[]): NormalizedRecord[] {
  const byName = new Map<string, ChicagoEventRow[]>();
  for (const row of rows) {
    if (!row.event_description || row.event_description === "--") continue;
    const group = byName.get(row.event_description) ?? [];
    group.push(row);
    byName.set(row.event_description, group);
  }

  return Array.from(byName.entries())
    .slice(0, 15)
    .map(([name, group]) => {
      const latestEnd = group.reduce<Date | undefined>((latest, row) => {
        if (!row.reservation_end_date) return latest;
        const end = new Date(row.reservation_end_date);
        return !latest || end > latest ? end : latest;
      }, undefined);
      const venues = Array.from(new Set(group.map((r) => r.park_facility_name).filter(Boolean)));

      return {
        externalId: name.slice(0, 150),
        category: categoryFor(group[0].event_type),
        tier: "volatile",
        name,
        description: venues.slice(0, 2).join(", ") || undefined,
        expiryAt: latestEnd,
      };
    });
}

export const chicagoParkEventsAdapter: SourceAdapter = {
  name: "chicago-park-events",
  async run() {
    const nowFloating = new Date().toISOString().slice(0, 19);
    const typeFilter = INCLUDED_TYPES.map((t) => `event_type like '%${t}%'`).join(" OR ");
    const params = new URLSearchParams({
      $where: `reservation_start_date > '${nowFloating}' AND (${typeFilter}) AND permit_status != 'Cancelled'`,
      $order: "reservation_start_date ASC",
      $limit: "150",
    });

    const res = await fetchWithRetry(`${DATASET_URL}?${params.toString()}`);
    if (!res.ok) {
      console.warn(`[chicago-park-events] request failed: ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as ChicagoEventRow[];
    return buildRecordsFromRows(rows);
  },
};
