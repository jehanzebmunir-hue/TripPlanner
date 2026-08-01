import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const withinDailyBudget = vi.fn();
vi.mock("../lib/rateLimiter", () => ({ withinDailyBudget: (...a: unknown[]) => withinDailyBudget(...a) }));

const fetchWithRetry = vi.fn();
vi.mock("../lib/httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

const CITY = { slug: "nyc", name: "New York, NY", country: "US", lat: 40.7128, lng: -74.006 };

describe("googlePlacesAdapter", () => {
  const originalKey = process.env.GOOGLE_PLACES_API_KEY;

  beforeEach(() => {
    withinDailyBudget.mockReset();
    fetchWithRetry.mockReset();
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = originalKey;
  });

  it("never calls the API at all without a key, regardless of budget", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const { googlePlacesAdapter } = await import("./googlePlaces");

    const records = await googlePlacesAdapter.run(CITY);

    expect(records).toEqual([]);
    expect(withinDailyBudget).not.toHaveBeenCalled();
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });

  it("checks the budget before calling the API, and skips the call once exhausted", async () => {
    withinDailyBudget.mockResolvedValue(false);
    const { googlePlacesAdapter } = await import("./googlePlaces");

    const records = await googlePlacesAdapter.run(CITY);

    expect(records).toEqual([]);
    expect(withinDailyBudget).toHaveBeenCalledWith("google-places", expect.any(Number));
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });

  it("makes the real call once budget allows it", async () => {
    withinDailyBudget.mockResolvedValue(true);
    fetchWithRetry.mockResolvedValue(
      new Response(JSON.stringify({ places: [{ id: "p1", displayName: { text: "A Place" } }] }), { status: 200 })
    );
    const { googlePlacesAdapter } = await import("./googlePlaces");

    const records = await googlePlacesAdapter.run(CITY);

    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
    expect(records).toEqual([
      expect.objectContaining({ externalId: "p1", name: "A Place", category: "sightseeing-culture" }),
    ]);
  });

  it("respects GOOGLE_PLACES_MAX_CALLS_PER_DAY when set", async () => {
    process.env.GOOGLE_PLACES_MAX_CALLS_PER_DAY = "5";
    withinDailyBudget.mockResolvedValue(false);
    const { googlePlacesAdapter } = await import("./googlePlaces");

    await googlePlacesAdapter.run(CITY);

    expect(withinDailyBudget).toHaveBeenCalledWith("google-places", 5);
    delete process.env.GOOGLE_PLACES_MAX_CALLS_PER_DAY;
  });
});
