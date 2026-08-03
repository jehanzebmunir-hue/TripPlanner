import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { ItineraryScreen } from "./ItineraryScreen";

const getItinerary = vi.fn();
const listCities = vi.fn();
const getTrip = vi.fn();
const listPlaces = vi.fn();
const addItem = vi.fn();
const moveItem = vi.fn();

vi.mock("../api", () => ({
  api: {
    getItinerary: (...args: unknown[]) => getItinerary(...args),
    listCities: (...args: unknown[]) => listCities(...args),
    getTrip: (...args: unknown[]) => getTrip(...args),
    listPlaces: (...args: unknown[]) => listPlaces(...args),
    addItem: (...args: unknown[]) => addItem(...args),
    moveItem: (...args: unknown[]) => moveItem(...args),
  },
}));

const downloadIcs = vi.fn();
vi.mock("../ics", async () => {
  const actual = await vi.importActual<typeof import("../ics")>("../ics");
  return { buildIcs: actual.buildIcs, downloadIcs: (...args: unknown[]) => downloadIcs(...args) };
});

const CITIES = [
  { slug: "tokyo", name: "Tokyo, Japan", country: "JP", currency: "JPY", timezone: "Asia/Tokyo" },
  { slug: "la", name: "Los Angeles, CA", country: "US", currency: "USD", timezone: "America/Los_Angeles" },
];

const TRIP = {
  id: "trip1",
  city: "tokyo",
  destination: "Tokyo, Japan",
  startDate: "2026-07-31T00:00:00.000Z",
  endDate: "2026-08-02T00:00:00.000Z",
  interests: [],
  legs: [],
  items: [],
};

const PLACE = {
  id: "p1",
  city: "tokyo",
  category: "sightseeing-culture",
  tier: "static" as const,
  name: "Senso-ji",
  source: "seed",
  lastVerifiedAt: new Date().toISOString(),
  confidence: 90,
  band: "verified" as const,
  daysSince: 1,
};

describe("ItineraryScreen", () => {
  beforeEach(() => {
    moveItem.mockReset();
    downloadIcs.mockReset();
  });

  it("shows an empty-state message when there are no days yet", async () => {
    getItinerary.mockResolvedValue([]);
    listCities.mockResolvedValue(CITIES);
    getTrip.mockResolvedValue(TRIP);

    renderWithClient(<ItineraryScreen tripId="trip1" />);

    await waitFor(() => {
      expect(screen.getByText(/add places from discover/i)).toBeInTheDocument();
    });
  });

  it("auto-fills a starter itinerary by fetching this city's places and adding real picks", async () => {
    getItinerary.mockResolvedValue([]);
    listCities.mockResolvedValue(CITIES);
    getTrip.mockResolvedValue(TRIP);
    listPlaces.mockResolvedValue([PLACE, { ...PLACE, id: "p2", category: "food-dining" }]);
    addItem.mockResolvedValue({});

    renderWithClient(<ItineraryScreen tripId="trip1" />);

    const button = await screen.findByRole("button", { name: /auto-fill a starter itinerary/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(listPlaces).toHaveBeenCalledWith("tokyo");
      expect(addItem).toHaveBeenCalledWith("trip1", "p1");
      expect(addItem).toHaveBeenCalledWith("trip1", "p2");
    });
  });

  it("renders a day's stops and a day label pinned to the destination's own timezone", async () => {
    // A UTC-midnight date that is still July 31st in Tokyo (UTC+9) but would
    // already be Aug 1st if naively rendered in a US Pacific browser
    // timezone — the exact bug the timezone fix in ItineraryScreen exists to
    // prevent.
    getItinerary.mockResolvedValue([
      {
        dayIndex: 1,
        date: "2026-07-31T20:00:00.000Z",
        stops: [{ place: PLACE, transitFromPrevious: null, legId: null, itemDayIndex: 1 }],
      },
    ]);
    listCities.mockResolvedValue(CITIES);
    getTrip.mockResolvedValue(TRIP);

    renderWithClient(<ItineraryScreen tripId="trip1" />);

    await waitFor(() => {
      expect(screen.getByText("Senso-ji")).toBeInTheDocument();
    });
    // 2026-07-31T20:00Z is 2026-08-01 05:00 in Tokyo — the label should read Aug 1, not Jul 31.
    expect(screen.getByText(/Day 1.*Aug 1/)).toBeInTheDocument();
  });

  it("falls back to a bare day label when no date is available", async () => {
    getItinerary.mockResolvedValue([{ dayIndex: 2, date: null, stops: [] }]);
    listCities.mockResolvedValue(CITIES);
    getTrip.mockResolvedValue(TRIP);

    renderWithClient(<ItineraryScreen tripId="trip1" />);

    await waitFor(() => {
      expect(screen.getByText("Day 2")).toBeInTheDocument();
    });
  });

  it("resolves a leg item's own city/timezone independently of the trip's primary city", async () => {
    // Trip is primarily Tokyo, but this stop belongs to an LA leg -- the day
    // label must use LA's timezone, not Tokyo's, or it's the exact
    // multi-city version of the bug the single-city timezone fix prevented.
    getItinerary.mockResolvedValue([
      {
        dayIndex: 1,
        date: "2026-08-05T20:00:00.000Z",
        stops: [{ place: { ...PLACE, city: "la" }, transitFromPrevious: null, legId: "leg-la", itemDayIndex: 1 }],
      },
    ]);
    listCities.mockResolvedValue(CITIES);
    getTrip.mockResolvedValue({
      ...TRIP,
      legs: [{ id: "leg-la", city: "la", destination: "Los Angeles, CA", startDate: "2026-08-05T00:00:00.000Z", endDate: "2026-08-06T00:00:00.000Z", order: 0 }],
    });

    renderWithClient(<ItineraryScreen tripId="trip1" />);

    // 2026-08-05T20:00Z is 2026-08-05 13:00 in LA (UTC-7 in August) -- still Aug 5, not Aug 6.
    await waitFor(() => expect(screen.getByText(/Day 1.*Aug 5/)).toBeInTheDocument());
  });

  it("moves a stop to a different day via drag-and-drop, calling the same moveItem the dropdown uses", async () => {
    getItinerary.mockResolvedValue([
      {
        dayIndex: 1,
        date: "2026-07-31T00:00:00.000Z",
        stops: [{ place: PLACE, transitFromPrevious: null, legId: null, itemDayIndex: 1 }],
      },
      {
        dayIndex: 2,
        date: "2026-08-01T00:00:00.000Z",
        stops: [{ place: { ...PLACE, id: "p2", name: "Tokyo Tower" }, transitFromPrevious: null, legId: null, itemDayIndex: 2 }],
      },
    ]);
    listCities.mockResolvedValue(CITIES);
    getTrip.mockResolvedValue(TRIP); // 2026-07-31 to 2026-08-02: a real 3-day range

    renderWithClient(<ItineraryScreen tripId="trip1" />);
    await waitFor(() => expect(screen.getByText("Senso-ji")).toBeInTheDocument());

    const sourceCard = screen.getByText("Senso-ji").closest('[draggable="true"]') as HTMLElement;
    const targetCard = screen.getByText("Tokyo Tower").closest('[draggable="true"]') as HTMLElement;
    const targetDayGroup = targetCard.parentElement!.parentElement as HTMLElement;

    fireEvent.dragStart(sourceCard);
    fireEvent.dragOver(targetDayGroup);
    fireEvent.drop(targetDayGroup);

    // Day 2 of this range is 2026-08-01 -- the real date Senso-ji's own
    // (leg-less, primary-trip) day options resolve that target date to.
    await waitFor(() => expect(moveItem).toHaveBeenCalledWith("trip1", "p1", 2));
  });

  it("does not move a stop when dropped onto a day that isn't a real option for its own leg", async () => {
    getItinerary.mockResolvedValue([
      {
        dayIndex: 1,
        date: "2026-07-31T00:00:00.000Z",
        stops: [{ place: PLACE, transitFromPrevious: null, legId: null, itemDayIndex: 1 }],
      },
      {
        dayIndex: 2,
        date: "2026-08-05T20:00:00.000Z", // outside the primary trip's own 07-31..08-02 range entirely
        stops: [{ place: { ...PLACE, id: "p2", city: "la", name: "Griffith Observatory" }, transitFromPrevious: null, legId: "leg-la", itemDayIndex: 1 }],
      },
    ]);
    listCities.mockResolvedValue(CITIES);
    getTrip.mockResolvedValue({
      ...TRIP,
      legs: [{ id: "leg-la", city: "la", destination: "Los Angeles, CA", startDate: "2026-08-05T00:00:00.000Z", endDate: "2026-08-06T00:00:00.000Z", order: 0 }],
    });

    renderWithClient(<ItineraryScreen tripId="trip1" />);
    await waitFor(() => expect(screen.getByText("Senso-ji")).toBeInTheDocument());

    const sourceCard = screen.getByText("Senso-ji").closest('[draggable="true"]') as HTMLElement;
    const targetCard = screen.getByText("Griffith Observatory").closest('[draggable="true"]') as HTMLElement;
    const targetDayGroup = targetCard.parentElement!.parentElement as HTMLElement;

    fireEvent.dragStart(sourceCard);
    fireEvent.dragOver(targetDayGroup);
    fireEvent.drop(targetDayGroup);

    expect(moveItem).not.toHaveBeenCalled();
  });

  it("exports a real .ics file built from the actual itinerary when Export is clicked", async () => {
    getItinerary.mockResolvedValue([
      {
        dayIndex: 1,
        date: "2026-07-31T00:00:00.000Z",
        stops: [{ place: PLACE, transitFromPrevious: null, legId: null, itemDayIndex: 1 }],
      },
    ]);
    listCities.mockResolvedValue(CITIES);
    getTrip.mockResolvedValue(TRIP);
    const user = userEvent.setup();

    renderWithClient(<ItineraryScreen tripId="trip1" />);
    await waitFor(() => expect(screen.getByText("Senso-ji")).toBeInTheDocument());

    const exportButton = screen.getByRole("button", { name: /export calendar/i });
    expect(exportButton).not.toBeDisabled();
    await user.click(exportButton);

    expect(downloadIcs).toHaveBeenCalledTimes(1);
    const [filename, content] = downloadIcs.mock.calls[0];
    expect(filename).toBe("tokyo-japan.ics");
    expect(content).toContain("SUMMARY:Senso-ji");
    expect(content).toContain("DTSTART;VALUE=DATE:20260731");
  });

  it("disables Export when no day in the itinerary has a real date", async () => {
    getItinerary.mockResolvedValue([{ dayIndex: 1, date: null, stops: [{ place: PLACE, transitFromPrevious: null, legId: null, itemDayIndex: 1 }] }]);
    listCities.mockResolvedValue(CITIES);
    getTrip.mockResolvedValue(TRIP);

    renderWithClient(<ItineraryScreen tripId="trip1" />);
    await waitFor(() => expect(screen.getByText("Senso-ji")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /export calendar/i })).toBeDisabled();
  });
});
