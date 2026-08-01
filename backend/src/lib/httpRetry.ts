// Every adapter that calls a live third-party API used to make exactly one
// request and treat any failure — a transient 500, a 429 rate limit, a
// dropped connection — identically to a real "this market has zero events."
// That's the silent-error trap: a temporarily rate-limited Ticketmaster call
// looked exactly like a city with no events. This wraps those calls with a
// bounded retry so a transient failure has a real chance to recover before
// the adapter gives up and ingestion.service.ts marks it `ok: false`.
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayForAttempt(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  }
  // Exponential backoff with jitter: 300ms, 600ms, 1200ms (+/- up to 100ms).
  const base = BASE_DELAY_MS * 2 ** (attempt - 1);
  return base + Math.random() * 100;
}

/**
 * fetch() with retry-on-429/5xx. Non-retryable failures (4xx other than 429,
 * or a successful response) return immediately on the first attempt — this
 * only spends retries on failures that have a real chance of succeeding on
 * a second try.
 */
export async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastResponse: Response | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || !RETRYABLE_STATUS.has(res.status)) return res;
      lastResponse = res;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(delayForAttempt(attempt, res.headers.get("retry-after")));
      }
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(delayForAttempt(attempt, null));
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError;
}
