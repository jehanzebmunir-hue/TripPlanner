import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithRetry = vi.fn();
vi.mock("../lib/httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

const CITY = { slug: "paris", name: "Paris, France", country: "FR", lat: 48.8589, lng: 2.32 };

function response(elements: unknown[]) {
  return new Response(JSON.stringify({ elements }), { status: 200 });
}

describe("overpassAdapter", () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
  });

  it("skips a city with no coordinates rather than querying (around:8000,0,0)", async () => {
    const { overpassAdapter } = await import("./overpass");

    const records = await overpassAdapter.run({ ...CITY, lat: 0, lng: 0 });

    expect(records).toEqual([]);
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });

  it("queries Overpass with the city's real coordinates via a POST body", async () => {
    fetchWithRetry.mockResolvedValue(response([]));
    const { overpassAdapter } = await import("./overpass");

    await overpassAdapter.run(CITY);

    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
    const [url, init] = fetchWithRetry.mock.calls[0];
    expect(url).toBe("https://overpass-api.de/api/interpreter");
    expect(init.method).toBe("POST");
    expect(decodeURIComponent(init.body)).toContain("48.8589,2.32");
    // Verified live: omitting this makes Overpass start rejecting requests
    // under load (406s), not just a theoretical courtesy — see overpass.ts.
    expect(init.headers["User-Agent"]).toBeTruthy();
  });

  it("queries every tag type with its own per-tag result cap, not one combined cap", async () => {
    fetchWithRetry.mockResolvedValue(response([]));
    const { overpassAdapter } = await import("./overpass");

    await overpassAdapter.run(CITY);

    const body = decodeURIComponent(fetchWithRetry.mock.calls[0][1].body);
    // Real reason this matters: a single combined `out body N` after a union
    // of clauses returns results grouped by clause, so a common tag (e.g.
    // theatres) could crowd out a rarer one (e.g. markets) before the cap is
    // reached — verified live against the real Overpass API while building
    // this. Each tag needs its own `out body` to stay represented.
    ["tourism\"=\"attraction", "leisure\"=\"park", "historic\"=\"monument", "amenity\"=\"theatre", "amenity\"=\"marketplace"].forEach(
      (fragment) => expect(body).toContain(fragment)
    );
    expect(body.match(/out body/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("maps real OSM tags to this app's own category taxonomy, not one flat category for everything", async () => {
    fetchWithRetry.mockResolvedValue(
      response([
        { type: "node", id: 1, lat: 1, lon: 1, tags: { name: "A Park", leisure: "park" } },
        { type: "node", id: 2, lat: 1, lon: 1, tags: { name: "A Theatre", amenity: "theatre" } },
        { type: "node", id: 3, lat: 1, lon: 1, tags: { name: "A Market", amenity: "marketplace" } },
        { type: "node", id: 4, lat: 1, lon: 1, tags: { name: "A Monument", historic: "monument" } },
        { type: "node", id: 5, lat: 1, lon: 1, tags: { name: "A Museum", tourism: "museum" } },
      ])
    );
    const { overpassAdapter } = await import("./overpass");

    const records = await overpassAdapter.run(CITY);

    expect(records.find((r) => r.name === "A Park")?.category).toBe("outdoor-nature");
    expect(records.find((r) => r.name === "A Theatre")?.category).toBe("arts-entertainment-nightlife");
    expect(records.find((r) => r.name === "A Market")?.category).toBe("shopping");
    expect(records.find((r) => r.name === "A Monument")?.category).toBe("sightseeing-culture");
    expect(records.find((r) => r.name === "A Museum")?.category).toBe("sightseeing-culture");
  });

  it("normalizes real elements, keeping only ones with a name and coordinates", async () => {
    fetchWithRetry.mockResolvedValue(
      response([
        { type: "node", id: 1, lat: 48.86, lon: 2.35, tags: { name: "Musée de l'Armée", tourism: "museum" } },
        { type: "node", id: 2, lat: 48.85, lon: 2.34, tags: { tourism: "attraction" } }, // no name
        { type: "node", id: 3, tags: { name: "No coordinates somehow" } }, // no lat/lon
      ])
    );
    const { overpassAdapter } = await import("./overpass");

    const records = await overpassAdapter.run(CITY);

    expect(records).toEqual([
      expect.objectContaining({
        externalId: "node/1",
        name: "Musée de l'Armée",
        category: "sightseeing-culture",
        tier: "static",
        lat: 48.86,
        lng: 2.35,
      }),
    ]);
  });

  it("builds an address from addr:housenumber/street/city when present", async () => {
    fetchWithRetry.mockResolvedValue(
      response([
        {
          type: "node",
          id: 1,
          lat: 48.86,
          lon: 2.35,
          tags: {
            name: "Musée des Arts Décoratifs",
            "addr:housenumber": "107",
            "addr:street": "Rue de Rivoli",
            "addr:city": "Paris",
          },
        },
      ])
    );
    const { overpassAdapter } = await import("./overpass");

    const records = await overpassAdapter.run(CITY);

    expect(records[0].address).toBe("107 Rue de Rivoli, Paris");
  });

  it("never fabricates a price from OSM's free-text fee/charge tags", async () => {
    fetchWithRetry.mockResolvedValue(
      response([{ type: "node", id: 1, lat: 48.86, lon: 2.35, tags: { name: "A place", fee: "10 EUR" } }])
    );
    const { overpassAdapter } = await import("./overpass");

    const records = await overpassAdapter.run(CITY);

    expect(records[0].priceAmount).toBeUndefined();
  });

  it("returns [] rather than throwing when the request fails", async () => {
    fetchWithRetry.mockResolvedValue(new Response(null, { status: 500 }));
    const { overpassAdapter } = await import("./overpass");

    const records = await overpassAdapter.run(CITY);

    expect(records).toEqual([]);
  });
});
