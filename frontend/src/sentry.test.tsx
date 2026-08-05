import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();

vi.mock("@sentry/react", async () => {
  const actual = await vi.importActual<typeof import("@sentry/react")>("@sentry/react");
  return { ...actual, init: (...a: unknown[]) => init(...a) };
});

describe("initSentry", () => {
  beforeEach(() => {
    init.mockReset();
    vi.stubEnv("VITE_SENTRY_DSN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stays a no-op with no real DSN set, same as every other optional integration in this app", async () => {
    const { initSentry } = await import("./sentry");

    initSentry();

    expect(init).not.toHaveBeenCalled();
  });

  it("initializes with the real DSN when one is set", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://real-key@sentry.example.com/1");
    const { initSentry } = await import("./sentry");

    initSentry();

    expect(init).toHaveBeenCalledWith(expect.objectContaining({ dsn: "https://real-key@sentry.example.com/1" }));
  });
});

describe("AppErrorBoundary", () => {
  function Bomb(): never {
    throw new Error("a real render crash");
  }

  it("catches a real render crash and shows a real fallback, even with Sentry never initialized", async () => {
    const { AppErrorBoundary } = await import("./sentry");
    // A thrown render error logs to the console by design (React's own dev
    // warning plus the boundary itself) -- silenced here so the test output
    // isn't misread as this test actually failing.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
