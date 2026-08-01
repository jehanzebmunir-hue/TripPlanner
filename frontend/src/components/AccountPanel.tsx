import { FormEvent, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { useDeleteTrip, useMyTrips } from "../hooks";

export function AccountPanel({ onOpenTrip }: { onOpenTrip: (tripId: string) => void }) {
  const { user, loading, login, register, logout, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: myTrips } = useMyTrips(!!user && open);
  const deleteTrip = useDeleteTrip();

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

  if (!user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint underline"
        >
          Log in
        </button>
        {open && (
          <div className="absolute right-0 top-6 z-20 w-64 border border-line bg-paper-raised p-4 shadow-md">
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
                Log in
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
                Sign up
              </button>
            </div>
            {mode === "reset" ? (
              resetMessage ? (
                <div className="space-y-2">
                  <p className="text-xs text-ink-soft">{resetMessage}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setResetMessage(null);
                    }}
                    className="font-mono text-[10.5px] uppercase tracking-wide text-accent underline"
                  >
                    Back to log in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2">
                  <p className="text-xs text-ink-soft">We'll email a reset link if that address has an account.</p>
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-line bg-paper px-2.5 py-1.5 text-[13px]"
                  />
                  {error && <p className="text-xs text-stale">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-accent py-1.5 text-xs font-bold text-onaccent disabled:opacity-60"
                  >
                    {submitting ? "…" : "Send reset link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint underline"
                  >
                    Back to log in
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-line bg-paper px-2.5 py-1.5 text-[13px]"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Password (8+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-line bg-paper px-2.5 py-1.5 text-[13px]"
                />
                {error && <p className="text-xs text-stale">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-accent py-1.5 text-xs font-bold text-onaccent disabled:opacity-60"
                >
                  {submitting ? "…" : mode === "login" ? "Log in" : "Create account"}
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
                    Forgot password?
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
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setConfirmingDelete(false);
        }}
        className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint underline"
      >
        {user.email.split("@")[0]} · My Trips
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-20 w-72 border border-line bg-paper-raised p-4 shadow-md">
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-ink-faint">My trips</p>
          {(!myTrips || myTrips.length === 0) && <p className="mb-3 text-xs text-ink-faint">No saved trips yet.</p>}
          <div className="mb-3 space-y-1.5">
            {myTrips?.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpenTrip(t.id);
                    setOpen(false);
                  }}
                  className="flex-1 border border-line bg-paper px-2.5 py-1.5 text-left text-[13px] hover:border-accent"
                >
                  {t.destination}
                  {t.startDate && (
                    <span className="ml-2 font-mono text-[11px] text-ink-faint">{t.startDate.slice(0, 10)}</span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Delete trip to ${t.destination}`}
                  onClick={() => deleteTrip.mutate(t.id)}
                  className="border border-line px-2 py-1.5 text-xs text-stale"
                >
                  ✕
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
              Log out
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={submitting}
              className="font-mono text-[10.5px] uppercase tracking-wide text-stale disabled:opacity-60"
            >
              {confirmingDelete ? "Confirm delete account?" : "Delete account"}
            </button>
          </div>
          {confirmingDelete && (
            <p className="mt-2 text-[11px] text-ink-faint">
              This removes your login only — trips stay saved anonymously at their own URLs.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-stale">{error}</p>}
        </div>
      )}
    </div>
  );
}
