import { prisma } from "../lib/prisma";
import { CITIES, getCity } from "../config/cities";
import { ADAPTERS, adaptersForCity } from "../adapters";
import { ADAPTER_TIER, REFRESH_MS } from "../config/adapterCadence";
import { isLikelyDuplicate } from "../lib/dedup";
import { resolveCity } from "./cityResolution.service";
import { CityConfig } from "../types";

// The curated registry is checked first (fast, no DB round-trip) -- a slug
// only ever falls through to resolveCity's DB lookup when it isn't there,
// so every existing registered city keeps its exact current lookup cost.
async function findCity(citySlug: string): Promise<CityConfig | undefined> {
  return getCity(citySlug) ?? (await resolveCity(citySlug));
}

export interface AdapterOutcome {
  count: number;
  // false only means "this adapter threw" — a real request that legitimately
  // returned zero results is still ok: true. Scheduler/monitoring should
  // alert on ok: false, not on count: 0, which is a normal, common outcome
  // (e.g. an unconfirmed-coverage market, or a genuinely quiet week).
  ok: boolean;
  error?: string;
}

async function recordAdapterHealth(city: string, adapter: string, ok: boolean, error?: string): Promise<void> {
  const now = new Date();
  await prisma.adapterHealth.upsert({
    where: { city_adapter: { city, adapter } },
    create: {
      city,
      adapter,
      lastAttemptAt: now,
      lastSuccessAt: ok ? now : null,
      lastError: ok ? null : error,
      consecutiveFailures: ok ? 0 : 1,
    },
    update: ok
      ? { lastAttemptAt: now, lastSuccessAt: now, lastError: null, consecutiveFailures: 0 }
      : { lastAttemptAt: now, lastError: error, consecutiveFailures: { increment: 1 } },
  });
}

export async function ingestCity(
  citySlug: string,
  adapterFilter?: string[]
): Promise<Record<string, AdapterOutcome>> {
  const city = await findCity(citySlug);
  if (!city) throw new Error(`Unknown city: ${citySlug}`);

  const results: Record<string, AdapterOutcome> = {};
  const allAdapterNames = adaptersForCity(city);
  const adapterNames = adapterFilter ? allAdapterNames.filter((n) => adapterFilter.includes(n)) : allAdapterNames;

  for (const adapterName of adapterNames) {
    const adapter = ADAPTERS[adapterName];
    if (!adapter) continue;

    let records;
    try {
      records = await adapter.run(city);
    } catch (err) {
      const message = (err as Error).message;
      console.error(`[ingest] ${adapterName} failed:`, message);
      results[adapterName] = { count: 0, ok: false, error: message };
      await recordAdapterHealth(city.slug, adapterName, false, message);
      continue;
    }
    await recordAdapterHealth(city.slug, adapterName, true);

    // overpass runs alongside google-places for priority-tier cities, and
    // both can independently surface the same real landmark -- confirmed
    // live (Brussels' "Manneken Pis" from both sources, 1m apart). Checked
    // only for overpass (the source added second, and the lower-curation
    // one of the two) against everything already in the DB for this city,
    // not just this run's own records.
    let existingForDedup: { name: string; lat: number | null; lng: number | null }[] = [];
    if (adapterName === "overpass" && records.length > 0) {
      existingForDedup = await prisma.place.findMany({
        where: { city: city.slug, source: { not: "overpass" } },
        select: { name: true, lat: true, lng: true },
      });
    }

    let skippedAsDuplicate = 0;
    for (const r of records) {
      if (existingForDedup.length > 0 && existingForDedup.some((e) => isLikelyDuplicate(e, r))) {
        skippedAsDuplicate++;
        continue;
      }
      const lastVerifiedAt = r.verifiedAt ?? new Date();
      await prisma.place.upsert({
        where: {
          city_source_externalId: { city: city.slug, source: adapterName, externalId: r.externalId },
        },
        create: {
          city: city.slug,
          source: adapterName,
          externalId: r.externalId,
          category: r.category,
          tier: r.tier,
          name: r.name,
          description: r.description,
          lat: r.lat,
          lng: r.lng,
          address: r.address,
          expiryAt: r.expiryAt,
          bookingLabel: r.bookingLabel,
          bookingRef: r.bookingRef,
          priceAmount: r.priceAmount,
          lastVerifiedAt,
        },
        update: {
          category: r.category,
          tier: r.tier,
          name: r.name,
          description: r.description,
          lat: r.lat,
          lng: r.lng,
          address: r.address,
          expiryAt: r.expiryAt,
          bookingLabel: r.bookingLabel,
          bookingRef: r.bookingRef,
          priceAmount: r.priceAmount,
          lastVerifiedAt,
        },
      });
    }

    if (skippedAsDuplicate > 0) {
      console.log(`[ingest] ${city.slug}/overpass: skipped ${skippedAsDuplicate} likely duplicate(s) of existing places`);
    }
    results[adapterName] = { count: records.length - skippedAsDuplicate, ok: true };
  }

  return results;
}

// Per-city in-flight lock so two concurrent requests for the same
// never-before-seen (or simultaneously-stale) city don't both trigger
// duplicate live API calls. A plain in-memory Map is enough for a
// single-instance deployment (Render's free/Starter tiers both run one
// instance) — it would need to move to something shared (e.g. a DB row) if
// this ever ran on more than one instance at once.
const inFlight = new Map<string, Promise<void>>();

/**
 * Ensures a city's data is fresh enough to serve, fetching live only for
 * whichever adapters are actually stale (or have never run) rather than
 * unconditionally re-running everything. This is what makes ingestion
 * demand-driven: called from the read path (places.service.ts) instead of
 * a background scheduler proactively warming the whole city registry
 * regardless of whether anyone's asked for it.
 */
export async function ensureCityFresh(citySlug: string): Promise<void> {
  const city = await findCity(citySlug);
  if (!city) return; // unregistered and never resolved — nothing to fetch, listPlaces will just see no rows

  const existing = inFlight.get(citySlug);
  if (existing) return existing;

  const run = (async () => {
    try {
      const adapterNames = adaptersForCity(city);
      const health = await prisma.adapterHealth.findMany({
        where: { city: citySlug, adapter: { in: adapterNames } },
      });
      const lastSuccessByAdapter = new Map(health.map((h) => [h.adapter, h.lastSuccessAt]));

      const now = Date.now();
      const staleAdapters = adapterNames.filter((name) => {
        const tier = ADAPTER_TIER[name] ?? "volatile";
        const refreshMs = REFRESH_MS[tier];
        const lastSuccessAt = lastSuccessByAdapter.get(name);
        if (!lastSuccessAt) return true; // never succeeded — always worth trying
        if (refreshMs === null) return false; // static tier, already succeeded once
        return now - lastSuccessAt.getTime() >= refreshMs;
      });

      if (staleAdapters.length > 0) {
        await ingestCity(citySlug, staleAdapters);
      }
    } finally {
      inFlight.delete(citySlug);
    }
  })();

  inFlight.set(citySlug, run);
  return run;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pre-warms the verified/major-world-city tier (config/cities.ts's
 * priorityTier) once at server startup. Deliberately small and one-shot —
 * not a return to proactively refreshing the whole registry, just insurance
 * against the first real visitor to a well-known city being the one who
 * pays ensureCityFresh's cold-start latency. Everything outside this tier
 * is ingested purely on demand.
 *
 * Runs strictly sequentially (awaits each city fully before starting the
 * next), not just start-time-staggered — a fire-and-forget setTimeout stagger
 * still lets slow cities overlap once more than one takes longer than the
 * stagger interval, which is exactly what happened testing this live: a
 * 500ms stagger against ~44 cities, each running up to 4 real adapters,
 * built up real concurrent load against Overpass's shared public instance
 * and got requests rejected under it. Sequential is slower in wall-clock
 * time but the only way to actually bound concurrency at 1.
 */
export async function warmPriorityCities(delayBetweenMs = 300): Promise<void> {
  const priorityCities = CITIES.filter((c) => c.priorityTier != null);
  for (const city of priorityCities) {
    try {
      await ensureCityFresh(city.slug);
    } catch (err) {
      console.error(`[warm] ${city.slug} failed:`, err);
    }
    await sleep(delayBetweenMs);
  }
}

export interface AdapterHealthStatus {
  adapter: string;
  degraded: boolean;
  consecutiveFailures: number;
  lastError: string | null;
  lastSuccessAt: string | null;
}

/**
 * Real per-adapter health for a city, for surfacing "data may be temporarily
 * outdated" in the UI — distinct from Place data itself, which can't tell
 * the difference between a dead API and a genuinely quiet market.
 */
export async function getCityHealth(citySlug: string): Promise<AdapterHealthStatus[]> {
  const rows = await prisma.adapterHealth.findMany({ where: { city: citySlug } });
  return rows.map((row) => ({
    adapter: row.adapter,
    degraded: row.consecutiveFailures > 0,
    consecutiveFailures: row.consecutiveFailures,
    lastError: row.lastError,
    lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
  }));
}
