import "dotenv/config";
import { ingestCity } from "../services/ingestion.service";

const arg = process.argv.find((a) => a.startsWith("--city="));
const citySlug = arg ? arg.split("=")[1] : "nyc";

ingestCity(citySlug)
  .then((result) => {
    console.log(`Ingested ${citySlug}:`, result);
    const failed = Object.entries(result).filter(([, o]) => !o.ok);
    if (failed.length > 0) {
      console.error(`Adapter failures: ${failed.map(([name]) => name).join(", ")}`);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
