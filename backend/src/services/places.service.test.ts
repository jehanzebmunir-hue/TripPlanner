import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn().mockResolvedValue([]);
const update = vi.fn();
const confirmationCreate = vi.fn().mockResolvedValue(undefined);

vi.mock("../lib/prisma", () => ({
  prisma: {
    place: {
      findMany: (...args: unknown[]) => findMany(...args),
      update: (...args: unknown[]) => update(...args),
    },
    confirmation: { create: (...args: unknown[]) => confirmationCreate(...args) },
  },
}));

const ensureCityFresh = vi.fn().mockResolvedValue(undefined);
vi.mock("./ingestion.service", () => ({ ensureCityFresh: (...args: unknown[]) => ensureCityFresh(...args) }));

describe("listPlaces", () => {
  beforeEach(() => {
    findMany.mockClear();
    ensureCityFresh.mockClear();
    findMany.mockResolvedValue([]);
  });

  it("triggers ensureCityFresh before querying the database — the on-demand freshness gate", async () => {
    const { listPlaces } = await import("./places.service");

    await listPlaces("nyc");

    expect(ensureCityFresh).toHaveBeenCalledWith("nyc");
    // Ordering matters: the DB read must happen after the freshness check
    // resolves, not in parallel, or a cold city would still return stale
    // (empty) rows on its very first request.
    expect(ensureCityFresh.mock.invocationCallOrder[0]).toBeLessThan(findMany.mock.invocationCallOrder[0]);
  });

  it("still returns results even when ensureCityFresh no-ops (e.g. an unregistered city)", async () => {
    findMany.mockResolvedValue([{ id: "1", tier: "static", lastVerifiedAt: new Date() }]);
    const { listPlaces } = await import("./places.service");

    const result = await listPlaces("nyc");

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("confidence");
  });

  it("passes category/tier filters through to the query", async () => {
    const { listPlaces } = await import("./places.service");

    await listPlaces("nyc", { category: "food", tier: "volatile" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ city: "nyc", category: "food", tier: "volatile" }) })
    );
  });
});
