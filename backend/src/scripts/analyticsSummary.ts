import { summarizeEvents } from "../services/analytics.service";

const sinceDays = Number(process.argv[2] ?? 30);

summarizeEvents(sinceDays).then((rows) => {
  console.log(`Real event counts, last ${sinceDays} day(s):\n`);
  const width = Math.max(...rows.map((r) => r.name.length));
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(width)}  ${r.count}`);
  }
  process.exit(0);
});
