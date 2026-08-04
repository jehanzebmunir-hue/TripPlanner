import { describe, expect, it } from "vitest";
import { chooseDayIndex } from "./dayAssignment";

// Real NYC-area coordinates for realistic distances, not arbitrary numbers.
const MET = { lat: 40.7794, lng: -73.9632 }; // Upper East Side
const CENTRAL_PARK = { lat: 40.7812, lng: -73.9665 }; // right next to the Met
const WALL_ST = { lat: 40.7074, lng: -74.0113 }; // Financial District, ~9km away

describe("chooseDayIndex", () => {
  it("picks the first day when there are no existing items yet -- no geography to go on", () => {
    expect(chooseDayIndex([], MET, 3)).toBe(1);
  });

  it("stays balanced: fills the least-loaded day before repeating a day that already has more", () => {
    const existing = [
      { dayIndex: 1, place: { lat: null, lng: null } },
      { dayIndex: 1, place: { lat: null, lng: null } },
      { dayIndex: 2, place: { lat: null, lng: null } },
    ];
    // Day 3 (0 items) and day 2 (1 item) both beat day 1 (2 items); day 3 is
    // the least-loaded of all, so it wins even with no geography involved.
    expect(chooseDayIndex(existing, { lat: null, lng: null }, 3)).toBe(3);
  });

  it("clusters a new place onto the day whose existing items are geographically closest, among balanced candidates", () => {
    const existing = [
      { dayIndex: 1, place: WALL_ST }, // far from the new place
      { dayIndex: 2, place: MET }, // right next to the new place
    ];
    // Both days are tied at 1 item each (balanced), so geography decides:
    // Central Park is a ~5 minute walk from the Met, ~9km from Wall St.
    expect(chooseDayIndex(existing, CENTRAL_PARK, 2)).toBe(2);
  });

  it("never lets geography override the balance rule -- a closer day that's already more loaded loses", () => {
    const existing = [
      { dayIndex: 1, place: MET }, // geographically closest, but already has an item
      { dayIndex: 1, place: WALL_ST },
      { dayIndex: 2, place: { lat: null, lng: null } }, // day 2 is empty, so it's the only eligible day
    ];
    expect(chooseDayIndex(existing, CENTRAL_PARK, 2)).toBe(2);
  });

  it("falls back to the lowest-numbered eligible day when the new place has no real coordinates", () => {
    const existing = [{ dayIndex: 2, place: MET }];
    // Days 1 and 3 are both empty/tied for least-loaded; without coordinates
    // on the new place there's nothing to cluster with, so it's a plain
    // fallback to day order.
    expect(chooseDayIndex(existing, { lat: null, lng: null }, 3)).toBe(1);
  });

  it("falls back to day order among candidates when none of them have any geo-tagged items yet", () => {
    const existing = [
      { dayIndex: 1, place: { lat: null, lng: null } },
      { dayIndex: 2, place: { lat: null, lng: null } },
    ];
    expect(chooseDayIndex(existing, MET, 3)).toBe(3); // day 3 is the only one with 0 items, so it's uniquely eligible
  });

  it("ignores an existing item's dayIndex outside the real day range (a leftover from a since-shrunk trip)", () => {
    const existing = [{ dayIndex: 9, place: MET }]; // out of range for a 2-day trip
    // Day 9 isn't a real candidate for a 2-day trip -- both real days (1, 2)
    // start at 0 and tie, so this degrades to the plain no-geography fallback.
    expect(chooseDayIndex(existing, CENTRAL_PARK, 2)).toBe(1);
  });
});
