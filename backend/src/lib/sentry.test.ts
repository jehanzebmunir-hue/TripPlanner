import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
const isInitialized = vi.fn();
const setupExpressErrorHandler = vi.fn();

vi.mock("@sentry/node", () => ({
  init: (...a: unknown[]) => init(...a),
  isInitialized: (...a: unknown[]) => isInitialized(...a),
  setupExpressErrorHandler: (...a: unknown[]) => setupExpressErrorHandler(...a),
}));

describe("initSentry", () => {
  const originalDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    init.mockReset();
  });

  afterEach(() => {
    process.env.SENTRY_DSN = originalDsn;
  });

  it("stays a no-op with no real DSN set, same as every other optional integration in this app", async () => {
    delete process.env.SENTRY_DSN;
    const { initSentry } = await import("./sentry");

    initSentry();

    expect(init).not.toHaveBeenCalled();
  });

  it("initializes with the real DSN when one is set", async () => {
    process.env.SENTRY_DSN = "https://real-key@sentry.example.com/1";
    const { initSentry } = await import("./sentry");

    initSentry();

    expect(init).toHaveBeenCalledWith(expect.objectContaining({ dsn: "https://real-key@sentry.example.com/1" }));
  });
});

describe("setupSentryErrorHandler", () => {
  beforeEach(() => {
    isInitialized.mockReset();
    setupExpressErrorHandler.mockReset();
  });

  it("never touches the app when Sentry was never initialized", async () => {
    isInitialized.mockReturnValue(false);
    const { setupSentryErrorHandler } = await import("./sentry");
    const fakeApp = {} as never;

    setupSentryErrorHandler(fakeApp);

    expect(setupExpressErrorHandler).not.toHaveBeenCalled();
  });

  it("wires the real Sentry Express error handler once initialized", async () => {
    isInitialized.mockReturnValue(true);
    const { setupSentryErrorHandler } = await import("./sentry");
    const fakeApp = {} as never;

    setupSentryErrorHandler(fakeApp);

    expect(setupExpressErrorHandler).toHaveBeenCalledWith(fakeApp);
  });
});
