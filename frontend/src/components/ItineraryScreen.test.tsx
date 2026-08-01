import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { ItineraryScreen } from "./ItineraryScreen";

const getItinerary = vi.fn();
const listCities = vi.fn();

vi.mock("../api", () => ({
  api: {
    getItinerary: (...args: unknown[]) => getItinerary(...args),
    listCities: (...args: unknown[]) => listCities(...args),
    moveItem: vi.fn(),
  },
}));

const CITIES = [
  { slug: "tokyo", name: "Tokyo, Japan", country: "JP", currency: "JPY", timezone: "Asia/Tokyo" },
  { slug: "la", name: "Los Angeles, CA", country: "US", currency: "USD", timezone: "America/Los_Angeles" },
];

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
  it("shows an empty-state message when there are no days yet", async () => {
    getItinerary.mockResolvedValue([]);
    listCities.mockResolvedValue(CITIES);

    renderWithClient(<ItineraryScreen tripId="trip1" city="tokyo" />);

    await waitFor(() => {
      expect(screen.getByText(/add places from discover/i)).toBeInTheDocument();
    });
  });

  it("renders a day's stops and a day label pinned to the destination's own timezone", async () => {
    // A UTC-midnight date that is still July 31st in Tokyo (UTC+9) but would
    // already be Aug 1st if naively rendered in a US Pacific browser
    // timezone — the exact bug the timezone fix in ItineraryScreen exists to
    // prevent.
    getItinerary.mockResolvedValue([
      { dayIndex: 1, date: "2026-07-31T20:00:00.000Z", stops: [{ place: PLACE, transitFromPrevious: null }] },
    ]);
    listCities.mockResolvedValue(CITIES);

    renderWithClient(<ItineraryScreen tripId="trip1" city="tokyo" />);

    await waitFor(() => {
      expect(screen.getByText("Senso-ji")).toBeInTheDocument();
    });
    // 2026-07-31T20:00Z is 2026-08-01 05:00 in Tokyo — the label should read Aug 1, not Jul 31.
    expect(screen.getByText(/Day 1.*Aug 1/)).toBeInTheDocument();
  });

  it("falls back to a bare day label when no date is available", async () => {
    getItinerary.mockResolvedValue([{ dayIndex: 2, date: null, stops: [] }]);
    listCities.mockResolvedValue(CITIES);

    renderWithClient(<ItineraryScreen tripId="trip1" city="tokyo" />);

    await waitFor(() => {
      expect(screen.getByText("Day 2")).toBeInTheDocument();
    });
  });
});
