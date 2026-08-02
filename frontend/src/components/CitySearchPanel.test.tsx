import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CitySearchPanel } from "./CitySearchPanel";

const searchCities = vi.fn();

vi.mock("../api", () => ({
  api: { searchCities: (...args: unknown[]) => searchCities(...args) },
}));

describe("CitySearchPanel", () => {
  beforeEach(() => {
    searchCities.mockReset();
  });

  it("is collapsed by default, showing only the opener link", () => {
    render(<CitySearchPanel onPick={vi.fn()} />);

    expect(screen.getByText(/not on the list\? search any place/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Search any place")).not.toBeInTheDocument();
  });

  it("searches after typing and calls onPick with the chosen city, then collapses again", async () => {
    searchCities.mockResolvedValue([
      { slug: "hallstatt-at", name: "Hallstatt, Austria", country: "AT", currency: "EUR", timezone: "Europe/Vienna", dataSource: "community" },
    ]);
    const onPick = vi.fn();
    const user = userEvent.setup();

    render(<CitySearchPanel onPick={onPick} />);
    await user.click(screen.getByText(/not on the list\? search any place/i));
    await user.type(screen.getByLabelText("Search any place"), "Hallstatt");

    await waitFor(() => expect(searchCities).toHaveBeenCalledWith("Hallstatt"));
    await waitFor(() => expect(screen.getByText("Hallstatt, Austria")).toBeInTheDocument());

    await user.click(screen.getByText("Hallstatt, Austria"));

    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "hallstatt-at", name: "Hallstatt, Austria" })
    );
    expect(screen.queryByLabelText("Search any place")).not.toBeInTheDocument();
  });

  it("never searches on fewer than 2 characters", async () => {
    const user = userEvent.setup();
    render(<CitySearchPanel onPick={vi.fn()} />);

    await user.click(screen.getByText(/not on the list\? search any place/i));
    await user.type(screen.getByLabelText("Search any place"), "H");

    await new Promise((r) => setTimeout(r, 400));
    expect(searchCities).not.toHaveBeenCalled();
  });

  it("shows a real 'OSM only' marker for a community result, not for a curated one", async () => {
    searchCities.mockResolvedValue([
      { slug: "paris", name: "Paris, France", country: "FR", currency: "EUR", timezone: "Europe/Paris", dataSource: "curated" },
      { slug: "hallstatt-at", name: "Hallstatt, Austria", country: "AT", currency: "EUR", timezone: "Europe/Vienna", dataSource: "community" },
    ]);
    const user = userEvent.setup();

    render(<CitySearchPanel onPick={vi.fn()} />);
    await user.click(screen.getByText(/not on the list\? search any place/i));
    await user.type(screen.getByLabelText("Search any place"), "pa");

    await waitFor(() => expect(screen.getByText("Paris, France")).toBeInTheDocument());
    const parisCard = screen.getByText("Paris, France").closest("button")!;
    const hallstattCard = screen.getByText("Hallstatt, Austria").closest("button")!;
    expect(parisCard.textContent).not.toMatch(/OSM only/);
    expect(hallstattCard.textContent).toMatch(/OSM only/);
  });

  it("shows a real empty state when a search legitimately finds nothing", async () => {
    searchCities.mockResolvedValue([]);
    const user = userEvent.setup();

    render(<CitySearchPanel onPick={vi.fn()} />);
    await user.click(screen.getByText(/not on the list\? search any place/i));
    await user.type(screen.getByLabelText("Search any place"), "zzzznowhere");

    await waitFor(() => expect(screen.getByText(/no matches found/i)).toBeInTheDocument());
  });

  it("moves focus into the search input on open and reports its expanded state via aria-expanded", async () => {
    const user = userEvent.setup();
    render(<CitySearchPanel onPick={vi.fn()} />);

    const opener = screen.getByText(/not on the list\? search any place/i);
    expect(opener).toHaveAttribute("aria-expanded", "false");

    await user.click(opener);

    await waitFor(() => expect(screen.getByLabelText("Search any place")).toHaveFocus());
    expect(screen.getByRole("button", { name: /close/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape from within the search input", async () => {
    const user = userEvent.setup();
    render(<CitySearchPanel onPick={vi.fn()} />);

    await user.click(screen.getByText(/not on the list\? search any place/i));
    await user.keyboard("{Escape}");

    expect(screen.queryByLabelText("Search any place")).not.toBeInTheDocument();
  });
});
