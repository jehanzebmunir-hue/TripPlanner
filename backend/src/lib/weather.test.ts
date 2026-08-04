import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn().mockResolvedValue(undefined);

vi.mock("./prisma", () => ({
  prisma: {
    weatherCache: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      upsert: (...a: unknown[]) => upsert(...a),
    },
  },
}));

const fetchWithRetry = vi.fn();
vi.mock("./httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

const CITY = { slug: "paris", name: "Paris, France", country: "FR", lat: 48.8566, lng: 2.3522 };
const NOW = new Date("2026-08-03T12:00:00.000Z");

function forecastResponse(highs: number[], lows: number[], rainChances: number[]): Response {
  return new Response(
    JSON.stringify({
      daily: { temperature_2m_max: highs, temperature_2m_min: lows, precipitation_probability_max: rainChances },
    }),
    { status: 200 }
  );
}

function archiveResponse(highs: number[], lows: number[], precipMm: number[]): Response {
  return new Response(
    JSON.stringify({ daily: { temperature_2m_max: highs, temperature_2m_min: lows, precipitation_sum: precipMm } }),
    { status: 200 }
  );
}

describe("getWeatherSummary", () => {
  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockClear();
    fetchWithRetry.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses a real forecast when the trip falls within the forecast window, and caches it", async () => {
    findUnique.mockResolvedValue(null);
    fetchWithRetry.mockResolvedValue(forecastResponse([30, 32], [20, 22], [10, 20]));
    const { getWeatherSummary } = await import("./weather");

    const summary = await getWeatherSummary(CITY, new Date("2026-08-05"), new Date("2026-08-06"));

    expect(summary).toEqual({ source: "forecast", avgHighC: 31, avgLowC: 21, rainChancePercent: 15 });
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
    expect(fetchWithRetry.mock.calls[0][0]).toContain("api.open-meteo.com/v1/forecast");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ source: "forecast", avgHighC: 31, avgLowC: 21 }) })
    );
  });

  it("falls back to a real historical average when the trip is beyond the forecast window", async () => {
    findUnique.mockResolvedValue(null);
    // 5 years of archive calls, one per HISTORICAL_YEARS_BACK -- same simple
    // 2-day shape each year so the average is easy to hand-verify. A fresh
    // Response per call, since a real body can only be read once and
    // mockResolvedValue would otherwise hand back the same instance 5 times.
    fetchWithRetry.mockImplementation(async () => archiveResponse([20, 22], [10, 12], [0, 2]));
    const { getWeatherSummary } = await import("./weather");

    const summary = await getWeatherSummary(CITY, new Date("2027-06-01"), new Date("2027-06-02"));

    expect(summary?.source).toBe("historical-average");
    expect(summary?.avgHighC).toBe(21);
    expect(summary?.avgLowC).toBe(11);
    expect(summary?.rainChancePercent).toBe(50); // 1 of every 2 days had >= 1mm, across all 5 years
    expect(fetchWithRetry).toHaveBeenCalledTimes(5);
    expect(fetchWithRetry.mock.calls[0][0]).toContain("archive-api.open-meteo.com");
  });

  it("shifts each year of the historical lookback independently, correctly handling a range spanning a calendar year boundary", async () => {
    findUnique.mockResolvedValue(null);
    fetchWithRetry.mockImplementation(async () => archiveResponse([10], [5], [0]));
    const { getWeatherSummary } = await import("./weather");

    await getWeatherSummary(CITY, new Date("2027-12-29"), new Date("2028-01-02"));

    const firstCallUrl = new URL(fetchWithRetry.mock.calls[0][0] as string);
    expect(firstCallUrl.searchParams.get("start_date")).toBe("2026-12-29");
    expect(firstCallUrl.searchParams.get("end_date")).toBe("2027-01-02");
  });

  it("skips a single failed year without failing the whole historical average", async () => {
    findUnique.mockResolvedValue(null);
    fetchWithRetry
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(archiveResponse([20], [10], [0]))
      .mockResolvedValueOnce(archiveResponse([20], [10], [0]))
      .mockResolvedValueOnce(archiveResponse([20], [10], [0]))
      .mockResolvedValueOnce(archiveResponse([20], [10], [0]));
    const { getWeatherSummary } = await import("./weather");

    const summary = await getWeatherSummary(CITY, new Date("2027-06-01"), new Date("2027-06-01"));

    expect(summary?.avgHighC).toBe(20); // only the 4 successful years counted, not a failure
    expect(fetchWithRetry).toHaveBeenCalledTimes(5);
  });

  it("returns a fresh cached value without a live call", async () => {
    findUnique.mockResolvedValue({
      citySlug: "paris",
      startDate: "2026-08-05",
      endDate: "2026-08-06",
      source: "forecast",
      avgHighC: 30,
      avgLowC: 20,
      rainChancePercent: 10,
      fetchedAt: new Date("2026-08-03T10:00:00.000Z"), // 2h old, well under the 6h forecast TTL
    });
    const { getWeatherSummary } = await import("./weather");

    const summary = await getWeatherSummary(CITY, new Date("2026-08-05"), new Date("2026-08-06"));

    expect(summary).toEqual({ source: "forecast", avgHighC: 30, avgLowC: 20, rainChancePercent: 10 });
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });

  it("re-fetches when the cached forecast is older than its real refresh window", async () => {
    findUnique.mockResolvedValue({
      citySlug: "paris",
      startDate: "2026-08-05",
      endDate: "2026-08-06",
      source: "forecast",
      avgHighC: 30,
      avgLowC: 20,
      rainChancePercent: 10,
      fetchedAt: new Date("2026-08-03T00:00:00.000Z"), // 12h old, past the 6h forecast TTL
    });
    fetchWithRetry.mockResolvedValue(forecastResponse([25], [15], [5]));
    const { getWeatherSummary } = await import("./weather");

    const summary = await getWeatherSummary(CITY, new Date("2026-08-05"), new Date("2026-08-06"));

    expect(summary?.avgHighC).toBe(25);
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
  });

  it("falls back to a stale cache rather than returning nothing when a live re-fetch fails", async () => {
    findUnique.mockResolvedValue({
      citySlug: "paris",
      startDate: "2026-08-05",
      endDate: "2026-08-06",
      source: "forecast",
      avgHighC: 30,
      avgLowC: 20,
      rainChancePercent: 10,
      fetchedAt: new Date("2026-08-03T00:00:00.000Z"),
    });
    fetchWithRetry.mockResolvedValue(new Response(null, { status: 500 }));
    const { getWeatherSummary } = await import("./weather");

    const summary = await getWeatherSummary(CITY, new Date("2026-08-05"), new Date("2026-08-06"));

    expect(summary).toEqual({ source: "forecast", avgHighC: 30, avgLowC: 20, rainChancePercent: 10 });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns null, not a guess, when there's no cache and the live request fails", async () => {
    findUnique.mockResolvedValue(null);
    fetchWithRetry.mockResolvedValue(new Response(null, { status: 500 }));
    const { getWeatherSummary } = await import("./weather");

    expect(await getWeatherSummary(CITY, new Date("2026-08-05"), new Date("2026-08-06"))).toBeNull();
  });
});
