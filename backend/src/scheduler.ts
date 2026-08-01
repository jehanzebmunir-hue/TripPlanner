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

const STRUCTURED_REFRESH_MS = Number(process.env.STRUCTURED_REFRESH_MS ?? 6 * 60 * 60 * 1000); // 6h
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
 *  - Firing all 112 cities' worth of API calls in the same instant on every
 *    server start/restart (a thundering herd against Ticketmaster/SeatGeek/
 *    Google Places, and the fastest way to blow through a metered quota).
 *    Initial runs are spread evenly across one full volatile-refresh window.
 *  - Re-running the static `seed` adapter on a timer at all — it's local
 *    data with no upstream to go stale against, so it only runs once, here,
 *    at startup, rather than occupying a setInterval slot forever.
 */
export function startScheduler(): void {
  CITIES.forEach((city, i) => {
    const staggerFraction = CITIES.length > 0 ? i / CITIES.length : 0;

    ingestCity(city.slug, STATIC_ADAPTERS)
      .then((result) => logOutcome(`${city.slug} (static, once)`, result))
      .catch((err) => console.error(`[scheduler] ${city.slug} (static) failed:`, err));

    runOnInterval(city.slug, STRUCTURED_ADAPTERS, STRUCTURED_REFRESH_MS, staggerFraction * STRUCTURED_REFRESH_MS);

    const cityVolatileAdapters = [...VOLATILE_ADAPTERS, ...(city.extraAdapters ?? [])];
    runOnInterval(city.slug, cityVolatileAdapters, VOLATILE_REFRESH_MS, staggerFraction * VOLATILE_REFRESH_MS);
  });
}
