import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn().mockResolvedValue(undefined);
const healthUpsert = vi.fn().mockResolvedValue(undefined);
const healthFindMany = vi.fn().mockResolvedValue([]);

vi.mock("../lib/prisma", () => ({
  prisma: {
    place: { upsert: (...args: unknown[]) => upsert(...args) },
    adapterHealth: {
      upsert: (...args: unknown[]) => healthUpsert(...args),
      findMany: (...args: unknown[]) => healthFindMany(...args),
    },
  },
}));

vi.mock("../config/cities", () => ({
  getCity: (slug: string) =>
    slug === "testville" ? { slug: "testville", name: "Testville", country: "US" } : undefined,
}));

const workingAdapter = {
  name: "working",
  run: vi.fn().mockResolvedValue([{ externalId: "1", category: "c", tier: "static", name: "Thing", priceAmount: 0 }]),
};
const emptyAdapter = { name: "empty", run: vi.fn().mockResolvedValue([]) };
const brokenAdapter = { name: "broken", run: vi.fn().mockRejectedValue(new Error("upstream 500")) };

vi.mock("../adapters", () => ({
  ADAPTERS: { working: workingAdapter, empty: emptyAdapter, broken: brokenAdapter },
  DEFAULT_ADAPTERS: ["working", "empty", "broken"],
}));

describe("ingestCity", () => {
  beforeEach(() => {
    upsert.mockClear();
    healthUpsert.mockClear();
    healthFindMany.mockClear();
  });

  it("throws on an unknown city rather than silently ingesting nothing", async () => {
    const { ingestCity } = await import("./ingestion.service");
    await expect(ingestCity("nowhere")).rejects.toThrow(/Unknown city/);
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

    expect(healthUpsert).toHaveBeenCalledTimes(3); // working, empty, broken
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
