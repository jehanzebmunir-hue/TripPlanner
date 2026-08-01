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
