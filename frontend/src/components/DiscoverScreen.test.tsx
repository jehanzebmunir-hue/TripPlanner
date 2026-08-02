import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { DiscoverScreen } from "./DiscoverScreen";

const listPlaces = vi.fn();
const getCityHealth = vi.fn();
const listCities = vi.fn();
const getExchangeRate = vi.fn().mockResolvedValue({ from: "USD", to: "USD", rate: null });

vi.mock("../api", () => ({
  api: {
    listPlaces: (...args: unknown[]) => listPlaces(...args),
    getCityHealth: (...args: unknown[]) => getCityHealth(...args),
    listCities: (...args: unknown[]) => listCities(...args),
    getExchangeRate: (...args: unknown[]) => getExchangeRate(...args),
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

    // formatPrice pins locale to "en-US" specifically so this is
    // deterministic across environments (verified live: the previous
    // undefined-locale version rendered differently on Ubuntu CI than on a
    // local Windows run of the exact same code and same test).
    await waitFor(() => expect(screen.getByText("$30")).toBeInTheDocument());
  });

  it("shows a converted estimate alongside the native price when a home currency and a real rate are set", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, priceAmount: 30 }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    getExchangeRate.mockResolvedValue({ from: "USD", to: "CAD", rate: 1.35 });

    renderWithClient(
      <DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} homeCurrency="CAD" />
    );

    await waitFor(() => expect(screen.getByText("$30")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/≈ CA\$41/)).toBeInTheDocument());
  });

  it("shows no converted estimate when no real rate is available for the pair", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, priceAmount: 30 }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    getExchangeRate.mockResolvedValue({ from: "USD", to: "XYZ", rate: null });

    renderWithClient(
      <DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} homeCurrency="XYZ" />
    );

    await waitFor(() => expect(screen.getByText("$30")).toBeInTheDocument());
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });

  it("filters the list by a search query matching the name", async () => {
    listPlaces.mockResolvedValue([PLACE, { ...PLACE, id: "p2", name: "Central Park" }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    await user.type(screen.getByRole("searchbox", { name: "Search places" }), "central");

    expect(screen.queryByText("The Met")).not.toBeInTheDocument();
    expect(screen.getByText("Central Park")).toBeInTheDocument();
  });

  it("filters the list by a search query matching the description", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, description: "A quiet rooftop garden" }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    await user.type(screen.getByRole("searchbox", { name: "Search places" }), "rooftop");

    expect(screen.getByText("The Met")).toBeInTheDocument();
  });

  it("shows a distinct message when a search matches nothing, not the generic ingest-empty message", async () => {
    listPlaces.mockResolvedValue([PLACE]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    await user.type(screen.getByRole("searchbox", { name: "Search places" }), "zzz-nothing-matches");

    expect(screen.queryByText("The Met")).not.toBeInTheDocument();
    expect(screen.getByText(/nothing matches your current filters/i)).toBeInTheDocument();
    expect(screen.queryByText(/run the ingest script/i)).not.toBeInTheDocument();
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
