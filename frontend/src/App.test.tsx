import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./api", () => ({
  api: {
    listCities: vi.fn().mockResolvedValue([]),
    listVibes: vi.fn().mockResolvedValue([]),
    recommendDestinations: vi.fn().mockResolvedValue([]),
    myTrips: vi.fn().mockResolvedValue([]),
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
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
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
    expect(await screen.findByText(/openstreetmap/i)).toBeInTheDocument();
    expect(screen.queryByText(/support this project/i)).not.toBeInTheDocument();
  });

  it("shows a real support link when VITE_SUPPORT_URL is set", async () => {
    vi.stubEnv("VITE_SUPPORT_URL", "https://ko-fi.com/example");
    renderApp();

    const link = await screen.findByText(/support this project/i);
    expect(link.closest("a")).toHaveAttribute("href", "https://ko-fi.com/example");
  });
});
