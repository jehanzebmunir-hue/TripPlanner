import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithRetry = vi.fn();
vi.mock("../lib/httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

// This adapter's own dataset is NYC-specific regardless of which city is
// passed -- the parameter exists only to satisfy the shared SourceAdapter
// interface, same as every other city-agnostic bonus adapter.
const CITY = { slug: "nyc", name: "New York, NY", country: "US", lat: 40.7128, lng: -74.006 };

function response(rows: unknown[]): Response {
  return new Response(JSON.stringify(rows), { status: 200 });
}

describe("nycOpenDataEventsAdapter", () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
    fetchWithRetry.mockResolvedValue(response([]));
  });

  it("excludes routine sports-league permits and administrative permit types at the query level, not just after fetching", async () => {
    const { nycOpenDataEventsAdapter } = await import("./nycOpenDataEvents");

    await nycOpenDataEventsAdapter.run(CITY);

    const calledUrl = fetchWithRetry.mock.calls[0][0] as string;
    const where = new URL(calledUrl).searchParams.get("$where") ?? "";
    // Verified live against the real dataset: these four real event_type
    // values are either routine borough recreational permits (~79% of the
    // entire dataset) or non-visitable administrative permits, not
    // something a visiting tourist means by a discoverable event.
    expect(where).toContain("event_type NOT IN('Sport - Youth', 'Sport - Adult', 'Theater Load in and Load Outs', 'Shooting Permit')");
  });

  it("maps a real, non-excluded row to a genuine NormalizedRecord, description built from the same real event_type/borough fields", async () => {
    fetchWithRetry.mockResolvedValue(
      response([
        {
          event_id: "887418",
          event_name: "Union Square Greenmarket",
          start_date_time: "2026-08-05T05:00:00.000",
          end_date_time: "2026-08-05T20:00:00.000",
          event_type: "Special Event",
          event_borough: "Manhattan",
          event_location: "Union Square Park: North Plaza",
        },
      ])
    );
    const { nycOpenDataEventsAdapter } = await import("./nycOpenDataEvents");

    const records = await nycOpenDataEventsAdapter.run(CITY);

    expect(records).toEqual([
      expect.objectContaining({
        externalId: "887418",
        category: "arts-entertainment-nightlife",
        tier: "volatile",
        name: "Union Square Greenmarket",
        description: "Special Event · Manhattan",
        address: "Union Square Park: North Plaza",
        expiryAt: new Date("2026-08-05T20:00:00.000"),
      }),
    ]);
  });

  it("returns [] rather than throwing when the request fails", async () => {
    fetchWithRetry.mockResolvedValue(new Response(null, { status: 500 }));
    const { nycOpenDataEventsAdapter } = await import("./nycOpenDataEvents");

    expect(await nycOpenDataEventsAdapter.run(CITY)).toEqual([]);
  });
});
