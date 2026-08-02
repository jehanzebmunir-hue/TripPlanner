import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { SetupScreen } from "./SetupScreen";

const listCities = vi.fn();
const createTrip = vi.fn();
const listVibes = vi.fn();

vi.mock("../api", () => ({
  api: {
    listCities: (...args: unknown[]) => listCities(...args),
    createTrip: (...args: unknown[]) => createTrip(...args),
    listVibes: (...args: unknown[]) => listVibes(...args),
    recommendDestinations: vi.fn().mockResolvedValue([]),
  },
}));

const CITIES = [
  { slug: "nyc", name: "New York, NY", country: "US", currency: "USD", timezone: "America/New_York" },
  { slug: "paris", name: "Paris, France", country: "FR", currency: "EUR", timezone: "Europe/Paris" },
];

describe("SetupScreen", () => {
  it("defaults the destination to the first city once cities load", async () => {
    listCities.mockResolvedValue(CITIES);
    listVibes.mockResolvedValue([]);

    renderWithClient(<SetupScreen interests={[]} onInterestsChange={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Destination" })).toHaveValue("nyc");
    });
  });

  it("submits the selected city, dates, and interests when the trip is created", async () => {
    listCities.mockResolvedValue(CITIES);
    listVibes.mockResolvedValue([]);
    createTrip.mockResolvedValue({ id: "trip1", city: "paris", destination: "Paris, France", items: [] });
    const onCreated = vi.fn();
    const user = userEvent.setup();

    renderWithClient(<SetupScreen interests={["food-dining"]} onInterestsChange={vi.fn()} onCreated={onCreated} />);

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Destination" })).toHaveValue("nyc"));
    await user.selectOptions(screen.getByRole("combobox", { name: "Destination" }), "paris");
    await user.click(screen.getByRole("button", { name: /see what's on/i }));

    await waitFor(() => {
      expect(createTrip).toHaveBeenCalled();
    });
    expect(createTrip.mock.calls[0][0]).toEqual(
      expect.objectContaining({ city: "paris", destination: "Paris, France", interests: ["food-dining"] })
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it("defaults home currency to USD and submits whichever currency is selected", async () => {
    listCities.mockResolvedValue(CITIES);
    listVibes.mockResolvedValue([]);
    createTrip.mockResolvedValue({ id: "trip1", city: "nyc", destination: "New York, NY", items: [] });
    const user = userEvent.setup();

    renderWithClient(<SetupScreen interests={[]} onInterestsChange={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Your currency" })).toHaveValue("USD"));
    await user.selectOptions(screen.getByRole("combobox", { name: "Your currency" }), "CAD");
    await user.click(screen.getByRole("button", { name: /see everything/i }));

    await waitFor(() => expect(createTrip).toHaveBeenCalled());
    // The last call, not calls[0] -- createTrip's mock.calls accumulates
    // across tests in this file (nothing resets it between them), so an
    // earlier test's call is still index 0 by the time this one runs.
    const lastCall = createTrip.mock.calls[createTrip.mock.calls.length - 1];
    expect(lastCall[0]).toEqual(expect.objectContaining({ homeCurrency: "CAD" }));
  });

  it("adds a leg via 'Add another city' and submits it alongside the primary city", async () => {
    listCities.mockResolvedValue(CITIES);
    listVibes.mockResolvedValue([]);
    createTrip.mockResolvedValue({ id: "trip1", city: "nyc", destination: "New York, NY", items: [] });
    const user = userEvent.setup();

    renderWithClient(<SetupScreen interests={[]} onInterestsChange={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Destination" })).toHaveValue("nyc"));
    await user.click(screen.getByRole("button", { name: /add another city/i }));
    await user.selectOptions(screen.getByRole("combobox", { name: "City 2" }), "paris");
    await user.click(screen.getByRole("button", { name: /see everything/i }));

    await waitFor(() => expect(createTrip).toHaveBeenCalled());
    const lastCall = createTrip.mock.calls[createTrip.mock.calls.length - 1];
    expect(lastCall[0].legs).toEqual([
      expect.objectContaining({ city: "paris", destination: "Paris, France" }),
    ]);
  });

  it("removes a leg via its own 'Remove' button, not submitting it", async () => {
    listCities.mockResolvedValue(CITIES);
    listVibes.mockResolvedValue([]);
    createTrip.mockResolvedValue({ id: "trip1", city: "nyc", destination: "New York, NY", items: [] });
    const user = userEvent.setup();

    renderWithClient(<SetupScreen interests={[]} onInterestsChange={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Destination" })).toHaveValue("nyc"));
    await user.click(screen.getByRole("button", { name: /add another city/i }));
    expect(screen.getByRole("combobox", { name: "City 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove city 2/i }));
    expect(screen.queryByRole("combobox", { name: "City 2" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /see everything/i }));
    await waitFor(() => expect(createTrip).toHaveBeenCalled());
    const lastCall = createTrip.mock.calls[createTrip.mock.calls.length - 1];
    expect(lastCall[0].legs).toEqual([]);
  });

  it("disables submission until a destination is available", async () => {
    listCities.mockResolvedValue([]);
    listVibes.mockResolvedValue([]);

    renderWithClient(<SetupScreen interests={[]} onInterestsChange={vi.fn()} onCreated={vi.fn()} />);

    expect(screen.getByRole("button", { name: /see everything/i })).toBeDisabled();
  });

  it("shows the destination-finder link collapsed by default", async () => {
    listCities.mockResolvedValue(CITIES);
    listVibes.mockResolvedValue([]);

    renderWithClient(<SetupScreen interests={[]} onInterestsChange={vi.fn()} onCreated={vi.fn()} />);

    expect(screen.getByText(/not sure yet\? find a destination/i)).toBeInTheDocument();
    expect(screen.queryByText(/find a destination$/i, { selector: "h3" })).not.toBeInTheDocument();
  });
});
