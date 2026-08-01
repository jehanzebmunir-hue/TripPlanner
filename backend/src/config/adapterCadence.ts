// Which refresh tier each adapter belongs to, and how stale AdapterHealth
// must be before ensureCityFresh() (ingestion.service.ts) triggers a live
// re-fetch on read. Replaces the old scheduler.ts's proactive whole-registry
// loop: instead of refreshing every city on a timer regardless of whether
// anyone's looking at it, a city's data is only ever fetched when someone
// actually requests it, capped at these intervals so repeat visits within
// the window are served from the database, not re-fetched every time.
export type AdapterTier = "static" | "structured" | "volatile";

export const ADAPTER_TIER: Record<string, AdapterTier> = {
  seed: "static",
  "google-places": "structured",
  ticketmaster: "volatile",
  seatgeek: "volatile",
  "nyc-open-data-events": "volatile",
  "chicago-park-events": "volatile",
  "paris-events": "volatile",
  "boston-events": "volatile",
};

// null = never auto-refresh once it has succeeded at least once (seed: local
// data, nothing upstream to go stale against).
export const REFRESH_MS: Record<AdapterTier, number | null> = {
  static: null,
  // google-places records are tagged tier "static" (90-day decay) — 24h is
  // still 90x more frequent than necessary, kept conservative on purpose.
  structured: Number(process.env.STRUCTURED_REFRESH_MS ?? 24 * 60 * 60 * 1000),
  volatile: Number(process.env.VOLATILE_REFRESH_MS ?? 60 * 60 * 1000),
};
