import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";
import { ItineraryDay, Place } from "./types";

function place(overrides: Partial<Place> & Pick<Place, "id" | "name">): Place {
  return {
    city: "nyc",
    category: "sightseeing-culture",
    tier: "static",
    source: "seed",
    lastVerifiedAt: new Date().toISOString(),
    confidence: 90,
    band: "verified",
    daysSince: 1,
    recentConfirmations: 0,
    ...overrides,
  };
}

describe("buildIcs", () => {
  it("wraps a real VCALENDAR/VEVENT structure with CRLF line endings", () => {
    const days: ItineraryDay[] = [
      {
        dayIndex: 1,
        date: "2026-10-09T00:00:00.000Z",
        stops: [{ place: place({ id: "p1", name: "The Met" }), transitFromPrevious: null, legId: null, itemDayIndex: 1 }],
      },
    ];

    const ics = buildIcs("New York, NY", days);

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0\r\n");
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("SUMMARY:The Met\r\n");
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("uses a real all-day event, not a fabricated time of day", () => {
    const days: ItineraryDay[] = [
      {
        dayIndex: 1,
        date: "2026-10-09T00:00:00.000Z",
        stops: [{ place: place({ id: "p1", name: "The Met" }), transitFromPrevious: null, legId: null, itemDayIndex: 1 }],
      },
    ];

    const ics = buildIcs("New York, NY", days);

    expect(ics).toContain("DTSTART;VALUE=DATE:20261009\r\n");
    // DTEND on an all-day event is exclusive per RFC 5545 -- the next day, not the same one.
    expect(ics).toContain("DTEND;VALUE=DATE:20261010\r\n");
  });

  it("skips a day with no real date rather than inventing one", () => {
    const days: ItineraryDay[] = [
      { dayIndex: 1, date: null, stops: [{ place: place({ id: "p1", name: "Undated stop" }), transitFromPrevious: null, legId: null, itemDayIndex: 1 }] },
    ];

    const ics = buildIcs("Undated Trip", days);

    expect(ics).not.toContain("Undated stop");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("escapes commas, semicolons, and newlines in real place text", () => {
    const days: ItineraryDay[] = [
      {
        dayIndex: 1,
        date: "2026-10-09T00:00:00.000Z",
        stops: [
          {
            place: place({ id: "p1", name: "Cafe, Bistro; Bar" }),
            transitFromPrevious: null,
            legId: null,
            itemDayIndex: 1,
          },
        ],
      },
    ];

    const ics = buildIcs("Trip", days);

    expect(ics).toContain("SUMMARY:Cafe\\, Bistro\\; Bar\r\n");
  });

  it("folds a description longer than 75 characters across continuation lines", () => {
    const longDescription = "A".repeat(120);
    const days: ItineraryDay[] = [
      {
        dayIndex: 1,
        date: "2026-10-09T00:00:00.000Z",
        stops: [
          {
            place: place({ id: "p1", name: "Long Place", description: longDescription }),
            transitFromPrevious: null,
            legId: null,
            itemDayIndex: 1,
          },
        ],
      },
    ];

    const ics = buildIcs("Trip", days);
    const descriptionLine = ics.split("\r\n").find((l) => l.startsWith("DESCRIPTION:"));

    expect(descriptionLine!.length).toBeLessThanOrEqual(75);
    expect(ics).toContain("\r\n " + "A".repeat(45)); // the folded continuation, starting with a single space
  });

  it("includes one VEVENT per stop across multiple real days", () => {
    const days: ItineraryDay[] = [
      { dayIndex: 1, date: "2026-10-09T00:00:00.000Z", stops: [{ place: place({ id: "p1", name: "Day 1 stop" }), transitFromPrevious: null, legId: null, itemDayIndex: 1 }] },
      { dayIndex: 2, date: "2026-10-10T00:00:00.000Z", stops: [{ place: place({ id: "p2", name: "Day 2 stop" }), transitFromPrevious: null, legId: null, itemDayIndex: 1 }] },
    ];

    const ics = buildIcs("Trip", days);

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("Day 1 stop");
    expect(ics).toContain("Day 2 stop");
  });
});
