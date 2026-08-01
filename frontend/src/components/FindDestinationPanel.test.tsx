import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { FindDestinationPanel } from "./FindDestinationPanel";

const listVibes = vi.fn();
const recommendDestinations = vi.fn();

vi.mock("../api", () => ({
  api: {
    listVibes: (...args: unknown[]) => listVibes(...args),
    recommendDestinations: (...args: unknown[]) => recommendDestinations(...args),
  },
}));

const VIBES = [
  { slug: "culture", label: "History & Culture" },
  { slug: "adventure", label: "Outdoor & Adventure" },
];

const MATCH = {
  slug: "kyoto",
  name: "Kyoto, Japan",
  country: "JP",
  budgetTier: "premium" as const,
  bestSeason: "Mar–Apr, Oct–Nov",
  matchingPlaceCount: 3,
  totalPlaceCount: 4,
  rationale: '3 of 4 ingested places are tagged "History & Culture"',
};

describe("FindDestinationPanel", () => {
  it("starts collapsed, showing only the entry-point link", () => {
    listVibes.mockResolvedValue(VIBES);
    renderWithClient(<FindDestinationPanel onPick={vi.fn()} />);

    expect(screen.getByText(/not sure yet\? find a destination/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /find a destination/i })).not.toBeInTheDocument();
  });

  it("opens on click and lists real vibe options, not a fabricated taxonomy", async () => {
    listVibes.mockResolvedValue(VIBES);
    recommendDestinations.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<FindDestinationPanel onPick={vi.fn()} />);
    await user.click(screen.getByText(/not sure yet\? find a destination/i));

    await waitFor(() => {
      expect(screen.getByText("History & Culture")).toBeInTheDocument();
      expect(screen.getByText("Outdoor & Adventure")).toBeInTheDocument();
    });
  });

  it("shows ranked matches with their real rationale, and hands the picked slug back on click", async () => {
    listVibes.mockResolvedValue(VIBES);
    recommendDestinations.mockResolvedValue([MATCH]);
    const onPick = vi.fn();
    const user = userEvent.setup();

    renderWithClient(<FindDestinationPanel onPick={onPick} />);
    await user.click(screen.getByText(/not sure yet\? find a destination/i));
    await user.click(await screen.findByText("History & Culture"));

    await waitFor(() => {
      expect(screen.getByText(/Kyoto, Japan/)).toBeInTheDocument();
      expect(screen.getByText(/3 of 4 ingested places/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Kyoto, Japan/));
    expect(onPick).toHaveBeenCalledWith("kyoto");
  });

  it("shows a plain no-match message rather than a fabricated result when nothing matches", async () => {
    listVibes.mockResolvedValue(VIBES);
    recommendDestinations.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<FindDestinationPanel onPick={vi.fn()} />);
    await user.click(screen.getByText(/not sure yet\? find a destination/i));

    await waitFor(() => {
      expect(screen.getByText(/no ingested cities match/i)).toBeInTheDocument();
    });
  });
});
