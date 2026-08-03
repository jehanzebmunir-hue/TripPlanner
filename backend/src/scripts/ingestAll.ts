import "dotenv/config";
import { CITIES } from "../config/cities";
import { ingestCity } from "../services/ingestion.service";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Paced at ~1.5 calls/sec worth of delay between cities — comfortably under
// Ticketmaster's real confirmed 2 req/sec cap (see README) even though each
// city also fires seatgeek/google-places/extraAdapters alongside it.
const DELAY_BETWEEN_CITIES_MS = 700;

async function main() {
  const results: { slug: string; outcome: Record<string, { count: number; ok: boolean; error?: string }> }[] = [];

  for (const city of CITIES) {
    const outcome = await ingestCity(city.slug);
    results.push({ slug: city.slug, outcome });
    const summary = Object.entries(outcome)
      .map(([adapter, o]) => `${adapter}:${o.skipped ? "SKIP" : o.ok ? o.count : "FAIL"}`)
      .join(" ");
    console.log(`${city.slug.padEnd(24)} ${summary}`);
    await sleep(DELAY_BETWEEN_CITIES_MS);
  }

  const totalPlaces = results.reduce(
    (sum, r) => sum + Object.values(r.outcome).reduce((s, o) => s + o.count, 0),
    0
  );
  const failures = results.flatMap((r) =>
    Object.entries(r.outcome)
      .filter(([, o]) => !o.ok)
      .map(([adapter, o]) => `${r.slug}/${adapter}: ${o.error}`)
  );

  console.log(`\nDone. ${CITIES.length} cities, ${totalPlaces} total place records upserted.`);
  if (failures.length > 0) {
    console.log(`${failures.length} adapter failure(s):`);
    failures.slice(0, 20).forEach((f) => console.log(`  ${f}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
