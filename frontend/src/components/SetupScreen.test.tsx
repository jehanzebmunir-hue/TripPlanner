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
      expect(screen.getByRole("combobox")).toHaveValue("nyc");
    });
  });

  it("submits the selected city, dates, and interests when the trip is created", async () => {
    listCities.mockResolvedValue(CITIES);
    listVibes.mockResolvedValue([]);
    createTrip.mockResolvedValue({ id: "trip1", city: "paris", destination: "Paris, France", items: [] });
    const onCreated = vi.fn();
    const user = userEvent.setup();

    renderWithClient(<SetupScreen interests={["food-dining"]} onInterestsChange={vi.fn()} onCreated={onCreated} />);

    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("nyc"));
    await user.selectOptions(screen.getByRole("combobox"), "paris");
    await user.click(screen.getByRole("button", { name: /see what's on/i }));

    await waitFor(() => {
      expect(createTrip).toHaveBeenCalled();
    });
    expect(createTrip.mock.calls[0][0]).toEqual(
      expect.objectContaining({ city: "paris", destination: "Paris, France", interests: ["food-dining"] })
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
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
