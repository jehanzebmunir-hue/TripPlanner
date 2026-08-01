import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn().mockResolvedValue(undefined);

vi.mock("./prisma", () => ({
  prisma: {
    exchangeRateCache: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      upsert: (...a: unknown[]) => upsert(...a),
    },
  },
}));

const fetchWithRetry = vi.fn();
vi.mock("./httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

describe("getExchangeRate", () => {
  const originalUrl = process.env.EXCHANGE_RATE_API_URL;
  const originalKey = process.env.EXCHANGE_RATE_API_KEY;

  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockClear();
    fetchWithRetry.mockReset();
    delete process.env.EXCHANGE_RATE_API_URL;
    delete process.env.EXCHANGE_RATE_API_KEY;
  });

  afterEach(() => {
    process.env.EXCHANGE_RATE_API_URL = originalUrl;
    process.env.EXCHANGE_RATE_API_KEY = originalKey;
  });

  it("short-circuits to 1 for the same currency, without touching the cache or network", async () => {
    const { getExchangeRate } = await import("./exchangeRates");

    const rate = await getExchangeRate("USD", "USD");

    expect(rate).toBe(1);
    expect(findUnique).not.toHaveBeenCalled();
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });

  it("returns a cached rate without calling the network again", async () => {
    findUnique.mockResolvedValue({ fromCurrency: "USD", toCurrency: "EUR", date: "2026-08-01", rate: 0.92 });
    const { getExchangeRate } = await import("./exchangeRates");

    const rate = await getExchangeRate("USD", "EUR");

    expect(rate).toBe(0.92);
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });

  it("returns null, not a guessed rate, when no provider is configured", async () => {
    delete process.env.EXCHANGE_RATE_API_URL;
    findUnique.mockResolvedValue(null);
    const { getExchangeRate } = await import("./exchangeRates");

    const rate = await getExchangeRate("USD", "JPY");

    expect(rate).toBeNull();
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });

  it("fetches, caches, and returns a real rate when a provider is configured", async () => {
    process.env.EXCHANGE_RATE_API_URL = "https://example.com/rates";
    findUnique.mockResolvedValue(null);
    fetchWithRetry.mockResolvedValue(new Response(JSON.stringify({ rate: 149.5 }), { status: 200 }));
    const { getExchangeRate } = await import("./exchangeRates");

    const rate = await getExchangeRate("USD", "JPY");

    expect(rate).toBe(149.5);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ fromCurrency: "USD", toCurrency: "JPY", rate: 149.5 }) })
    );
  });

  it("returns null rather than throwing when the provider request fails", async () => {
    process.env.EXCHANGE_RATE_API_URL = "https://example.com/rates";
    findUnique.mockResolvedValue(null);
    fetchWithRetry.mockResolvedValue(new Response(null, { status: 500 }));
    const { getExchangeRate } = await import("./exchangeRates");

    const rate = await getExchangeRate("USD", "JPY");

    expect(rate).toBeNull();
    expect(upsert).not.toHaveBeenCalled();
  });

  describe("with an exchangerate-api.com key (no URL set)", () => {
    it("calls the real v6 pair endpoint and caches conversion_rate", async () => {
      process.env.EXCHANGE_RATE_API_KEY = "test-key-123";
      findUnique.mockResolvedValue(null);
      fetchWithRetry.mockResolvedValue(
        new Response(JSON.stringify({ result: "success", conversion_rate: 0.8687 }), { status: 200 })
      );
      const { getExchangeRate } = await import("./exchangeRates");

      const rate = await getExchangeRate("USD", "EUR");

      expect(rate).toBe(0.8687);
      expect(fetchWithRetry).toHaveBeenCalledWith("https://v6.exchangerate-api.com/v6/test-key-123/pair/USD/EUR");
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ fromCurrency: "USD", toCurrency: "EUR", rate: 0.8687 }) })
      );
    });

    it("returns null when the API responds but result isn't success", async () => {
      process.env.EXCHANGE_RATE_API_KEY = "test-key-123";
      findUnique.mockResolvedValue(null);
      fetchWithRetry.mockResolvedValue(new Response(JSON.stringify({ result: "error" }), { status: 200 }));
      const { getExchangeRate } = await import("./exchangeRates");

      expect(await getExchangeRate("USD", "EUR")).toBeNull();
    });

    it("prefers the generic webhook when both EXCHANGE_RATE_API_URL and _KEY are set", async () => {
      process.env.EXCHANGE_RATE_API_KEY = "test-key-123";
      process.env.EXCHANGE_RATE_API_URL = "https://example.com/rates";
      findUnique.mockResolvedValue(null);
      fetchWithRetry.mockResolvedValue(new Response(JSON.stringify({ rate: 1.5 }), { status: 200 }));
      const { getExchangeRate } = await import("./exchangeRates");

      await getExchangeRate("USD", "EUR");

      expect(fetchWithRetry).toHaveBeenCalledWith(
        "https://example.com/rates?from=USD&to=EUR",
        expect.anything()
      );
    });
  });
});
