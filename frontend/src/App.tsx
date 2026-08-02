import { useEffect, useState } from "react";
import { setEditToken } from "./api";
import { AccountPanel } from "./components/AccountPanel";
import { ChecklistScreen } from "./components/ChecklistScreen";
import { DiscoverScreen } from "./components/DiscoverScreen";
import { ItineraryScreen } from "./components/ItineraryScreen";
import { SetupScreen } from "./components/SetupScreen";
import { useCities, useTrip } from "./hooks";
import { CreatedTrip } from "./types";
import { useOnlineStatus } from "./useOnlineStatus";

type Tab = "setup" | "discover" | "itinerary" | "checklist";

const TABS: Tab[] = ["setup", "discover", "itinerary", "checklist"];

function tripIdFromUrl(): string | undefined {
  return window.location.pathname.match(/^\/trip\/([^/]+)/)?.[1];
}

export default function App() {
  const [tripId, setTripIdState] = useState<string | undefined>(
    () => tripIdFromUrl() ?? localStorage.getItem("tripId") ?? undefined
  );
  const [interests, setInterests] = useState<string[]>(() => {
    const raw = localStorage.getItem("interests");
    return raw ? (JSON.parse(raw) as string[]) : [];
  });
  const [tab, setTab] = useState<Tab>(tripId ? "discover" : "setup");
  const [copied, setCopied] = useState(false);

  const { data: trip } = useTrip(tripId);
  const { data: cities } = useCities();
  const online = useOnlineStatus();
  const tripCurrency = cities?.find((c) => c.slug === trip?.city)?.currency;

  useEffect(() => {
    localStorage.setItem("interests", JSON.stringify(interests));
  }, [interests]);

  function setTripId(id: string) {
    setTripIdState(id);
    localStorage.setItem("tripId", id);
    window.history.pushState({}, "", `/trip/${id}`);
  }

  function handleCreated(newTrip: CreatedTrip) {
    // The ONE time this is ever available -- see api.ts/types.ts. Must be
    // persisted right now; there's no way to fetch it again afterward.
    setEditToken(newTrip.editToken);
    setTripId(newTrip.id);
    setTab("discover");
  }

  function openTrip(id: string) {
    // Opening a different trip than whichever one's edit token (if any) is
    // currently stored -- that token belongs to a different trip now and
    // sending it here would just be ignored (see assertCanEdit), but
    // clearing it is more honest than leaving a stale, irrelevant value
    // sitting in storage.
    setEditToken(null);
    setTripId(id);
    setTab("discover");
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const addedIds = new Set(trip?.items.map((i) => i.placeId) ?? []);

  return (
    <div className="mx-auto flex min-h-screen max-w-[460px] flex-col">
      {!online && (
        <div className="bg-aging-bg px-5 py-1.5 text-center font-mono text-[11px] uppercase tracking-wide text-aging">
          You're offline — showing saved data
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-line bg-paper px-5 pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent">Trip Planner</p>
          <div className="flex items-center gap-3">
            {tripId && (
              <button
                type="button"
                onClick={copyLink}
                className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint underline"
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
            )}
            <AccountPanel onOpenTrip={openTrip} />
          </div>
        </div>
        <h1 className="mb-1 font-serif text-[22px]">
          {trip
            ? [trip.destination, ...trip.legs.map((l) => l.destination)].join(" → ")
            : "Your next trip"}
        </h1>
        <p className="text-[12.5px] text-ink-soft">
          {trip
            ? `${trip.startDate?.slice(0, 10) ?? ""} – ${trip.endDate?.slice(0, 10) ?? ""} · Solo trip${
                tripCurrency ? ` · Prices there: ${tripCurrency}` : ""
              }`
            : "Plan your trip to get started"}
        </p>
      </header>

      <nav className="sticky top-[86px] z-10 flex gap-0.5 border-b border-line bg-paper px-5 pt-2.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 border-b-2 px-1 pb-3 pt-2.5 font-mono text-[12.5px] capitalize tracking-wide ${
              tab === t ? "border-accent text-ink" : "border-transparent text-ink-faint"
            }`}
          >
            {t}
            {t === "itinerary" && addedIds.size > 0 && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] text-onaccent">
                {addedIds.size}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-5 py-5">
        {tab === "setup" && (
          <SetupScreen interests={interests} onInterestsChange={setInterests} onCreated={handleCreated} />
        )}
        {tab === "discover" && tripId && trip && (
          <DiscoverScreen
            city={trip.city}
            legs={trip.legs}
            interests={interests}
            tripId={tripId}
            addedIds={addedIds}
            homeCurrency={trip.homeCurrency}
          />
        )}
        {tab === "itinerary" && tripId && trip && <ItineraryScreen tripId={tripId} />}
        {tab === "checklist" && tripId && trip && <ChecklistScreen tripId={tripId} city={trip.city} />}
        {tab !== "setup" && !tripId && <p className="text-sm text-ink-soft">Set up a trip first.</p>}
      </main>

      {/* Required attribution for OpenStreetMap-sourced place data (ODbL) —
          a single blanket credit here, not per-card, matches how OSM data
          is normally attributed in an app rather than in a curated dataset. */}
      <footer className="space-y-1 border-t border-line px-5 py-3 text-center font-mono text-[10px] uppercase tracking-wide text-ink-faint">
        <p>
          Place data ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
            OpenStreetMap
          </a>{" "}
          contributors
        </p>
        {/* Off by default -- no real support-link URL exists yet. Set
            VITE_SUPPORT_URL at build time (Render env vars) once you've
            picked a platform (Ko-fi, GitHub Sponsors, etc.) to turn this on;
            nothing renders otherwise, never a placeholder/fake link. */}
        {import.meta.env.VITE_SUPPORT_URL && (
          <p>
            <a href={import.meta.env.VITE_SUPPORT_URL} target="_blank" rel="noreferrer" className="underline">
              Support this project
            </a>
          </p>
        )}
      </footer>
    </div>
  );
}
