import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { Trip } from "../types";
import { EditTripPanel } from "./EditTripPanel";

const updateTripApi = vi.fn();

vi.mock("../api", () => ({
  api: { updateTrip: (...a: unknown[]) => updateTripApi(...a) },
}));

const TRIP: Trip = {
  id: "trip1",
  city: "tokyo",
  destination: "Tokyo, Japan",
  startDate: "2026-10-09T00:00:00.000Z",
  endDate: "2026-10-11T00:00:00.000Z",
  interests: [],
  homeCurrency: "USD",
  legs: [
    { id: "leg1", city: "osaka", destination: "Osaka, Japan", startDate: "2026-10-12T00:00:00.000Z", endDate: "2026-10-13T00:00:00.000Z", order: 0 },
  ],
  items: [],
};

describe("EditTripPanel", () => {
  beforeEach(() => {
    updateTripApi.mockReset();
  });

  it("is collapsed by default", () => {
    renderWithClient(<EditTripPanel trip={TRIP} />);

    expect(screen.getByText(/edit trip dates/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Start date")).not.toBeInTheDocument();
  });

  it("opens pre-filled with the trip's real current values", async () => {
    const user = userEvent.setup();
    renderWithClient(<EditTripPanel trip={TRIP} />);

    await user.click(screen.getByText(/edit trip dates/i));

    expect(screen.getByLabelText("Start date")).toHaveValue("2026-10-09");
    expect(screen.getByLabelText("End date")).toHaveValue("2026-10-11");
    expect(screen.getByLabelText("Your currency")).toHaveValue("USD");
    expect(screen.getByLabelText("Osaka, Japan start date")).toHaveValue("2026-10-12");
  });

  it("saves real changes and closes on success", async () => {
    updateTripApi.mockResolvedValue({ ...TRIP, homeCurrency: "CAD" });
    const user = userEvent.setup();
    renderWithClient(<EditTripPanel trip={TRIP} />);

    await user.click(screen.getByText(/edit trip dates/i));
    await user.selectOptions(screen.getByLabelText("Your currency"), "CAD");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updateTripApi).toHaveBeenCalledWith(
        "trip1",
        expect.objectContaining({ homeCurrency: "CAD", startDate: "2026-10-09", endDate: "2026-10-11" })
      );
    });
    await waitFor(() => expect(screen.queryByLabelText("Your currency")).not.toBeInTheDocument());
  });

  it("blocks saving and shows a real error when a leg's end date is before its start", async () => {
    const user = userEvent.setup();
    renderWithClient(<EditTripPanel trip={TRIP} />);

    await user.click(screen.getByText(/edit trip dates/i));
    const legEnd = screen.getByLabelText("Osaka, Japan end date");
    await user.clear(legEnd);
    await user.type(legEnd, "2020-01-01");

    expect(screen.getByRole("alert")).toHaveTextContent(/end date can't be before/i);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    expect(updateTripApi).not.toHaveBeenCalled();
  });

  it("shows a real backend error rather than pretending the save succeeded", async () => {
    updateTripApi.mockRejectedValue(new Error("2 item(s) would fall outside the new date range — move or remove them first"));
    const user = userEvent.setup();
    renderWithClient(<EditTripPanel trip={TRIP} />);

    await user.click(screen.getByText(/edit trip dates/i));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/would fall outside the new date range/i)).toBeInTheDocument();
    });
    // Stays open on failure -- a lost edit would be worse than a visible error.
    expect(screen.getByLabelText("Your currency")).toBeInTheDocument();
  });
});
