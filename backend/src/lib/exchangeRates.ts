import { fetchWithRetry } from "./httpRetry";
import { prisma } from "./prisma";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
}

async function fetchFromExchangeRateApiCom(from: string, to: string, apiKey: string): Promise<number | null> {
  // exchangerate-api.com's real v6 API — verified live against the actual
  // endpoint, not assumed: GET /v6/{key}/pair/{from}/{to} returns
  // { result: "success", conversion_rate: number, ... }. A dedicated
  // integration, not the generic contract below, since this is a specific
  // real provider's actual shape.
  const res = await fetchWithRetry(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`);
  if (!res.ok) {
    console.warn(`[exchange-rates] exchangerate-api.com request failed: ${res.status}`);
    return null;
  }
  const body = (await res.json()) as { result?: string; conversion_rate?: number };
  if (body.result !== "success" || body.conversion_rate == null) return null;
  return body.conversion_rate;
}

async function fetchFromGenericWebhook(from: string, to: string, apiUrl: string): Promise<number | null> {
  const res = await fetchWithRetry(`${apiUrl}?from=${from}&to=${to}`, {
    headers: process.env.EXCHANGE_RATE_API_KEY ? { Authorization: `Bearer ${process.env.EXCHANGE_RATE_API_KEY}` } : {},
  });
  if (!res.ok) {
    console.warn(`[exchange-rates] request failed: ${res.status}`);
    return null;
  }
  const body = (await res.json()) as { rate?: number };
  return body.rate ?? null;
}

/**
 * Resolves to exchangerate-api.com's real API when EXCHANGE_RATE_API_KEY is
 * set and EXCHANGE_RATE_API_URL isn't (their key format doesn't need a
 * separate URL — it's embedded in the path). Falls back to the generic
 * `{rate: number}` webhook contract via EXCHANGE_RATE_API_URL for any other
 * provider. With neither configured, returns null rather than a hardcoded
 * or stale-guessed rate — there is no fallback conversion anywhere in this
 * app, on purpose.
 *
 * Real rates are cached per currency pair per UTC day (ExchangeRateCache)
 * so this is at most one live call per pair per day, never one per request.
 */
export async function getExchangeRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;

  const date = todayKey();
  const cached = await prisma.exchangeRateCache.findUnique({
    where: { fromCurrency_toCurrency_date: { fromCurrency: from, toCurrency: to, date } },
  });
  if (cached) return cached.rate;

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  const apiUrl = process.env.EXCHANGE_RATE_API_URL;

  let rate: number | null;
  if (apiKey && !apiUrl) {
    rate = await fetchFromExchangeRateApiCom(from, to, apiKey);
  } else if (apiUrl) {
    rate = await fetchFromGenericWebhook(from, to, apiUrl);
  } else {
    console.warn(`[exchange-rates] no provider configured — no live rate available for ${from}->${to}`);
    return null;
  }

  if (rate == null) return null;

  await prisma.exchangeRateCache.upsert({
    where: { fromCurrency_toCurrency_date: { fromCurrency: from, toCurrency: to, date } },
    create: { fromCurrency: from, toCurrency: to, date, rate },
    update: { rate },
  });
  return rate;
}
