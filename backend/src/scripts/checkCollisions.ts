import { CITIES } from "../config/cities";
import { findMarketCollisions } from "../lib/collisions";

const collisions = findMarketCollisions(CITIES);

if (collisions.length === 0) {
  console.log(`No market-string collisions across ${CITIES.length} cities.`);
  process.exit(0);
}

console.error(`Found ${collisions.length} market-string collision(s):`);
for (const c of collisions) {
  console.error(`  [${c.field}] "${c.key}" — ${c.cities.join(", ")}`);
}
process.exit(1);
