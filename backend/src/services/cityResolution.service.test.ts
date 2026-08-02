import { beforeEach, describe, expect, it, vi } from "vitest";

const resolvedCityFindMany = vi.fn();
const resolvedCityFindUnique = vi.fn();
const resolvedCityUpsert = vi.fn();
const geocodePlace = vi.fn();

vi.mock("../lib/prisma", () => ({
  prisma: {
    resolvedCity: {
      findMany: (...a: unknown[]) => resolvedCityFindMany(...a),
      findUnique: (...a: unknown[]) => resolvedCityFindUnique(...a),
      upsert: (...a: unknown[]) => resolvedCityUpsert(...a),
    },
  },
}));

vi.mock("../lib/nominatim", () => ({ geocodePlace: (...a: unknown[]) => geocodePlace(...a) }));

vi.mock("../config/cities", () => ({
  CITIES: [
    { slug: "paris", name: "Paris, France", country: "FR", lat: 48.85, lng: 2.35 },
    { slug: "nyc", name: "New York, NY", country: "US", lat: 40.71, lng: -74.0 },
  ],
}));

describe("searchCities", () => {
  beforeEach(() => {
    resolvedCityFindMany.mockReset().mockResolvedValue([]);
    resolvedCityFindUnique.mockReset();
    resolvedCityUpsert.mockReset();
    geocodePlace.mockReset().mockResolvedValue([]);
  });

  it("returns [] for a too-short query without touching the database or Nominatim", async () => {
    const { searchCities } = await import("./cityResolution.service");

    expect(await searchCities("p")).toEqual([]);
    expect(resolvedCityFindMany).not.toHaveBeenCalled();
    expect(geocodePlace).not.toHaveBeenCalled();
  });

  it("matches the curated registry by name, case-insensitively, tagged as curated", async () => {
    const { searchCities } = await import("./cityResolution.service");

    const results = await searchCities("paris");

    expect(results).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: "paris", dataSource: "curated" })])
    );
    expect(geocodePlace).not.toHaveBeenCalled();
  });

  it("skips a live Nominatim call once the registry or cache already has any real match", async () => {
    resolvedCityFindMany.mockResolvedValue([
      { slug: "paris-tx", name: "Paris, Texas", country: "US", lat: 1, lng: 1, timezone: "UTC", currency: "USD" },
    ]);
    const { searchCities } = await import("./cityResolution.service");

    const results = await searchCities("paris");

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "paris", dataSource: "curated" }),
        expect.objectContaining({ slug: "paris-tx", dataSource: "community" }),
      ])
    );
    expect(geocodePlace).not.toHaveBeenCalled();
  });

  it("falls through to live Nominatim geocoding when curated+cached find nothing at all, and caches the real result", async () => {
    geocodePlace.mockResolvedValue([{ name: "Hallstatt", countryCode: "AT", lat: 47.53, lng: 13.64 }]);
    resolvedCityUpsert.mockResolvedValue({
      slug: "hallstatt-at",
      name: "Hallstatt, Austria",
      country: "AT",
      lat: 47.53,
      lng: 13.64,
      timezone: "Europe/Vienna",
      currency: "EUR",
    });
    const { searchCities } = await import("./cityResolution.service");

    const results = await searchCities("Hallstatt");

    expect(geocodePlace).toHaveBeenCalledWith("Hallstatt");
    expect(resolvedCityUpsert).toHaveBeenCalledTimes(1);
    const call = resolvedCityUpsert.mock.calls[0][0];
    expect(call.create.slug).toBe("hallstatt-at");
    expect(call.create.country).toBe("AT");
    // The raw query is cached as a lowercased alias -- load-bearing for a
    // real bug caught live: Nominatim's "name" is the local name (e.g. it
    // returns "Brugge" for a search of "Bruges"), so a repeat search for
    // the exact query that found this row must still match it even when
    // the query isn't a substring of the place's own name.
    expect(call.create.aliases).toEqual(["hallstatt"]);
    expect(results).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: "hallstatt-at", dataSource: "community" })])
    );
  });

  it("finds a cached row by the exact alias it was found under, even when that query isn't a substring of its real (local) name", async () => {
    resolvedCityFindMany.mockResolvedValue([
      { slug: "brugge-be", name: "Brugge, Belgium", country: "BE", lat: 1, lng: 1, timezone: "UTC", currency: "EUR", aliases: ["bruges"] },
    ]);
    const { searchCities } = await import("./cityResolution.service");

    const results = await searchCities("Bruges");

    expect(geocodePlace).not.toHaveBeenCalled();
    expect(results).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: "brugge-be", dataSource: "community" })])
    );
  });

  it("disambiguates two distinct real places that share a name and country using region", async () => {
    geocodePlace.mockResolvedValue([
      { name: "Springfield", region: "Illinois", countryCode: "US", lat: 1, lng: 1 },
      { name: "Springfield", region: "Missouri", countryCode: "US", lat: 2, lng: 2 },
    ]);
    resolvedCityUpsert.mockImplementation(({ create }) => Promise.resolve(create));
    const { searchCities } = await import("./cityResolution.service");

    await searchCities("Springfield");

    const slugs = resolvedCityUpsert.mock.calls.map((c) => c[0].create.slug);
    expect(new Set(slugs).size).toBe(2); // not collapsed onto one cached row
  });

});

describe("resolveCity", () => {
  beforeEach(() => {
    resolvedCityFindUnique.mockReset();
  });

  it("returns undefined for a slug that was never resolved", async () => {
    resolvedCityFindUnique.mockResolvedValue(null);
    const { resolveCity } = await import("./cityResolution.service");

    expect(await resolveCity("nowhere")).toBeUndefined();
  });

  it("maps a cached row into a CityConfig marked resolved: true", async () => {
    resolvedCityFindUnique.mockResolvedValue({
      slug: "hallstatt-at",
      name: "Hallstatt, Austria",
      country: "AT",
      lat: 47.53,
      lng: 13.64,
      timezone: "Europe/Vienna",
      currency: "EUR",
    });
    const { resolveCity } = await import("./cityResolution.service");

    const city = await resolveCity("hallstatt-at");

    expect(city).toEqual({ slug: "hallstatt-at", name: "Hallstatt, Austria", country: "AT", lat: 47.53, lng: 13.64, resolved: true });
  });
});

describe("listAllCities", () => {
  it("merges the curated registry with every resolved city", async () => {
    resolvedCityFindMany.mockResolvedValue([
      { slug: "hallstatt-at", name: "Hallstatt, Austria", country: "AT", lat: 47.53, lng: 13.64, timezone: "Europe/Vienna", currency: "EUR" },
    ]);
    const { listAllCities } = await import("./cityResolution.service");

    const all = await listAllCities();

    expect(all.find((c) => c.slug === "paris")?.dataSource).toBe("curated");
    expect(all.find((c) => c.slug === "hallstatt-at")?.dataSource).toBe("community");
  });
});
