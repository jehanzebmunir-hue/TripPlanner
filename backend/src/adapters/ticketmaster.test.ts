import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithRetry = vi.fn();
vi.mock("../lib/httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

const CITY = { slug: "nyc", name: "New York, NY", country: "US", ticketmasterMarket: "New York" };

function response(events: unknown[]): Response {
  return new Response(JSON.stringify({ _embedded: { events } }), { status: 200 });
}

describe("ticketmasterAdapter", () => {
  const originalKey = process.env.TICKETMASTER_API_KEY;

  beforeEach(() => {
    fetchWithRetry.mockReset();
    process.env.TICKETMASTER_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.TICKETMASTER_API_KEY = originalKey;
  });

  it("extracts the real priceRanges.min as priceAmount when the API provides it", async () => {
    fetchWithRetry.mockResolvedValue(
      response([{ id: "e1", name: "Show", priceRanges: [{ min: 45.5, max: 120, currency: "USD" }] }])
    );
    const { ticketmasterAdapter } = await import("./ticketmaster");

    const records = await ticketmasterAdapter.run(CITY);

    expect(records[0].priceAmount).toBe(45.5);
  });

  it("leaves priceAmount undefined rather than guessing when the API doesn't provide pricing", async () => {
    fetchWithRetry.mockResolvedValue(response([{ id: "e2", name: "TBD event" }]));
    const { ticketmasterAdapter } = await import("./ticketmaster");

    const records = await ticketmasterAdapter.run(CITY);

    expect(records[0].priceAmount).toBeUndefined();
  });

  it("returns nothing without an API key, never reaching the network", async () => {
    delete process.env.TICKETMASTER_API_KEY;
    const { ticketmasterAdapter } = await import("./ticketmaster");

    const records = await ticketmasterAdapter.run(CITY);

    expect(records).toEqual([]);
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });
});
