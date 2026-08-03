import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithRetry = vi.fn();
vi.mock("../lib/httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

const CITY = { slug: "nyc", name: "New York, NY", country: "US", lat: 40.7128, lng: -74.006, seatgeekVenueCity: "New York" };

function response(events: unknown[]): Response {
  return new Response(JSON.stringify({ events }), { status: 200 });
}

describe("seatgeekAdapter", () => {
  const originalId = process.env.SEATGEEK_CLIENT_ID;

  beforeEach(() => {
    fetchWithRetry.mockReset();
    process.env.SEATGEEK_CLIENT_ID = "test-id";
  });

  afterEach(() => {
    process.env.SEATGEEK_CLIENT_ID = originalId;
  });

  it("extracts the real stats.lowest_price as priceAmount when the API provides it", async () => {
    fetchWithRetry.mockResolvedValue(response([{ id: 1, title: "Concert", stats: { lowest_price: 62 } }]));
    const { seatgeekAdapter } = await import("./seatgeek");

    const records = await seatgeekAdapter.run(CITY);

    expect(records![0].priceAmount).toBe(62);
  });

  it("leaves priceAmount undefined rather than guessing when there are no priced listings", async () => {
    fetchWithRetry.mockResolvedValue(response([{ id: 2, title: "No listings yet" }]));
    const { seatgeekAdapter } = await import("./seatgeek");

    const records = await seatgeekAdapter.run(CITY);

    expect(records![0].priceAmount).toBeUndefined();
  });

  it("returns null (not attempted) without a client ID, never reaching the network", async () => {
    delete process.env.SEATGEEK_CLIENT_ID;
    const { seatgeekAdapter } = await import("./seatgeek");

    const records = await seatgeekAdapter.run(CITY);

    expect(records).toBeNull();
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });
});
