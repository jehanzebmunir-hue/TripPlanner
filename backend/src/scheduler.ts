import { CITIES } from "./config/cities";
import { ingestCity } from "./services/ingestion.service";

// Each adapter has a natural refresh cadence — treating them all the same
// (the old flat VOLATILE_REFRESH_MS for every adapter on every city) means a
// metered adapter like google-places gets hit as often as a free events feed,
// and seed data — which only ever changes on deploy — gets re-run on a timer
// for no reason at all. Splitting by adapter lets each group have its own
// interval, and its own env override, without touching call sites elsewhere.
const STATIC_ADAPTERS = ["seed"];
const STRUCTURED_ADAPTERS = ["google-places"];
// Volatile also picks up each city's own extraAdapters (open-data event
// feeds) at ingest time below, since those are volatile too — a NYC permit
// or a Paris listing is exactly the kind of thing that goes stale in hours.
const VOLATILE_ADAPTERS = ["ticketmaster", "seatgeek"];

// google-places records are tagged tier "static" (90-day decay in the
// freshness model) — a 6h refresh was ~360x more frequent than the data
// actually goes stale, and was the real reason the daily call budget kept
// exhausting partway through the city list instead of covering all of them.
// Daily is still 90x more frequent than necessary, kept deliberately
// conservative rather than stretched all the way to the real decay window.
const STRUCTURED_REFRESH_MS = Number(process.env.STRUCTURED_REFRESH_MS ?? 24 * 60 * 60 * 1000); // 24h
const VOLATILE_REFRESH_MS = Number(process.env.VOLATILE_REFRESH_MS ?? 60 * 60 * 1000); // 1h

function logOutcome(label: string, result: Record<string, { count: number; ok: boolean; error?: string }>): void {
  const failed = Object.entries(result).filter(([, o]) => !o.ok);
  if (failed.length > 0) {
    console.error(`[scheduler] ${label} — adapter failures:`, failed.map(([name]) => name).join(", "));
  }
  console.log(`[scheduler] ${label}:`, result);
}

function runOnInterval(citySlug: string, adapters: string[], intervalMs: number, startDelayMs: number): void {
  setTimeout(() => {
    const run = () =>
      ingestCity(citySlug, adapters)
        .then((result) => logOutcome(`${citySlug} (${adapters.join("+")})`, result))
        .catch((err) => console.error(`[scheduler] ${citySlug} (${adapters.join("+")}) failed:`, err));

    run();
    setInterval(run, intervalMs);
  }, startDelayMs);
}

/**
 * Starts background refresh for every configured city. Two things this
 * intentionally avoids:
 *  - Firing all of CITIES' API calls in the same instant on every server
 *    start/restart (a thundering herd against Ticketmaster/SeatGeek/Google
 *    Places, and the fastest way to blow through a metered quota). Initial
 *    runs are spread evenly across one full refresh window per adapter tier.
 *  - Re-running the static `seed` adapter on a timer at all — it's local
 *    data with no upstream to go stale against, so it only runs once, here,
 *    at startup, rather than occupying a setInterval slot forever.
 */
// google-places is the one adapter with a real, easy-to-hit budget ceiling
// (see googlePlaces.ts) — CITIES.length already sits close to that ceiling,
// so if the registry grows further, whichever cities are scheduled first
// each cycle are the ones actually served before the daily cap kicks in.
// Ordering by priorityTier (see config/cities.ts) means that's a deliberate
// choice, not an accident of array order. Ticketmaster/SeatGeek have
// enormous headroom by comparison (~5,000 cities at daily cadence) and
// don't need this — left in registry order.
//
// Honest limit: the daily budget resets on calendar date (see
// lib/rateLimiter.ts), but each city's fire time is fixed relative to
// server start, not to UTC midnight. Priority ordering still holds within
// whichever 24h window a given restart produces — tier 1/2 always fire
// before a majority of tier-3 cities in that window — but it isn't a
// clock-aligned guarantee. A cron-style midnight-aligned scheduler would be
// the real fix if this ever matters in practice; not built since nothing
// today actually exhausts the budget across the whole registry.
const STRUCTURED_ORDER = [...CITIES].sort((a, b) => (a.priorityTier ?? 3) - (b.priorityTier ?? 3));

export function startScheduler(): void {
  CITIES.forEach((city, i) => {
    const staggerFraction = CITIES.length > 0 ? i / CITIES.length : 0;

    ingestCity(city.slug, STATIC_ADAPTERS)
      .then((result) => logOutcome(`${city.slug} (static, once)`, result))
      .catch((err) => console.error(`[scheduler] ${city.slug} (static) failed:`, err));

    const cityVolatileAdapters = [...VOLATILE_ADAPTERS, ...(city.extraAdapters ?? [])];
    runOnInterval(city.slug, cityVolatileAdapters, VOLATILE_REFRESH_MS, staggerFraction * VOLATILE_REFRESH_MS);
  });

  STRUCTURED_ORDER.forEach((city, i) => {
    const staggerFraction = STRUCTURED_ORDER.length > 0 ? i / STRUCTURED_ORDER.length : 0;
    runOnInterval(city.slug, STRUCTURED_ADAPTERS, STRUCTURED_REFRESH_MS, staggerFraction * STRUCTURED_REFRESH_MS);
  });
}
