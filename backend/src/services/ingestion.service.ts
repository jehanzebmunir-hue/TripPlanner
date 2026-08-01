import { prisma } from "../lib/prisma";
import { getCity } from "../config/cities";
import { ADAPTERS, DEFAULT_ADAPTERS } from "../adapters";

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
  const city = getCity(citySlug);
  if (!city) throw new Error(`Unknown city: ${citySlug}`);

  const results: Record<string, AdapterOutcome> = {};
  const allAdapterNames = [...DEFAULT_ADAPTERS, ...(city.extraAdapters ?? [])];
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

    for (const r of records) {
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

    results[adapterName] = { count: records.length, ok: true };
  }

  return results;
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
