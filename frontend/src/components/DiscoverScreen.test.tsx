import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { DiscoverScreen } from "./DiscoverScreen";

const listPlaces = vi.fn();
const getCityHealth = vi.fn();
const listCities = vi.fn();

vi.mock("../api", () => ({
  api: {
    listPlaces: (...args: unknown[]) => listPlaces(...args),
    getCityHealth: (...args: unknown[]) => getCityHealth(...args),
    listCities: (...args: unknown[]) => listCities(...args),
    confirmPlace: vi.fn(),
  },
}));

const CITIES = [{ slug: "nyc", name: "New York, NY", country: "US", currency: "USD", timezone: "America/New_York" }];

const PLACE = {
  id: "p1",
  city: "nyc",
  category: "sightseeing-culture",
  tier: "static" as const,
  name: "The Met",
  source: "seed",
  lastVerifiedAt: new Date().toISOString(),
  confidence: 90,
  band: "verified" as const,
  daysSince: 1,
};

describe("DiscoverScreen", () => {
  it("shows no degraded-data banner when every adapter is healthy", async () => {
    listPlaces.mockResolvedValue([PLACE]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([{ adapter: "ticketmaster", degraded: false, consecutiveFailures: 0, lastError: null, lastSuccessAt: "2026-07-31" }]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    expect(screen.queryByText(/may be temporarily outdated/i)).not.toBeInTheDocument();
  });

  it("shows a degraded-data banner naming the failing adapter, without hiding the rest of the data", async () => {
    listPlaces.mockResolvedValue([PLACE]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([
      { adapter: "ticketmaster", degraded: true, consecutiveFailures: 3, lastError: "rate limited", lastSuccessAt: null },
    ]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => {
      expect(screen.getByText(/may be temporarily outdated/i)).toBeInTheDocument();
      expect(screen.getByText(/ticketmaster/)).toBeInTheDocument();
    });
    // The degraded adapter doesn't suppress unrelated, still-good data.
    expect(screen.getByText("The Met")).toBeInTheDocument();
  });

  it("shows 'Free' for a confirmed-free place", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, priceAmount: 0 }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("Free")).toBeInTheDocument());
  });

  it("shows a formatted price in the city's currency for a real, sourced amount", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, priceAmount: 30 }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    // Exact glyph (e.g. "$30" vs "US$30") depends on the runtime's default
    // locale — the component deliberately uses the visitor's own locale, so
    // the test only asserts the currency was actually applied and the
    // amount is right, not a specific symbol rendering.
    await waitFor(() => expect(screen.getByText(/US?\$30/)).toBeInTheDocument());
  });

  it("shows no price at all when priceAmount hasn't been verified", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, priceAmount: null }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
  });
});
