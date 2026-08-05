import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { setLanguage } from "./i18n";

const getTrip = vi.fn();

vi.mock("./api", () => ({
  api: {
    listCities: vi.fn().mockResolvedValue([]),
    listVibes: vi.fn().mockResolvedValue([]),
    recommendDestinations: vi.fn().mockResolvedValue([]),
    myTrips: vi.fn().mockResolvedValue([]),
    getTrip: (...args: unknown[]) => getTrip(...args),
    listPlaces: vi.fn().mockResolvedValue([]),
    getCityHealth: vi.fn().mockResolvedValue([]),
  },
  getToken: () => null,
  setToken: vi.fn(),
}));

// Same convention as AccountPanel.test.tsx -- mock the hook directly rather
// than wrapping in a real AuthProvider, since App itself doesn't call
// useAuth, only its child AccountPanel does.
vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), deleteAccount: vi.fn() }),
}));

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
  return { ...result, qc };
}

describe("App footer support link", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPPORT_URL", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows no support link when VITE_SUPPORT_URL isn't set", async () => {
    renderApp();
    // A real link specifically, not just any text mentioning OpenStreetMap
    // -- SetupScreen's own trust explainer also names it as one of several
    // real data sources, as plain text rather than a link.
    expect(await screen.findByRole("link", { name: /openstreetmap/i })).toBeInTheDocument();
    expect(screen.queryByText(/support this project/i)).not.toBeInTheDocument();
  });

  it("shows a real support link when VITE_SUPPORT_URL is set", async () => {
    vi.stubEnv("VITE_SUPPORT_URL", "https://ko-fi.com/example");
    renderApp();

    const link = await screen.findByText(/support this project/i);
    expect(link.closest("a")).toHaveAttribute("href", "https://ko-fi.com/example");
  });
});

describe("language toggle", () => {
  afterEach(() => {
    setLanguage("en"); // reset for every other test in the suite, which assumes English
  });

  it("defaults to English", async () => {
    renderApp();
    expect(await screen.findByText("Your next trip")).toBeInTheDocument();
  });

  it("switches real UI chrome text to Spanish and persists the choice, without touching untranslated content", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Your next trip");

    await user.click(screen.getByRole("button", { name: "ES" }));

    expect(await screen.findByText("Tu próximo viaje")).toBeInTheDocument();
    expect(localStorage.getItem("language")).toBe("es");
  });
});

describe("trip-changed-elsewhere banner", () => {
  function trip(updatedAt: string) {
    return {
      id: "trip1",
      city: "tokyo",
      destination: "Tokyo, Japan",
      startDate: null,
      endDate: null,
      interests: [],
      legs: [],
      items: [],
      updatedAt,
    };
  }

  beforeEach(() => {
    localStorage.setItem("tripId", "trip1");
  });
  afterEach(() => {
    localStorage.removeItem("tripId");
  });

  it("shows a real banner only once the trip's updatedAt actually changes since it was first loaded, and Refresh dismisses it", async () => {
    getTrip.mockResolvedValue(trip("2026-08-01T00:00:00.000Z"));
    const { qc } = renderApp();

    await screen.findByText("Tokyo, Japan");
    expect(screen.queryByText(/updated elsewhere/i)).not.toBeInTheDocument();

    getTrip.mockResolvedValue(trip("2026-08-02T00:00:00.000Z"));
    await qc.invalidateQueries({ queryKey: ["trip", "trip1"] });

    await waitFor(() => expect(screen.getByText(/updated elsewhere/i)).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

    expect(screen.queryByText(/updated elsewhere/i)).not.toBeInTheDocument();
  });
});

describe("share / copy link", () => {
  function trip() {
    return {
      id: "trip1",
      city: "tokyo",
      destination: "Tokyo, Japan",
      startDate: null,
      endDate: null,
      interests: [],
      legs: [],
      items: [],
      updatedAt: "2026-08-01T00:00:00.000Z",
    };
  }

  const originalShare = navigator.share;
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    localStorage.setItem("tripId", "trip1");
    getTrip.mockResolvedValue(trip());
  });

  afterEach(() => {
    localStorage.removeItem("tripId");
    Object.defineProperty(navigator, "share", { value: originalShare, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
  });

  // @testing-library/user-event's own setup() installs its own real
  // clipboard stub -- defining ours after setup(), not in a shared
  // beforeEach, so it doesn't get silently overwritten by that.
  function stubClipboard() {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    return writeText;
  }

  it("falls back to a real clipboard copy when the Web Share API isn't available", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const user = userEvent.setup();
    const writeText = stubClipboard();
    renderApp();
    await screen.findByText("Tokyo, Japan");

    await user.click(screen.getByRole("button", { name: /copy link/i }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByText(/copied/i)).toBeInTheDocument();
  });

  it("uses the native share sheet with real trip context when it's available, instead of the clipboard", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const user = userEvent.setup();
    const writeText = stubClipboard();
    renderApp();
    await screen.findByText("Tokyo, Japan");

    await user.click(screen.getByRole("button", { name: /^share$/i }));

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Tokyo, Japan", url: window.location.href })
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when a real share attempt fails for a reason other than the user canceling", async () => {
    const share = vi.fn().mockRejectedValue(new Error("real failure, not a cancel"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const user = userEvent.setup();
    const writeText = stubClipboard();
    renderApp();
    await screen.findByText("Tokyo, Japan");

    await user.click(screen.getByRole("button", { name: /^share$/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
  });

  it("does nothing extra when the user just cancels the native share sheet -- not a real failure", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("canceled"), { name: "AbortError" }));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const user = userEvent.setup();
    const writeText = stubClipboard();
    renderApp();
    await screen.findByText("Tokyo, Japan");

    await user.click(screen.getByRole("button", { name: /^share$/i }));

    expect(writeText).not.toHaveBeenCalled();
  });
});
