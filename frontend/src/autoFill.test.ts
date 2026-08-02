import { describe, expect, it } from "vitest";
import { pickStarterPlaces, starterTargetCount } from "./autoFill";
import { Place } from "./types";

function place(overrides: Partial<Place> & Pick<Place, "id" | "category">): Place {
  return {
    name: overrides.id,
    city: "nyc",
    tier: "static",
    source: "seed",
    lastVerifiedAt: new Date().toISOString(),
    confidence: 90,
    band: "verified",
    daysSince: 1,
    ...overrides,
  };
}

describe("starterTargetCount", () => {
  it("is 3 per real day", () => {
    expect(starterTargetCount(2)).toBe(6);
  });

  it("floors at 3 even for a 1-day trip", () => {
    expect(starterTargetCount(1)).toBe(3);
  });

  it("caps at 15 for a long trip", () => {
    expect(starterTargetCount(20)).toBe(15);
  });
});

describe("pickStarterPlaces", () => {
  it("diversifies across categories round-robin rather than filling from one category first", () => {
    const places = [
      place({ id: "museum1", category: "sightseeing-culture" }),
      place({ id: "museum2", category: "sightseeing-culture" }),
      place({ id: "museum3", category: "sightseeing-culture" }),
      place({ id: "food1", category: "food-dining" }),
      place({ id: "park1", category: "outdoor-nature" }),
    ];

    const picked = pickStarterPlaces(places, 3);

    // Round-robin across 3 categories should pick one from each first, not
    // three museums before ever reaching food or a park.
    expect(picked.map((p) => p.id).sort()).toEqual(["food1", "museum1", "park1"]);
  });

  it("prefers verified places over aging/stale ones within the same category", () => {
    const places = [
      place({ id: "stale1", category: "food-dining", band: "stale", daysSince: 90 }),
      place({ id: "verified1", category: "food-dining", band: "verified", daysSince: 1 }),
      place({ id: "aging1", category: "food-dining", band: "aging", daysSince: 30 }),
    ];

    const picked = pickStarterPlaces(places, 1);

    expect(picked[0].id).toBe("verified1");
  });

  it("excludes places already in the trip", () => {
    const places = [
      place({ id: "already-added", category: "food-dining" }),
      place({ id: "new-one", category: "food-dining" }),
    ];

    const picked = pickStarterPlaces(places, 2, new Set(["already-added"]));

    expect(picked.map((p) => p.id)).toEqual(["new-one"]);
  });

  it("returns fewer than count when there simply aren't enough real places, rather than fabricating entries", () => {
    const places = [place({ id: "only-one", category: "food-dining" })];

    const picked = pickStarterPlaces(places, 10);

    expect(picked).toHaveLength(1);
  });

  it("returns an empty array for an empty candidate list", () => {
    expect(pickStarterPlaces([], 5)).toEqual([]);
  });
});
