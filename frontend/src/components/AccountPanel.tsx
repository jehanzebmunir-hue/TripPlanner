import { FormEvent, RefObject, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { useDeleteTrip, useMyTrips } from "../hooks";

export function AccountPanel({ onOpenTrip }: { onOpenTrip: (tripId: string) => void }) {
  const { t } = useTranslation();
  const panelId = useId();
  const { user, loading, login, register, logout, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Which saved trip (by id) is one more click away from being deleted --
  // per-trip, not a single boolean, since more than one trip can be listed
  // at once. Matches account deletion's existing two-click pattern, which
  // this previously didn't (a single click deleted a trip outright).
  const [confirmingDeleteTripId, setConfirmingDeleteTripId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | HTMLButtonElement>(null);

  const { data: myTrips } = useMyTrips(!!user && open);
  const deleteTrip = useDeleteTrip();

  // Real dialog behavior for what's otherwise just an absolutely-positioned
  // div: closing on Escape and on a click outside it, and moving focus in
  // when it opens, rather than leaving a keyboard/screen-reader user
  // stranded on the now-hidden toggle button.
  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (loading) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "reset") {
        const { message } = await api.requestPasswordReset(email);
        setResetMessage(message);
        setEmail("");
      } else {
        if (mode === "login") await login(email, password);
        else await register(email, password);
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSubmitting(true);
    try {
      await deleteAccount();
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
      setConfirmingDelete(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteTrip(tripId: string) {
    if (confirmingDeleteTripId !== tripId) {
      setConfirmingDeleteTripId(tripId);
      return;
    }
    deleteTrip.mutate(tripId);
    setConfirmingDeleteTripId(null);
  }

  if (!user) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint underline"
        >
          {t("account.logIn")}
        </button>
        {open && (
          <div id={panelId} className="absolute right-0 top-6 z-20 w-64 border border-line bg-paper-raised p-4 shadow-md">
            <div className="mb-3 flex gap-3 font-mono text-[11px] uppercase tracking-wide">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setResetMessage(null);
                  setError(null);
                }}
                className={mode === "login" ? "text-accent" : "text-ink-faint"}
              >
                {t("account.logIn")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setResetMessage(null);
                  setError(null);
                }}
                className={mode === "register" ? "text-accent" : "text-ink-faint"}
              >
                {t("account.signUp")}
              </button>
            </div>
            {mode === "reset" ? (
              resetMessage ? (
                <div className="space-y-2">
                  <p role="status" className="text-xs text-ink-soft">
                    {resetMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setResetMessage(null);
                    }}
                    className="font-mono text-[10.5px] uppercase tracking-wide text-accent underline"
                  >
                    {t("account.backToLogIn")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2">
                  <p className="text-xs text-ink-soft">{t("account.resetHint")}</p>
                  <input
                    ref={firstFieldRef as RefObject<HTMLInputElement>}
                    type="email"
                    required
                    placeholder={t("account.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-line bg-paper px-2.5 py-2 text-[13px]"
                  />
                  {error && (
                    <p role="alert" className="text-xs text-stale">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-accent py-2 text-xs font-bold text-onaccent disabled:opacity-60"
                  >
                    {submitting ? t("account.submittingShort") : t("account.sendResetLink")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint underline"
                  >
                    {t("account.backToLogIn")}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2">
                <input
                  ref={firstFieldRef as RefObject<HTMLInputElement>}
                  type="email"
                  required
                  placeholder={t("account.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-line bg-paper px-2.5 py-2 text-[13px]"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder={t("account.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-line bg-paper px-2.5 py-2 text-[13px]"
                />
                {error && (
                  <p role="alert" className="text-xs text-stale">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-accent py-2 text-xs font-bold text-onaccent disabled:opacity-60"
                >
                  {submitting ? t("account.submittingShort") : mode === "login" ? t("account.logIn") : t("account.createAccount")}
                </button>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setError(null);
                    }}
                    className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint underline"
                  >
                    {t("account.forgotPassword")}
                  </button>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setConfirmingDelete(false);
          setConfirmingDeleteTripId(null);
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint underline"
      >
        {t("account.myTripsLink", { name: user.email.split("@")[0] })}
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 top-6 z-20 w-72 border border-line bg-paper-raised p-4 shadow-md">
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-ink-faint">{t("account.myTrips")}</p>
          {(!myTrips || myTrips.length === 0) && <p className="mb-3 text-xs text-ink-faint">{t("account.noSavedTrips")}</p>}
          <div className="mb-3 space-y-1.5">
            {myTrips?.map((trip, i) => (
              <div key={trip.id} className="flex items-center gap-1.5">
                <button
                  ref={i === 0 ? (firstFieldRef as RefObject<HTMLButtonElement>) : undefined}
                  type="button"
                  onClick={() => {
                    onOpenTrip(trip.id);
                    setOpen(false);
                  }}
                  className="flex-1 border border-line bg-paper px-2.5 py-2 text-left text-[13px] hover:border-accent"
                >
                  {trip.destination}
                  {trip.startDate && (
                    <span className="ml-2 font-mono text-[11px] text-ink-faint">{trip.startDate.slice(0, 10)}</span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={
                    confirmingDeleteTripId === trip.id
                      ? t("account.confirmDeleteTrip", { destination: trip.destination })
                      : t("account.deleteTrip", { destination: trip.destination })
                  }
                  onClick={() => handleDeleteTrip(trip.id)}
                  className={`shrink-0 border px-2 py-2 text-xs ${
                    confirmingDeleteTripId === trip.id ? "border-stale bg-stale-bg text-stale" : "border-line text-stale"
                  }`}
                >
                  {confirmingDeleteTripId === trip.id ? t("account.confirmDeleteTripShort") : "✕"}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="font-mono text-[10.5px] uppercase tracking-wide text-stale"
            >
              {t("account.logOut")}
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={submitting}
              className="font-mono text-[10.5px] uppercase tracking-wide text-stale disabled:opacity-60"
            >
              {confirmingDelete ? t("account.confirmDeleteAccount") : t("account.deleteAccount")}
            </button>
          </div>
          {confirmingDelete && (
            <p className="mt-2 text-[11px] text-ink-faint">{t("account.deleteAccountHint")}</p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-xs text-stale">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
