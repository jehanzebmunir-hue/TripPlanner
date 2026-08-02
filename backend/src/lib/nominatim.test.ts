import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithRetry = vi.fn();
vi.mock("./httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

function response(results: unknown[]) {
  return new Response(JSON.stringify(results), { status: 200 });
}

describe("geocodePlace", () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
  });

  it("queries Nominatim with a real, identifying User-Agent", async () => {
    fetchWithRetry.mockResolvedValue(response([]));
    const { geocodePlace } = await import("./nominatim");

    await geocodePlace("Hallstatt");

    const [url, init] = fetchWithRetry.mock.calls[0];
    expect(url).toContain("nominatim.openstreetmap.org/search");
    expect(url).toContain("q=Hallstatt");
    // Verified live: Nominatim's usage policy requires this for well-behaved
    // clients, same lesson already learned with Overpass.
    expect(init.headers["User-Agent"]).toBeTruthy();
  });

  it("keeps only results Nominatim resolved to an actual settlement, not a bare street or country match", async () => {
    fetchWithRetry.mockResolvedValue(
      response([
        { lat: "47.53", lon: "13.64", name: "Hallstatt", address: { city: "Hallstatt", country_code: "at" } },
        { lat: "48.2", lon: "16.37", name: "Some Street", address: { country_code: "at" } }, // no settlement level
      ])
    );
    const { geocodePlace } = await import("./nominatim");

    const results = await geocodePlace("Hallstatt");

    expect(results).toEqual([{ name: "Hallstatt", countryCode: "AT", lat: 47.53, lng: 13.64 }]);
  });

  it("uppercases the country code and includes a state/county region when Nominatim provides one", async () => {
    fetchWithRetry.mockResolvedValue(
      response([{ lat: "39.8", lon: "-89.6", name: "Springfield", address: { city: "Springfield", state: "Illinois", country_code: "us" } }])
    );
    const { geocodePlace } = await import("./nominatim");

    const results = await geocodePlace("Springfield");

    expect(results).toEqual([{ name: "Springfield", region: "Illinois", countryCode: "US", lat: 39.8, lng: -89.6 }]);
  });

  it("returns [] rather than throwing when the request fails", async () => {
    fetchWithRetry.mockResolvedValue(new Response(null, { status: 503 }));
    const { geocodePlace } = await import("./nominatim");

    expect(await geocodePlace("anywhere")).toEqual([]);
  });

  it("throttles consecutive calls to at most ~1 per second, respecting Nominatim's usage policy", async () => {
    vi.useFakeTimers();
    // A fresh module instance -- the throttle's last-call timestamp is
    // internal module state, not a mock, so it isn't reset by
    // fetchWithRetry.mockReset() and would otherwise leak real wall-clock
    // timing from whichever test ran immediately before this one.
    vi.resetModules();
    fetchWithRetry.mockImplementation(() => Promise.resolve(response([]))); // a fresh Response per call -- body can only be read once
    const { geocodePlace } = await import("./nominatim");

    const first = geocodePlace("a");
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);

    const second = geocodePlace("b");
    await vi.advanceTimersByTimeAsync(0);
    // Second call must wait for the throttle interval, not fire immediately.
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1100);
    expect(fetchWithRetry).toHaveBeenCalledTimes(2);

    await Promise.all([first, second]);
    vi.useRealTimers();
  });
});
