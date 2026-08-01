import { fetchWithRetry } from "../lib/httpRetry";
import { NormalizedRecord, SourceAdapter } from "../types";

// Boston runs CKAN, not Socrata — a platform this project had checked and
// skipped for Boston/Toronto/Vancouver every time it came up (see README's
// "Adapter model" section) without ever actually querying it. Direct
// verification found a genuinely live, forward-dated dataset here: 8,357
// rows going back to 2014, filterable to real future "Open" events via
// CKAN's datastore_search_sql endpoint (confirmed against the live API,
// not assumed from the CKAN platform in general — Toronto's own
// festivals-events dataset looked identical on paper and turned out to
// point at a dead backend link, so "runs on CKAN" alone proves nothing).
const RESOURCE_ID = "fb05bfda-a57e-4d97-948b-4f1949ba3c8a";
const SQL_ENDPOINT = "https://data.boston.gov/api/3/action/datastore_search_sql";

function categoryFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("run") || n.includes("race") || n.includes("tournament") || n.includes("basketball")) {
    return "sports-major-events";
  }
  if (n.includes("fest") || n.includes("music") || n.includes("art") || n.includes("bash")) {
    return "arts-entertainment-nightlife";
  }
  return "sightseeing-culture";
}

interface BostonEventRow {
  "App Number": string;
  "App Name": string;
  Status: string;
  "Location Description": string | null;
  "Start Date and Time": string;
  "End Date and Time": string;
}

export const bostonEventsAdapter: SourceAdapter = {
  name: "boston-events",
  async run() {
    const todayFloating = new Date().toISOString().slice(0, 10);
    const sql =
      `SELECT "App Number", "App Name", "Status", "Location Description", ` +
      `"Start Date and Time", "End Date and Time" FROM "${RESOURCE_ID}" ` +
      `WHERE "Status" = 'Open' AND "Start Date and Time" > '${todayFloating}' ` +
      `ORDER BY "Start Date and Time" ASC LIMIT 15`;

    const res = await fetchWithRetry(`${SQL_ENDPOINT}?${new URLSearchParams({ sql })}`);
    if (!res.ok) {
      console.warn(`[boston-events] request failed: ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { success: boolean; result?: { records: BostonEventRow[] } };
    if (!body.success) {
      console.warn(`[boston-events] query rejected`);
      return [];
    }
    const rows = body.result?.records ?? [];

    const records: NormalizedRecord[] = rows
      .filter((row) => row["App Name"])
      .map((row) => ({
        externalId: row["App Number"],
        category: categoryFor(row["App Name"]),
        tier: "volatile",
        name: row["App Name"],
        description:
          row["Location Description"] && row["Location Description"] !== "N/A" ? row["Location Description"] : undefined,
        expiryAt: row["End Date and Time"] ? new Date(row["End Date and Time"]) : undefined,
      }));

    return records;
  },
};
