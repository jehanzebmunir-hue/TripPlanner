import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildItinerary } from "./trips.service";

const tripFindUniqueOrThrow = vi.fn();
const tripCreate = vi.fn();
const tripUpdate = vi.fn();
const tripDelete = vi.fn();
const tripItemUpsert = vi.fn();
const tripItemDelete = vi.fn();
const tripItemUpdate = vi.fn();
const tripItemCount = vi.fn();
const tripItemFindUniqueOrThrow = vi.fn();
const tripLegUpdate = vi.fn();
const placeFindUniqueOrThrow = vi.fn();
const checklistCheckDeleteMany = vi.fn();

vi.mock("../lib/prisma", () => ({
  prisma: {
    trip: {
      findUniqueOrThrow: (...a: unknown[]) => tripFindUniqueOrThrow(...a),
      create: (...a: unknown[]) => tripCreate(...a),
      update: (...a: unknown[]) => tripUpdate(...a),
      delete: (...a: unknown[]) => tripDelete(...a),
    },
    tripItem: {
      upsert: (...a: unknown[]) => tripItemUpsert(...a),
      delete: (...a: unknown[]) => tripItemDelete(...a),
      update: (...a: unknown[]) => tripItemUpdate(...a),
      count: (...a: unknown[]) => tripItemCount(...a),
      findUniqueOrThrow: (...a: unknown[]) => tripItemFindUniqueOrThrow(...a),
    },
    tripLeg: { update: (...a: unknown[]) => tripLegUpdate(...a) },
    place: { findUniqueOrThrow: (...a: unknown[]) => placeFindUniqueOrThrow(...a) },
    checklistCheck: { deleteMany: (...a: unknown[]) => checklistCheckDeleteMany(...a) },
  },
}));

function anonymousTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    userId: null,
    editToken: "real-edit-token",
    startDate: null,
    endDate: null,
    legs: [],
    items: [],
    interests: "[]",
    ...overrides,
  };
}

function ownedTrip(overrides: Record<string, unknown> = {}) {
  return { ...anonymousTrip(overrides), userId: "owner-1" };
}

describe("addTripItem permission checks", () => {
  beforeEach(() => {
    tripFindUniqueOrThrow.mockReset();
    tripUpdate.mockReset().mockResolvedValue(undefined);
    tripItemUpsert.mockReset().mockResolvedValue({ id: "item1" });
    tripItemCount.mockReset().mockResolvedValue(0);
    placeFindUniqueOrThrow.mockReset().mockResolvedValue({ id: "p1", city: "nyc" });
  });

  it("rejects mutating an anonymous trip with no edit token at all", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(anonymousTrip());
    const { addTripItem } = await import("./trips.service");

    await expect(addTripItem("t1", "p1", {})).rejects.toMatchObject({ status: 403 });
    expect(tripItemUpsert).not.toHaveBeenCalled();
  });

  it("rejects an anonymous trip with the wrong edit token", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(anonymousTrip());
    const { addTripItem } = await import("./trips.service");

    await expect(addTripItem("t1", "p1", { editToken: "wrong-token" })).rejects.toMatchObject({ status: 403 });
  });

  it("allows an anonymous trip with the real edit token", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(anonymousTrip());
    const { addTripItem } = await import("./trips.service");

    await expect(addTripItem("t1", "p1", { editToken: "real-edit-token" })).resolves.toBeDefined();
    expect(tripItemUpsert).toHaveBeenCalledTimes(1);
  });

  it("allows an owned trip's owner, via userId, with no edit token needed", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(ownedTrip());
    const { addTripItem } = await import("./trips.service");

    await expect(addTripItem("t1", "p1", { userId: "owner-1" })).resolves.toBeDefined();
  });

  it("rejects a different logged-in user on someone else's owned trip, even with no edit token", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(ownedTrip());
    const { addTripItem } = await import("./trips.service");

    await expect(addTripItem("t1", "p1", { userId: "someone-else" })).rejects.toMatchObject({ status: 403 });
  });

  it("still allows the real edit token on an owned trip -- sharing the edit link works regardless of accounts", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(ownedTrip());
    const { addTripItem } = await import("./trips.service");

    await expect(addTripItem("t1", "p1", { editToken: "real-edit-token" })).resolves.toBeDefined();
  });
});

describe("addTripItem leg inference", () => {
  beforeEach(() => {
    tripUpdate.mockReset().mockResolvedValue(undefined);
    tripItemUpsert.mockReset().mockResolvedValue({ id: "item1" });
    tripItemCount.mockReset().mockResolvedValue(0);
  });

  it("tags a new item with the leg matching the place's own city", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(
      anonymousTrip({
        city: "nyc",
        legs: [{ id: "leg-rome", city: "rome", destination: "Rome, Italy", startDate: null, endDate: null }],
      })
    );
    placeFindUniqueOrThrow.mockResolvedValue({ id: "p1", city: "rome" });
    const { addTripItem } = await import("./trips.service");

    await addTripItem("t1", "p1", { editToken: "real-edit-token" });

    expect(tripItemUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ legId: "leg-rome" }) })
    );
  });

  it("leaves legId null when the place matches the trip's primary city, not any leg", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(
      anonymousTrip({
        city: "nyc",
        legs: [{ id: "leg-rome", city: "rome", destination: "Rome, Italy", startDate: null, endDate: null }],
      })
    );
    placeFindUniqueOrThrow.mockResolvedValue({ id: "p1", city: "nyc" });
    const { addTripItem } = await import("./trips.service");

    await addTripItem("t1", "p1", { editToken: "real-edit-token" });

    expect(tripItemUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ legId: null }) })
    );
  });
});

describe("deleteTrip permission checks", () => {
  beforeEach(() => {
    tripDelete.mockReset().mockResolvedValue(undefined);
    checklistCheckDeleteMany.mockReset().mockResolvedValue(undefined);
  });

  it("no longer lets anyone delete an anonymous trip without the real edit token -- the actual gap this feature closes", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(anonymousTrip());
    const { deleteTrip } = await import("./trips.service");

    await expect(deleteTrip("t1", {})).rejects.toMatchObject({ status: 403 });
    expect(tripDelete).not.toHaveBeenCalled();
  });

  it("allows deletion with the real edit token", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(anonymousTrip());
    const { deleteTrip } = await import("./trips.service");

    await deleteTrip("t1", { editToken: "real-edit-token" });
    expect(tripDelete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});

describe("moveTripItem: leg-relative dayIndex, not the global one the itinerary displays", () => {
  beforeEach(() => {
    tripUpdate.mockReset().mockResolvedValue(undefined);
    tripItemUpdate.mockReset().mockResolvedValue({ id: "item1" });
    tripItemFindUniqueOrThrow.mockReset();
  });

  it("rejects a dayIndex outside the item's own leg's real date range, rather than silently storing a bad value", async () => {
    // A 2-day Rome leg (Oct 20-21) -- day 3 doesn't exist for this leg, even
    // though the trip overall (with a separate Paris leg) might have more
    // days in total.
    tripFindUniqueOrThrow.mockResolvedValue(
      anonymousTrip({
        legs: [{ id: "rome", startDate: new Date("2026-10-20"), endDate: new Date("2026-10-21") }],
      })
    );
    tripItemFindUniqueOrThrow.mockResolvedValue({ legId: "rome" });
    const { moveTripItem } = await import("./trips.service");

    await expect(moveTripItem("t1", "p1", 3, { editToken: "real-edit-token" })).rejects.toMatchObject({
      status: 400,
    });
    expect(tripItemUpdate).not.toHaveBeenCalled();
  });

  it("allows a dayIndex within the item's own leg's real range", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(
      anonymousTrip({
        legs: [{ id: "rome", startDate: new Date("2026-10-20"), endDate: new Date("2026-10-21") }],
      })
    );
    tripItemFindUniqueOrThrow.mockResolvedValue({ legId: "rome" });
    const { moveTripItem } = await import("./trips.service");

    await moveTripItem("t1", "p1", 2, { editToken: "real-edit-token" });
    expect(tripItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { dayIndex: 2 } })
    );
  });

  it("validates against the trip's own primary range for an item with no leg", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(
      anonymousTrip({ startDate: new Date("2026-10-09"), endDate: new Date("2026-10-10"), legs: [] })
    );
    tripItemFindUniqueOrThrow.mockResolvedValue({ legId: null });
    const { moveTripItem } = await import("./trips.service");

    await expect(moveTripItem("t1", "p1", 5, { editToken: "real-edit-token" })).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe("updateTrip", () => {
  beforeEach(() => {
    tripFindUniqueOrThrow.mockReset();
    tripUpdate.mockReset().mockResolvedValue(undefined);
    tripLegUpdate.mockReset().mockResolvedValue(undefined);
  });

  it("rejects without the real edit token, same as every other mutation", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(anonymousTrip());
    const { updateTrip } = await import("./trips.service");

    await expect(updateTrip("t1", { homeCurrency: "CAD" }, {})).rejects.toMatchObject({ status: 403 });
    expect(tripUpdate).not.toHaveBeenCalled();
  });

  it("updates dates and home currency with the real edit token", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(anonymousTrip());
    const { updateTrip } = await import("./trips.service");

    await updateTrip(
      "t1",
      { startDate: "2026-11-01", endDate: "2026-11-05", homeCurrency: "CAD" },
      { editToken: "real-edit-token" }
    );

    expect(tripUpdate).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { startDate: new Date("2026-11-01"), endDate: new Date("2026-11-05"), homeCurrency: "CAD" },
    });
  });

  it("rejects shrinking the date range when an existing item would fall outside it, rather than silently corrupting its day", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(
      anonymousTrip({
        startDate: new Date("2026-10-09"),
        endDate: new Date("2026-10-15"), // 7 days
        items: [{ legId: null, dayIndex: 6 }], // day 6 -- fine today, not after shrinking
      })
    );
    const { updateTrip } = await import("./trips.service");

    await expect(
      updateTrip("t1", { endDate: "2026-10-11" }, { editToken: "real-edit-token" }) // shrinks to 3 days
    ).rejects.toMatchObject({ status: 400 });
    expect(tripUpdate).not.toHaveBeenCalled();
  });

  it("updates an existing leg's dates by id", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(
      anonymousTrip({
        legs: [{ id: "leg-rome", startDate: new Date("2026-10-20"), endDate: new Date("2026-10-21") }],
      })
    );
    const { updateTrip } = await import("./trips.service");

    await updateTrip(
      "t1",
      { legs: [{ id: "leg-rome", startDate: "2026-10-22", endDate: "2026-10-23" }] },
      { editToken: "real-edit-token" }
    );

    expect(tripLegUpdate).toHaveBeenCalledWith({
      where: { id: "leg-rome" },
      data: { startDate: new Date("2026-10-22"), endDate: new Date("2026-10-23") },
    });
  });

  it("rejects an unknown leg id rather than silently ignoring it", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(anonymousTrip({ legs: [] }));
    const { updateTrip } = await import("./trips.service");

    await expect(
      updateTrip("t1", { legs: [{ id: "not-a-real-leg", startDate: "2026-10-22" }] }, { editToken: "real-edit-token" })
    ).rejects.toMatchObject({ status: 400 });
    expect(tripLegUpdate).not.toHaveBeenCalled();
  });

  it("rejects shrinking a leg's date range when one of its own items would fall outside it", async () => {
    tripFindUniqueOrThrow.mockResolvedValue(
      anonymousTrip({
        legs: [{ id: "leg-rome", startDate: new Date("2026-10-20"), endDate: new Date("2026-10-25") }], // 6 days
        items: [{ legId: "leg-rome", dayIndex: 5 }],
      })
    );
    const { updateTrip } = await import("./trips.service");

    await expect(
      updateTrip(
        "t1",
        { legs: [{ id: "leg-rome", endDate: "2026-10-22" }] }, // shrinks to 3 days
        { editToken: "real-edit-token" }
      )
    ).rejects.toMatchObject({ status: 400 });
    expect(tripLegUpdate).not.toHaveBeenCalled();
  });
});

describe("buildItinerary", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("computes each item's date from the trip's primary range when it has no leg", () => {
    const start = new Date("2026-10-09T00:00:00.000Z");
    const trip = {
      startDate: start,
      legs: [],
      items: [
        { legId: null, dayIndex: 1, place: "A" },
        { legId: null, dayIndex: 2, place: "B" },
      ],
    };

    const days = buildItinerary(trip);

    expect(days).toEqual([
      { dayIndex: 1, date: start, items: [{ legId: null, dayIndex: 1, place: "A" }] },
      { dayIndex: 2, date: new Date(start.getTime() + DAY_MS), items: [{ legId: null, dayIndex: 2, place: "B" }] },
    ]);
  });

  it("computes a leg item's date from its OWN leg's start date, not the trip's primary date", () => {
    const tripStart = new Date("2026-10-09T00:00:00.000Z");
    const legStart = new Date("2026-10-20T00:00:00.000Z"); // a much later, separate leg
    const trip = {
      startDate: tripStart,
      legs: [{ id: "leg1", startDate: legStart }],
      items: [{ legId: "leg1", dayIndex: 1, place: "Colosseum" }],
    };

    const days = buildItinerary(trip);

    expect(days[0].date).toEqual(legStart);
  });

  it("assigns a clean sequential dayIndex across legs, not each item's own leg-relative dayIndex", () => {
    // Two contiguous legs: primary Paris days 1-2, then a Rome leg starting
    // the day after Paris ends. Both legs independently have a "dayIndex 1"
    // in the DB, but the real itinerary should read Day 1..4 in order.
    const parisStart = new Date("2026-10-09T00:00:00.000Z");
    const romeStart = new Date("2026-10-11T00:00:00.000Z");
    const trip = {
      startDate: parisStart,
      legs: [{ id: "rome", startDate: romeStart }],
      items: [
        { legId: null, dayIndex: 1, place: "Eiffel Tower" },
        { legId: null, dayIndex: 2, place: "Louvre" },
        { legId: "rome", dayIndex: 1, place: "Colosseum" },
        { legId: "rome", dayIndex: 2, place: "Trevi Fountain" },
      ],
    };

    const days = buildItinerary(trip);

    expect(days.map((d) => d.dayIndex)).toEqual([1, 2, 3, 4]);
    expect(days.map((d) => d.items[0].place)).toEqual(["Eiffel Tower", "Louvre", "Colosseum", "Trevi Fountain"]);
  });

  it("merges items onto the same day when two legs' dates genuinely land on the same calendar date", () => {
    const sameDate = new Date("2026-10-09T00:00:00.000Z");
    const trip = {
      startDate: sameDate,
      legs: [{ id: "leg1", startDate: sameDate }],
      items: [
        { legId: null, dayIndex: 1, place: "A" },
        { legId: "leg1", dayIndex: 1, place: "B" },
      ],
    };

    const days = buildItinerary(trip);

    expect(days).toHaveLength(1);
    expect(days[0].items.map((i) => i.place)).toEqual(["A", "B"]);
  });

  it("falls back to grouping by (legId, dayIndex) for a fully undated trip, rather than collapsing everything onto one null date", () => {
    const trip = {
      startDate: null,
      legs: [{ id: "leg1", startDate: null }],
      items: [
        { legId: null, dayIndex: 1, place: "A" },
        { legId: "leg1", dayIndex: 1, place: "B" },
      ],
    };

    const days = buildItinerary(trip);

    expect(days).toHaveLength(2);
    expect(days.every((d) => d.date === null)).toBe(true);
  });
});
