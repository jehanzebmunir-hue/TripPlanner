import * as Sentry from "@sentry/node";
import { Express } from "express";

// Off by default, same pattern as every other optional integration in this
// app (Google Places, email, exchange rates, affiliate tracking) -- inert
// until a real SENTRY_DSN exists, never a placeholder/fake DSN. Error
// capturing only (no performance tracing/tracesSampleRate) -- this app has
// no real need for full APM yet, just visibility into a real crash instead
// of it only ever showing up in a Render log nobody's watching.
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, environment: process.env.NODE_ENV ?? "development" });
}

// Wires Sentry's own Express error-capturing middleware in ahead of this
// app's existing errorHandler (middleware/error.middleware.ts) -- Sentry
// reports the error, then calls next(err) so the existing handler still
// sends the exact same JSON response to the client it always has. A no-op
// if Sentry was never initialized (no DSN set).
export function setupSentryErrorHandler(app: Express): void {
  if (!Sentry.isInitialized()) return;
  Sentry.setupExpressErrorHandler(app);
}
