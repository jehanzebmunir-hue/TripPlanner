import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithClient } from "../test/renderWithClient";
import { AccountPanel } from "./AccountPanel";

const requestPasswordReset = vi.fn();
const myTrips = vi.fn();
const deleteTripApi = vi.fn();

vi.mock("../api", () => ({
  api: {
    requestPasswordReset: (...a: unknown[]) => requestPasswordReset(...a),
    myTrips: (...a: unknown[]) => myTrips(...a),
    deleteTrip: (...a: unknown[]) => deleteTripApi(...a),
  },
}));

const login = vi.fn();
const register = vi.fn();
const logout = vi.fn();
const deleteAccount = vi.fn();
let mockUser: { id: string; email: string } | null = null;

vi.mock("../AuthContext", () => ({
  useAuth: () => ({ user: mockUser, loading: false, login, register, logout, deleteAccount }),
}));

describe("AccountPanel — logged out", () => {
  it("switches to a reset-request form via 'Forgot password?' and shows the generic confirmation", async () => {
    mockUser = null;
    requestPasswordReset.mockResolvedValue({ message: "If that email is registered, a reset link has been sent." });
    const user = userEvent.setup();

    renderWithClient(<AccountPanel onOpenTrip={vi.fn()} />);
    await user.click(screen.getByText(/log in/i));
    await user.click(screen.getByText(/forgot password/i));

    const emailInput = screen.getByPlaceholderText("Email");
    await user.type(emailInput, "someone@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith("someone@example.com");
      expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument();
    });
  });

  it("moves focus to the email field on open and reports expanded state via aria-expanded", async () => {
    mockUser = null;
    const user = userEvent.setup();

    renderWithClient(<AccountPanel onOpenTrip={vi.fn()} />);
    const opener = screen.getByRole("button", { name: /^log in$/i });
    expect(opener).toHaveAttribute("aria-expanded", "false");

    await user.click(opener);

    await waitFor(() => expect(screen.getByPlaceholderText("Email")).toHaveFocus());
  });

  it("closes on Escape", async () => {
    mockUser = null;
    const user = userEvent.setup();

    renderWithClient(<AccountPanel onOpenTrip={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    await waitFor(() => expect(screen.getByPlaceholderText("Email")).toHaveFocus());

    await user.keyboard("{Escape}");

    expect(screen.queryByPlaceholderText("Email")).not.toBeInTheDocument();
  });

  it("closes on an outside click", async () => {
    mockUser = null;
    const user = userEvent.setup();

    renderWithClient(
      <div>
        <AccountPanel onOpenTrip={vi.fn()} />
        <button type="button">outside</button>
      </div>
    );
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    await waitFor(() => expect(screen.getByPlaceholderText("Email")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "outside" }));

    expect(screen.queryByPlaceholderText("Email")).not.toBeInTheDocument();
  });
});

describe("AccountPanel — logged in", () => {
  it("requires a second click to actually delete the account", async () => {
    mockUser = { id: "u1", email: "me@example.com" };
    myTrips.mockResolvedValue([]);
    deleteAccount.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithClient(<AccountPanel onOpenTrip={vi.fn()} />);
    await user.click(screen.getByText(/my trips/i));

    const deleteButton = screen.getByRole("button", { name: /delete account/i });
    await user.click(deleteButton);
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /confirm delete account/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /confirm delete account/i }));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
  });

  it("requires a second click to delete a saved trip -- same safeguard as account deletion, previously missing here", async () => {
    mockUser = { id: "u1", email: "me@example.com" };
    myTrips.mockResolvedValue([{ id: "t1", destination: "Tokyo, Japan", startDate: null }]);
    deleteTripApi.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithClient(<AccountPanel onOpenTrip={vi.fn()} />);
    await user.click(screen.getByText(/my trips/i));

    const deleteButton = await screen.findByRole("button", { name: /delete trip to tokyo/i });
    await user.click(deleteButton);
    expect(deleteTripApi).not.toHaveBeenCalled();

    const confirmButton = screen.getByRole("button", { name: /confirm delete trip to tokyo/i });
    await user.click(confirmButton);

    await waitFor(() => expect(deleteTripApi).toHaveBeenCalledWith("t1"));
  });
});
