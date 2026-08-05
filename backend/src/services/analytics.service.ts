import { prisma } from "../lib/prisma";

class BadRequestError extends Error {
  status = 400;
}

// A closed allowlist, not free-text -- keeps this genuinely aggregate (no
// unbounded cardinality from typos or abuse) and self-documenting: this
// list *is* the record of which real interactions this app has ever
// bothered to measure. Add a name here deliberately when a new feature
// ships, not implicitly by accepting whatever the client sends.
const KNOWN_EVENTS = new Set([
  "tab_view",
  "map_toggled",
  "sort_changed",
  "itinerary_exported",
  "item_undo",
  "autofill_used",
  "language_changed",
  "city_search_used",
  "itinerary_drag_move",
  "trip_edited",
  "booking_link_clicked",
]);

export async function recordEvent(name: string, context?: string): Promise<void> {
  if (!KNOWN_EVENTS.has(name)) {
    throw new BadRequestError(`Unknown event: ${name}`);
  }
  // context is a real, bounded value when present (a city slug, a sort
  // mode, a tab name) -- never free text, so this can't become an
  // accidental place to log something identifying.
  await prisma.analyticsEvent.create({ data: { name, context: context?.slice(0, 100) } });
}

export interface EventSummary {
  name: string;
  count: number;
}

/** Real counts per known event over the requested window -- an honest zero for anything never fired, not an absence. */
export async function summarizeEvents(sinceDays: number): Promise<EventSummary[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["name"],
    where: { createdAt: { gte: since } },
    _count: { name: true },
  });
  const counts = new Map(rows.map((r) => [r.name, r._count.name]));
  return Array.from(KNOWN_EVENTS)
    .map((name) => ({ name, count: counts.get(name) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}
