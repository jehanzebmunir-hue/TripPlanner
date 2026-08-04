import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithRetry = vi.fn();
vi.mock("../lib/httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

const withinDailyBudget = vi.fn();
vi.mock("../lib/rateLimiter", () => ({ withinDailyBudget: (...a: unknown[]) => withinDailyBudget(...a) }));

const CITY = { slug: "nyc", name: "New York, NY", country: "US", lat: 40.7128, lng: -74.006, ticketmasterMarket: "New York" };

function response(events: unknown[]): Response {
  return new Response(JSON.stringify({ _embedded: { events } }), { status: 200 });
}

describe("ticketmasterAdapter", () => {
  const originalKey = process.env.TICKETMASTER_API_KEY;

  beforeEach(() => {
    fetchWithRetry.mockReset();
    withinDailyBudget.mockReset().mockResolvedValue(true);
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

    expect(records![0].priceAmount).toBe(45.5);
  });

  it("leaves priceAmount undefined rather than guessing when the API doesn't provide pricing", async () => {
    fetchWithRetry.mockResolvedValue(response([{ id: "e2", name: "TBD event" }]));
    const { ticketmasterAdapter } = await import("./ticketmaster");

    const records = await ticketmasterAdapter.run(CITY);

    expect(records![0].priceAmount).toBeUndefined();
  });

  it("returns null (not attempted) without an API key, never reaching the network", async () => {
    delete process.env.TICKETMASTER_API_KEY;
    const { ticketmasterAdapter } = await import("./ticketmaster");

    const records = await ticketmasterAdapter.run(CITY);

    expect(records).toBeNull();
    expect(fetchWithRetry).not.toHaveBeenCalled();
    expect(withinDailyBudget).not.toHaveBeenCalled();
  });

  it("checks the real daily budget before calling the API, and skips once exhausted", async () => {
    withinDailyBudget.mockResolvedValue(false);
    const { ticketmasterAdapter } = await import("./ticketmaster");

    const records = await ticketmasterAdapter.run(CITY);

    expect(records).toEqual([]);
    expect(withinDailyBudget).toHaveBeenCalledWith("ticketmaster", expect.any(Number));
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });

  it("respects TICKETMASTER_MAX_CALLS_PER_DAY when set", async () => {
    process.env.TICKETMASTER_MAX_CALLS_PER_DAY = "10";
    withinDailyBudget.mockResolvedValue(false);
    const { ticketmasterAdapter } = await import("./ticketmaster");

    await ticketmasterAdapter.run(CITY);

    expect(withinDailyBudget).toHaveBeenCalledWith("ticketmaster", 10);
    delete process.env.TICKETMASTER_MAX_CALLS_PER_DAY;
  });
});
