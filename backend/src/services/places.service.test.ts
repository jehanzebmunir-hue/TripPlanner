import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn().mockResolvedValue([]);
const update = vi.fn();
const confirmationCreate = vi.fn().mockResolvedValue(undefined);
const confirmationFindMany = vi.fn().mockResolvedValue([]);

vi.mock("../lib/prisma", () => ({
  prisma: {
    place: {
      findMany: (...args: unknown[]) => findMany(...args),
      update: (...args: unknown[]) => update(...args),
    },
    confirmation: {
      create: (...args: unknown[]) => confirmationCreate(...args),
      findMany: (...args: unknown[]) => confirmationFindMany(...args),
    },
  },
}));

const ensureCityFresh = vi.fn().mockResolvedValue(undefined);
vi.mock("./ingestion.service", () => ({ ensureCityFresh: (...args: unknown[]) => ensureCityFresh(...args) }));

describe("listPlaces", () => {
  beforeEach(() => {
    findMany.mockClear();
    ensureCityFresh.mockClear();
    findMany.mockResolvedValue([]);
    confirmationFindMany.mockReset().mockResolvedValue([]);
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

  it("reports recentConfirmations: 0 for a place with no real confirmation rows, not a guess", async () => {
    findMany.mockResolvedValue([{ id: "1", tier: "static", lastVerifiedAt: new Date() }]);
    confirmationFindMany.mockResolvedValue([]);
    const { listPlaces } = await import("./places.service");

    const [place] = await listPlaces("nyc");

    expect(place.recentConfirmations).toBe(0);
  });

  it("counts only this city's own real, recent 'valid' confirmation rows per place", async () => {
    findMany.mockResolvedValue([
      { id: "1", tier: "static", lastVerifiedAt: new Date() },
      { id: "2", tier: "static", lastVerifiedAt: new Date() },
    ]);
    confirmationFindMany.mockResolvedValue([{ placeId: "1" }, { placeId: "1" }, { placeId: "2" }]);
    const { listPlaces } = await import("./places.service");

    const places = await listPlaces("nyc");

    expect(places.find((p) => p.id === "1")?.recentConfirmations).toBe(2);
    expect(places.find((p) => p.id === "2")?.recentConfirmations).toBe(1);
    expect(confirmationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ placeId: { in: ["1", "2"] }, vote: "valid" }),
      })
    );
  });

  it("skips the confirmation query entirely for an empty place list, rather than an unnecessary real query", async () => {
    findMany.mockResolvedValue([]);
    const { listPlaces } = await import("./places.service");

    await listPlaces("nyc");

    expect(confirmationFindMany).not.toHaveBeenCalled();
  });
});

describe("confirmPlace", () => {
  beforeEach(() => {
    confirmationCreate.mockClear().mockResolvedValue(undefined);
    confirmationFindMany.mockReset().mockResolvedValue([]);
    update.mockReset().mockResolvedValue({ id: "1", tier: "static", lastVerifiedAt: new Date() });
  });

  it("records the real vote and reports the place's own updated recentConfirmations count", async () => {
    confirmationFindMany.mockResolvedValue([{ placeId: "1" }, { placeId: "1" }]);
    const { confirmPlace } = await import("./places.service");

    const result = await confirmPlace("1", "valid");

    expect(confirmationCreate).toHaveBeenCalledWith({ data: { placeId: "1", vote: "valid" } });
    expect(confirmationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ placeId: { in: ["1"] }, vote: "valid" }) })
    );
    expect(result.recentConfirmations).toBe(2);
  });

  it("backdates lastVerifiedAt on an 'invalid' vote, pushing the place toward staleness rather than leaving it looking fresh", async () => {
    const { confirmPlace } = await import("./places.service");

    await confirmPlace("1", "invalid");

    const call = update.mock.calls[0][0];
    const daysBackdated = (Date.now() - call.data.lastVerifiedAt.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysBackdated).toBeCloseTo(60, 0);
  });
});
