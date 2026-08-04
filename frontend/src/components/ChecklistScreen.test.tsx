import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { ChecklistScreen } from "./ChecklistScreen";
import { ChecklistResponse } from "../types";

const getChecklist = vi.fn();
const toggleChecklistItem = vi.fn();
const prefetchForOffline = vi.fn();

vi.mock("../api", () => ({
  api: {
    getChecklist: (...args: unknown[]) => getChecklist(...args),
    toggleChecklistItem: (...args: unknown[]) => toggleChecklistItem(...args),
    prefetchForOffline: (...args: unknown[]) => prefetchForOffline(...args),
  },
}));

const EMPTY_PACKING: ChecklistResponse["packing"] = {
  source: null,
  avgHighC: null,
  avgLowC: null,
  rainChancePercent: null,
  items: [],
};

function checklist(overrides: Partial<ChecklistResponse> = {}): ChecklistResponse {
  return {
    fromItinerary: [],
    weeksOut: [],
    dayOf: [],
    packing: EMPTY_PACKING,
    ...overrides,
  };
}

describe("ChecklistScreen", () => {
  it("shows no Packing section when there's no real weather data", async () => {
    getChecklist.mockResolvedValue(checklist());
    renderWithClient(<ChecklistScreen tripId="t1" city="nyc" />);

    await screen.findByText("From your itinerary");
    expect(screen.queryByText("Packing")).not.toBeInTheDocument();
  });

  it("renders real forecast-based packing items with a real, sourced hint", async () => {
    getChecklist.mockResolvedValue(
      checklist({
        packing: {
          source: "forecast",
          avgHighC: 30,
          avgLowC: 22,
          rainChancePercent: 61,
          items: [
            { id: "weather-rain", type: "rain", checked: false },
            { id: "weather-sun-protection", type: "sun-protection", checked: true },
          ],
        },
      })
    );
    renderWithClient(<ChecklistScreen tripId="t1" city="nyc" />);

    await screen.findByText("Packing");
    expect(screen.getByText("Pack a rain jacket or umbrella")).toBeInTheDocument();
    expect(screen.getByText("Real forecast: 61% chance of rain")).toBeInTheDocument();
    expect(screen.getByText("Pack sun protection")).toBeInTheDocument();
    // 30°C -> 86°F, a real deterministic conversion, not a guess
    expect(screen.getByText("Real forecast: avg high 30°C (86°F)")).toBeInTheDocument();

    const sunCheckbox = screen.getByRole("checkbox", { name: /pack sun protection/i });
    expect(sunCheckbox).toBeChecked();
  });

  it("labels a historical-average summary distinctly from a real forecast", async () => {
    getChecklist.mockResolvedValue(
      checklist({
        packing: {
          source: "historical-average",
          avgHighC: null,
          avgLowC: 3,
          rainChancePercent: null,
          items: [{ id: "weather-warm-layer", type: "warm-layer", checked: false }],
        },
      })
    );
    renderWithClient(<ChecklistScreen tripId="t1" city="nyc" />);

    await screen.findByText("Packing");
    expect(screen.getByText("Historical average for these dates: avg low 3°C (37°F)")).toBeInTheDocument();
  });

  it("toggles a packing item through the same real endpoint as every other checklist item", async () => {
    const user = userEvent.setup();
    getChecklist.mockResolvedValue(
      checklist({
        packing: {
          source: "forecast",
          avgHighC: 30,
          avgLowC: 22,
          rainChancePercent: 61,
          items: [{ id: "weather-rain", type: "rain", checked: false }],
        },
      })
    );
    renderWithClient(<ChecklistScreen tripId="t1" city="nyc" />);

    await user.click(await screen.findByRole("checkbox", { name: /pack a rain jacket/i }));

    expect(toggleChecklistItem).toHaveBeenCalledWith("t1", "weather-rain", true);
  });
});
