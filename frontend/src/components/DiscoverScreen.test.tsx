import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { setLanguage } from "../i18n";
import { DiscoverScreen } from "./DiscoverScreen";

const listPlaces = vi.fn();
const getCityHealth = vi.fn();
const listCities = vi.fn();
const getExchangeRate = vi.fn().mockResolvedValue({ from: "USD", to: "USD", rate: null });
const addItem = vi.fn();
const removeItem = vi.fn();

vi.mock("../api", () => ({
  api: {
    listPlaces: (...args: unknown[]) => listPlaces(...args),
    getCityHealth: (...args: unknown[]) => getCityHealth(...args),
    listCities: (...args: unknown[]) => listCities(...args),
    getExchangeRate: (...args: unknown[]) => getExchangeRate(...args),
    addItem: (...args: unknown[]) => addItem(...args),
    removeItem: (...args: unknown[]) => removeItem(...args),
    confirmPlace: vi.fn(),
  },
}));

const trackEvent = vi.fn();
vi.mock("../analytics", () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }));

const CITIES = [
  { slug: "nyc", name: "New York, NY", country: "US", currency: "USD", timezone: "America/New_York" },
  { slug: "paris", name: "Paris, France", country: "FR", currency: "EUR", timezone: "Europe/Paris" },
];

const LEGS = [{ id: "leg-paris", city: "paris", destination: "Paris, France", startDate: null, endDate: null, order: 0 }];

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

  it("shows no confirmation badge for a place with zero real recent confirmations -- the common case", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, recentConfirmations: 0 }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await screen.findByText("The Met");
    expect(screen.queryByText(/confirmed by/i)).not.toBeInTheDocument();
  });

  it("shows a real, singular/plural-correct confirmation badge from real backend counts", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, recentConfirmations: 2 }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    expect(await screen.findByText(/confirmed by 2 visitors/i)).toBeInTheDocument();
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

  it("formats price using the app's own active language, not a hardcoded locale, once switched to Spanish", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, priceAmount: 30 }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    setLanguage("es");

    try {
      renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

      // Verified directly (Intl.NumberFormat("es", ...).format(30) with
      // currency USD): Spanish convention puts the amount before the
      // symbol, "30 US$", not English's "$30" -- a real, visible difference
      // proving this is driven by i18n.language, not still pinned to "en-US".
      await waitFor(() => expect(screen.getByText("30 US$")).toBeInTheDocument());
    } finally {
      setLanguage("en"); // reset for every other test in the suite, which assumes English
    }
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

  it("shows a real photo when the place has one", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, photoUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/example.jpg" }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    const img = document.querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toBe("https://commons.wikimedia.org/wiki/Special:FilePath/example.jpg");
  });

  it("shows no photo element at all when the place has none, not a placeholder", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, photoUrl: null }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    expect(document.querySelector("img")).toBeNull();
  });

  it("hides a real photo that fails to load rather than showing a broken image", async () => {
    listPlaces.mockResolvedValue([{ ...PLACE, photoUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/gone.jpg" }]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    const img = document.querySelector("img") as HTMLImageElement;
    fireEvent.error(img);

    await waitFor(() => expect(document.querySelector("img")).toBeNull());
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

  it("shows no city switcher for a single-city trip (no legs)", async () => {
    listPlaces.mockResolvedValue([PLACE]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /paris/i })).not.toBeInTheDocument();
  });

  it("shows a city switcher for a multi-city trip and re-fetches places for whichever city is selected", async () => {
    listPlaces.mockImplementation((city: string) =>
      Promise.resolve(city === "paris" ? [{ ...PLACE, id: "p2", city: "paris", name: "Louvre" }] : [PLACE])
    );
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(
      <DiscoverScreen city="nyc" legs={LEGS} interests={[]} tripId="t1" addedIds={new Set()} />
    );

    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Paris, France" }));

    await waitFor(() => expect(screen.getByText("Louvre")).toBeInTheDocument());
    expect(screen.queryByText("The Met")).not.toBeInTheDocument();
  });

  it("offers a real Undo after removing a place, and re-adds it on click", async () => {
    listPlaces.mockResolvedValue([PLACE]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    removeItem.mockResolvedValue(undefined);
    addItem.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set(["p1"])} />);
    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /added/i }));

    expect(removeItem).toHaveBeenCalledWith("t1", "p1");
    expect(screen.getByText(/removed the met/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /undo/i }));

    expect(addItem).toHaveBeenCalledWith("t1", "p1");
    expect(screen.queryByText(/removed the met/i)).not.toBeInTheDocument();
  });

  it("sorts by price low to high, keeping unverified prices at the end rather than treating them as free", async () => {
    listPlaces.mockResolvedValue([
      { ...PLACE, id: "p1", name: "Unverified", priceAmount: null },
      { ...PLACE, id: "p2", name: "Pricier", priceAmount: 40 },
      { ...PLACE, id: "p3", name: "Cheaper", priceAmount: 10 },
    ]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);
    await waitFor(() => expect(screen.getByText("Unverified")).toBeInTheDocument());

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "price");

    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(["Cheaper", "Pricier", "Unverified"]);
  });

  it("sorts by distance from the active city's center, using real coordinates on both sides", async () => {
    listPlaces.mockResolvedValue([
      { ...PLACE, id: "p1", name: "Far", lat: 40.9, lng: -74.3 },
      { ...PLACE, id: "p2", name: "No coords" },
      { ...PLACE, id: "p3", name: "Near", lat: 40.72, lng: -74.0 },
    ]);
    listCities.mockResolvedValue([{ ...CITIES[0], lat: 40.7128, lng: -74.006 }, CITIES[1]]);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);
    await waitFor(() => expect(screen.getByText("Far")).toBeInTheDocument());

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "distance");

    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(["Near", "Far", "No coords"]);
  });

  it("hides the map by default and tracks a real event when a user actually opens it", async () => {
    listPlaces.mockResolvedValue([PLACE]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);
    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());

    expect(document.querySelector(".leaflet-container")).toBeNull();
    expect(trackEvent).not.toHaveBeenCalledWith("map_toggled", expect.anything());

    await user.click(screen.getByRole("button", { name: /show map/i }));

    expect(trackEvent).toHaveBeenCalledWith("map_toggled", "discover");
  });

  it("tracks a real event with the chosen sort mode when sort changes", async () => {
    listPlaces.mockResolvedValue([PLACE]);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);
    await waitFor(() => expect(screen.getByText("The Met")).toBeInTheDocument());

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "confidence");

    expect(trackEvent).toHaveBeenCalledWith("sort_changed", "confidence");
  });

  it("caps the initial render at a real page size and reveals the rest via Load more, rather than rendering everything at once", async () => {
    const manyPlaces = Array.from({ length: 30 }, (_, i) => ({ ...PLACE, id: `p${i}`, name: `Place ${i}` }));
    listPlaces.mockResolvedValue(manyPlaces);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);
    await waitFor(() => expect(screen.getByText("Place 0")).toBeInTheDocument());

    expect(screen.getAllByText(/^Place \d+$/)).toHaveLength(24);
    expect(screen.queryByText("Place 24")).not.toBeInTheDocument();
    const loadMore = screen.getByRole("button", { name: /load more/i });
    expect(loadMore).toHaveTextContent("6"); // 30 - 24 remaining

    await user.click(loadMore);

    expect(screen.getAllByText(/^Place \d+$/)).toHaveLength(30);
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("resets back to the first page when the search query changes", async () => {
    const manyPlaces = Array.from({ length: 30 }, (_, i) => ({ ...PLACE, id: `p${i}`, name: `Place ${i}` }));
    listPlaces.mockResolvedValue(manyPlaces);
    listCities.mockResolvedValue(CITIES);
    getCityHealth.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DiscoverScreen city="nyc" interests={[]} tripId="t1" addedIds={new Set()} />);
    await waitFor(() => expect(screen.getByText("Place 0")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(screen.getAllByText(/^Place \d+$/)).toHaveLength(30);

    await user.type(screen.getByRole("searchbox"), "Place 1");

    // Real matches for "Place 1" (Place 1, 10-19) are fewer than a full page,
    // so no stale "showing 30" carries over from before the search.
    await waitFor(() => expect(screen.queryByText("Place 0")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });
});
