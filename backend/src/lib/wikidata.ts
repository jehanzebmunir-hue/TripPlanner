import { fetchWithRetry } from "./httpRetry";

// A gentle, self-imposed pace against Wikidata's public API -- it has no
// strict published rate limit the way Nominatim does, but the same "be a
// real, identifiable, well-behaved client" courtesy this app already
// applies to Nominatim and Overpass applies here too.
const MIN_INTERVAL_MS = 500;
let lastCallAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle(): Promise<void> {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

interface WikidataEntityResponse {
  entities?: Record<
    string,
    {
      claims?: {
        P18?: { mainsnak?: { datavalue?: { value?: string } } }[];
      };
    }
  >;
}

/**
 * A real photo URL for a place, resolved from its own linked Wikidata
 * entity's P18 (image) claim -- undefined when the entity has no such
 * claim, which is common for anything not independently notable. Never a
 * stock photo, never guessed. The Commons Special:FilePath endpoint
 * redirects straight to a real, already-hosted, appropriately-sized
 * image -- verified live -- so no second Commons API call is needed to
 * resolve the P18 filename into something an <img> tag can load directly.
 */
export async function photoUrlForWikidataId(qid: string): Promise<string | undefined> {
  await throttle();

  const res = await fetchWithRetry(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
    headers: { "User-Agent": "TripPlanner/1.0 (+https://github.com/jehanzebmunir-hue/TripPlanner)" },
  });
  if (!res.ok) return undefined;

  const body = (await res.json()) as WikidataEntityResponse;
  const filename = body.entities?.[qid]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (!filename) return undefined;

  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=400`;
}
