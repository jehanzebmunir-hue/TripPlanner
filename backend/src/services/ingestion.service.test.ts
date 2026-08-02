import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn().mockResolvedValue(undefined);
const healthUpsert = vi.fn().mockResolvedValue(undefined);
const healthFindMany = vi.fn().mockResolvedValue([]);
const placeFindMany = vi.fn().mockResolvedValue([]);
const resolvedCityFindUnique = vi.fn().mockResolvedValue(null);

vi.mock("../lib/prisma", () => ({
  prisma: {
    place: {
      upsert: (...args: unknown[]) => upsert(...args),
      findMany: (...args: unknown[]) => placeFindMany(...args),
    },
    adapterHealth: {
      upsert: (...args: unknown[]) => healthUpsert(...args),
      findMany: (...args: unknown[]) => healthFindMany(...args),
    },
    resolvedCity: {
      findUnique: (...args: unknown[]) => resolvedCityFindUnique(...args),
    },
  },
}));

vi.mock("../config/cities", () => ({
  CITIES: [],
  getCity: (slug: string) =>
    slug === "testville" ? { slug: "testville", name: "Testville", country: "US" } : undefined,
}));

const workingAdapter = {
  name: "working",
  run: vi.fn().mockResolvedValue([{ externalId: "1", category: "c", tier: "static", name: "Thing", priceAmount: 0 }]),
};
const emptyAdapter = { name: "empty", run: vi.fn().mockResolvedValue([]) };
const brokenAdapter = { name: "broken", run: vi.fn().mockRejectedValue(new Error("upstream 500")) };
const overpassAdapter = { name: "overpass", run: vi.fn().mockResolvedValue([]) };

vi.mock("../adapters", () => ({
  ADAPTERS: { working: workingAdapter, empty: emptyAdapter, broken: brokenAdapter, overpass: overpassAdapter },
  adaptersForCity: (city: { extraAdapters?: string[] }) => [
    "working",
    "empty",
    "broken",
    "overpass",
    ...(city.extraAdapters ?? []),
  ],
}));

describe("ingestCity", () => {
  beforeEach(() => {
    upsert.mockClear();
    healthUpsert.mockClear();
    healthFindMany.mockClear();
    placeFindMany.mockClear();
    placeFindMany.mockResolvedValue([]);
    overpassAdapter.run.mockClear();
    overpassAdapter.run.mockResolvedValue([]);
    resolvedCityFindUnique.mockClear();
    resolvedCityFindUnique.mockResolvedValue(null);
  });

  it("throws on an unknown city rather than silently ingesting nothing", async () => {
    const { ingestCity } = await import("./ingestion.service");
    await expect(ingestCity("nowhere")).rejects.toThrow(/Unknown city/);
  });

  it("falls back to a Nominatim-resolved city when the curated registry doesn't have it", async () => {
    resolvedCityFindUnique.mockResolvedValue({
      slug: "resolvedville",
      name: "Resolvedville, XX",
      country: "XX",
      lat: 1,
      lng: 2,
      timezone: "UTC",
      currency: "USD",
    });
    const { ingestCity } = await import("./ingestion.service");

    const result = await ingestCity("resolvedville");

    expect(resolvedCityFindUnique).toHaveBeenCalledWith({ where: { slug: "resolvedville" } });
    expect(result.working).toEqual({ count: 1, ok: true });
  });

  it("marks a real empty result ok: true, distinct from a thrown error", async () => {
    const { ingestCity } = await import("./ingestion.service");
    const result = await ingestCity("testville");

    expect(result.working).toEqual({ count: 1, ok: true });
    expect(result.empty).toEqual({ count: 0, ok: true });
    expect(result.broken.ok).toBe(false);
    expect(result.broken.count).toBe(0);
    expect(result.broken.error).toMatch(/upstream 500/);
  });

  it("upserts one record per place returned, keyed by city+source+externalId", async () => {
    const { ingestCity } = await import("./ingestion.service");
    await ingestCity("testville");

    expect(upsert).toHaveBeenCalledTimes(1);
    const call = upsert.mock.calls[0][0];
    expect(call.where.city_source_externalId).toEqual({
      city: "testville",
      source: "working",
      externalId: "1",
    });
    // priceAmount: 0 (confirmed free) must survive the upsert distinctly
    // from undefined (not verified) — a falsy-but-real value that's easy
    // to accidentally drop with a naive `r.priceAmount ||` somewhere.
    expect(call.create.priceAmount).toBe(0);
    expect(call.update.priceAmount).toBe(0);
  });

  it("respects an adapter filter, running only the requested adapters", async () => {
    const { ingestCity } = await import("./ingestion.service");
    const result = await ingestCity("testville", ["empty"]);

    expect(Object.keys(result)).toEqual(["empty"]);
  });

  it("records adapter health on both success and failure, keyed by city+adapter", async () => {
    const { ingestCity } = await import("./ingestion.service");
    await ingestCity("testville");

    expect(healthUpsert).toHaveBeenCalledTimes(4); // working, empty, broken, overpass
    const brokenCall = healthUpsert.mock.calls.find(
      (c) => (c[0] as { where: { city_adapter: { adapter: string } } }).where.city_adapter.adapter === "broken"
    )?.[0] as { create: { consecutiveFailures: number; lastError: string } };
    expect(brokenCall.create.consecutiveFailures).toBe(1);
    expect(brokenCall.create.lastError).toMatch(/upstream 500/);

    const workingCall = healthUpsert.mock.calls.find(
      (c) => (c[0] as { where: { city_adapter: { adapter: string } } }).where.city_adapter.adapter === "working"
    )?.[0] as { create: { consecutiveFailures: number; lastSuccessAt: Date | null } };
    expect(workingCall.create.consecutiveFailures).toBe(0);
    expect(workingCall.create.lastSuccessAt).not.toBeNull();
  });

  it("skips an overpass record that's a likely duplicate of an already-existing place, and doesn't upsert it", async () => {
    placeFindMany.mockResolvedValue([{ name: "Manneken Pis", lat: 50.8449, lng: 4.3499 }]);
    overpassAdapter.run.mockResolvedValue([
      { externalId: "osm1", category: "sightseeing-culture", tier: "static", name: "Manneken Pis", lat: 50.84491, lng: 4.34991 },
    ]);
    const { ingestCity } = await import("./ingestion.service");

    const result = await ingestCity("testville", ["overpass"]);

    expect(placeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { city: "testville", source: { not: "overpass" } } })
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(result.overpass).toEqual({ count: 0, ok: true });
  });

  it("still upserts a genuinely distinct overpass record even when other places exist in the city", async () => {
    placeFindMany.mockResolvedValue([{ name: "Manneken Pis", lat: 50.8449, lng: 4.3499 }]);
    overpassAdapter.run.mockResolvedValue([
      { externalId: "osm2", category: "sightseeing-culture", tier: "static", name: "Atomium", lat: 50.8949, lng: 4.3414 },
    ]);
    const { ingestCity } = await import("./ingestion.service");

    const result = await ingestCity("testville", ["overpass"]);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(result.overpass).toEqual({ count: 1, ok: true });
  });

  it("getCityHealth reports degraded: true only for adapters with at least one consecutive failure", async () => {
    healthFindMany.mockResolvedValue([
      { city: "testville", adapter: "ticketmaster", consecutiveFailures: 0, lastError: null, lastSuccessAt: new Date("2026-01-01") },
      { city: "testville", adapter: "seatgeek", consecutiveFailures: 3, lastError: "rate limited", lastSuccessAt: null },
    ]);

    const { getCityHealth } = await import("./ingestion.service");
    const health = await getCityHealth("testville");

    expect(health.find((h) => h.adapter === "ticketmaster")?.degraded).toBe(false);
    expect(health.find((h) => h.adapter === "seatgeek")?.degraded).toBe(true);
  });
});

describe("ensureCityFresh", () => {
  beforeEach(() => {
    upsert.mockClear();
    healthUpsert.mockClear();
    healthFindMany.mockClear();
    placeFindMany.mockClear();
    placeFindMany.mockResolvedValue([]);
    workingAdapter.run.mockClear();
    emptyAdapter.run.mockClear();
    brokenAdapter.run.mockClear();
    overpassAdapter.run.mockClear();
    overpassAdapter.run.mockResolvedValue([]);
    resolvedCityFindUnique.mockClear();
    resolvedCityFindUnique.mockResolvedValue(null);
  });

  it("no-ops for an unregistered, never-resolved city rather than throwing", async () => {
    const { ensureCityFresh } = await import("./ingestion.service");
    await expect(ensureCityFresh("nowhere")).resolves.toBeUndefined();
    expect(healthFindMany).not.toHaveBeenCalled();
  });

  it("fetches a Nominatim-resolved city not in the curated registry", async () => {
    resolvedCityFindUnique.mockResolvedValue({
      slug: "resolvedville",
      name: "Resolvedville, XX",
      country: "XX",
      lat: 1,
      lng: 2,
      timezone: "UTC",
      currency: "USD",
    });
    healthFindMany.mockResolvedValue([]);
    const { ensureCityFresh } = await import("./ingestion.service");

    await ensureCityFresh("resolvedville");

    expect(workingAdapter.run).toHaveBeenCalledTimes(1);
  });

  it("fetches every default adapter for a never-before-ingested city", async () => {
    healthFindMany.mockResolvedValue([]); // no AdapterHealth rows yet
    const { ensureCityFresh } = await import("./ingestion.service");

    await ensureCityFresh("testville");

    expect(workingAdapter.run).toHaveBeenCalledTimes(1);
    expect(emptyAdapter.run).toHaveBeenCalledTimes(1);
    expect(brokenAdapter.run).toHaveBeenCalledTimes(1);
  });

  it("skips adapters that succeeded recently, within their tier's refresh window", async () => {
    const now = new Date();
    healthFindMany.mockResolvedValue([
      { city: "testville", adapter: "working", lastSuccessAt: now },
      { city: "testville", adapter: "empty", lastSuccessAt: now },
      { city: "testville", adapter: "broken", lastSuccessAt: now },
    ]);
    const { ensureCityFresh } = await import("./ingestion.service");

    await ensureCityFresh("testville");

    expect(workingAdapter.run).not.toHaveBeenCalled();
    expect(emptyAdapter.run).not.toHaveBeenCalled();
    expect(brokenAdapter.run).not.toHaveBeenCalled();
  });

  it("re-fetches only the adapter whose refresh window has actually elapsed", async () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    // "working"/"empty"/"broken" all default to the volatile tier (1h) since
    // they're not in ADAPTER_TIER — real adapter names (google-places etc.)
    // are covered by config/adapterCadence.ts directly.
    healthFindMany.mockResolvedValue([
      { city: "testville", adapter: "working", lastSuccessAt: now },
      { city: "testville", adapter: "empty", lastSuccessAt: twoHoursAgo },
      { city: "testville", adapter: "broken", lastSuccessAt: now },
    ]);
    const { ensureCityFresh } = await import("./ingestion.service");

    await ensureCityFresh("testville");

    expect(workingAdapter.run).not.toHaveBeenCalled();
    expect(emptyAdapter.run).toHaveBeenCalledTimes(1);
    expect(brokenAdapter.run).not.toHaveBeenCalled();
  });

  it("collapses concurrent calls for the same city into a single real ingest", async () => {
    healthFindMany.mockResolvedValue([]);
    const { ensureCityFresh } = await import("./ingestion.service");

    await Promise.all([ensureCityFresh("testville"), ensureCityFresh("testville"), ensureCityFresh("testville")]);

    expect(healthFindMany).toHaveBeenCalledTimes(1);
    expect(workingAdapter.run).toHaveBeenCalledTimes(1);
  });

  it("allows a fresh call after a previous one has finished, rather than staying locked forever", async () => {
    healthFindMany.mockResolvedValue([]);
    const { ensureCityFresh } = await import("./ingestion.service");

    await ensureCityFresh("testville");
    await ensureCityFresh("testville");

    expect(healthFindMany).toHaveBeenCalledTimes(2);
  });
});
