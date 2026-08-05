import { ReactNode } from "react";
import * as Sentry from "@sentry/react";

// Off by default, same "no real key, no integration" pattern as every other
// optional service in this app (support link, affiliate tracking) --
// VITE_SENTRY_DSN is a real Vite build-time env var, unset by default.
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, environment: import.meta.env.MODE });
}

// Deliberately plain, dependency-free markup (no i18n, no shared
// components) -- this renders only when something has already gone wrong
// badly enough to crash the whole app, so it can't lean on anything that
// might itself be part of what broke. Verified live (isolated test): a real
// thrown render error is caught and this renders correctly even when
// initSentry() was never called at all (no DSN set) -- Sentry.ErrorBoundary
// is a real crash-safety net on its own merits, reporting to Sentry is the
// bonus on top when configured, not a requirement for the boundary to work.
function AppCrashFallback() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[460px] flex-col items-center justify-center gap-4 bg-paper px-5 text-center text-ink">
      <p className="font-serif text-xl">Something went wrong.</p>
      <p className="text-sm text-ink-soft">
        The page hit a real error and couldn&apos;t continue. Reloading usually fixes it.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="bg-accent px-4 py-2.5 text-sm font-bold text-onaccent"
      >
        Reload
      </button>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return <Sentry.ErrorBoundary fallback={<AppCrashFallback />}>{children}</Sentry.ErrorBoundary>;
}
