import { describe, expect, it, vi } from "vitest";

const groupBy = vi.fn();
vi.mock("../lib/prisma", () => ({
  prisma: { place: { groupBy: (...args: unknown[]) => groupBy(...args) } },
}));

describe("recommendDestinations", () => {
  it("ranks cities by the fraction of their real ingested places matching the requested vibe", async () => {
    groupBy.mockResolvedValue([
      { city: "kyoto", category: "sightseeing-culture", _count: { _all: 4 } },
      { city: "kyoto", category: "food-dining", _count: { _all: 1 } },
      { city: "cancun", category: "sightseeing-culture", _count: { _all: 1 } },
      { city: "cancun", category: "outdoor-nature", _count: { _all: 3 } },
    ]);

    const { recommendDestinations } = await import("./destinationRecommender.service");
    const results = await recommendDestinations({ vibeSlug: "culture" });

    expect(results[0].slug).toBe("kyoto"); // 4/5 = 0.8 match ratio, beats cancun's 1/4
    expect(results[0].matchingPlaceCount).toBe(4);
    expect(results[0].totalPlaceCount).toBe(5);
    expect(results.find((r) => r.slug === "cancun")).toBeDefined();
  });

  it("excludes a city entirely once it has zero places for the requested vibe", async () => {
    groupBy.mockResolvedValue([{ city: "uyuni", category: "outdoor-nature", _count: { _all: 1 } }]);

    const { recommendDestinations } = await import("./destinationRecommender.service");
    const results = await recommendDestinations({ vibeSlug: "culture" });

    expect(results.find((r) => r.slug === "uyuni")).toBeUndefined();
  });

  it("excludes cities with nothing ingested at all, even with no vibe filter", async () => {
    groupBy.mockResolvedValue([]);

    const { recommendDestinations } = await import("./destinationRecommender.service");
    const results = await recommendDestinations({});

    expect(results).toEqual([]);
  });

  it("filters by budget tier using the curated travel profile", async () => {
    groupBy.mockResolvedValue([
      { city: "nyc", category: "sightseeing-culture", _count: { _all: 2 } }, // premium
      { city: "bangkok", category: "sightseeing-culture", _count: { _all: 2 } }, // budget
    ]);

    const { recommendDestinations } = await import("./destinationRecommender.service");
    const results = await recommendDestinations({ budgetTier: "budget" });

    expect(results.map((r) => r.slug)).toEqual(["bangkok"]);
  });
});
