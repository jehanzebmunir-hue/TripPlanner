import { describe, expect, it } from "vitest";
import { buildRecordsFromRows, ChicagoEventRow } from "./chicagoParkEvents";

function row(overrides: Partial<ChicagoEventRow>): ChicagoEventRow {
  return {
    event_description: "Lollapalooza 2026",
    event_type: "Festival",
    reservation_start_date: "2026-08-01T00:00:00.000",
    reservation_end_date: "2026-08-01T00:00:00.000",
    park_facility_name: "Grant Park",
    permit_status: "Approved",
    ...overrides,
  };
}

describe("buildRecordsFromRows", () => {
  it("collapses a multi-day, multi-venue festival into a single record", () => {
    const rows = [
      row({ reservation_end_date: "2026-08-01T00:00:00.000", park_facility_name: "Grant Park" }),
      row({ reservation_end_date: "2026-08-02T00:00:00.000", park_facility_name: "Grant Park" }),
      row({ reservation_end_date: "2026-08-04T00:00:00.000", park_facility_name: "Butler Field" }),
    ];

    const records = buildRecordsFromRows(rows);

    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("Lollapalooza 2026");
    expect(records[0].expiryAt).toEqual(new Date("2026-08-04T00:00:00.000"));
    expect(records[0].description).toContain("Grant Park");
  });

  it("keeps distinct event names as separate records", () => {
    const rows = [row({ event_description: "Lollapalooza 2026" }), row({ event_description: "Taste of Chicago" })];
    const records = buildRecordsFromRows(rows);
    expect(records.map((r) => r.name).sort()).toEqual(["Lollapalooza 2026", "Taste of Chicago"]);
  });

  it("drops rows with a blank or placeholder description", () => {
    const rows = [row({ event_description: "" }), row({ event_description: "--" }), row({ event_description: "Real Event" })];
    const records = buildRecordsFromRows(rows);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("Real Event");
  });

  it("caps output at 15 records", () => {
    const rows = Array.from({ length: 30 }, (_, i) => row({ event_description: `Event ${i}` }));
    const records = buildRecordsFromRows(rows);
    expect(records).toHaveLength(15);
  });
});
