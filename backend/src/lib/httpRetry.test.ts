import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "./httpRetry";

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("setTimeout", (fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns immediately on a successful response, no retries", async () => {
    const ok = response(200);
    vi.mocked(fetch).mockResolvedValue(ok);

    const res = await fetchWithRetry("https://example.com");

    expect(res).toBe(ok);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry a non-retryable 4xx (e.g. 404 or 401)", async () => {
    const notFound = response(404);
    vi.mocked(fetch).mockResolvedValue(notFound);

    const res = await fetchWithRetry("https://example.com");

    expect(res).toBe(notFound);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a 429, then returns the eventual success", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(200));

    const res = await fetchWithRetry("https://example.com");

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries a 500 up to the cap, then gives back the last failing response", async () => {
    vi.mocked(fetch).mockResolvedValue(response(500));

    const res = await fetchWithRetry("https://example.com");

    expect(res.status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(3); // MAX_ATTEMPTS
  });

  it("retries a thrown network error and eventually rethrows if it never recovers", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    await expect(fetchWithRetry("https://example.com")).rejects.toThrow("network down");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
