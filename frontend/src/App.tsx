import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { setEditToken } from "./api";
import { trackEvent } from "./analytics";
import { AccountPanel } from "./components/AccountPanel";
import { ChecklistScreen } from "./components/ChecklistScreen";
import { DiscoverScreen } from "./components/DiscoverScreen";
import { EditTripPanel } from "./components/EditTripPanel";
import { ItineraryScreen } from "./components/ItineraryScreen";
import { SetupScreen } from "./components/SetupScreen";
import { useCities, useRefreshTrip, useTrip } from "./hooks";
import { Language, setLanguage, SUPPORTED_LANGUAGES } from "./i18n";
import { CreatedTrip } from "./types";
import { useOnlineStatus } from "./useOnlineStatus";

type Tab = "setup" | "discover" | "itinerary" | "checklist";

const TABS: Tab[] = ["setup", "discover", "itinerary", "checklist"];

function tripIdFromUrl(): string | undefined {
  return window.location.pathname.match(/^\/trip\/([^/]+)/)?.[1];
}

export default function App() {
  const { t, i18n } = useTranslation();
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
  const refreshTrip = useRefreshTrip(tripId);

  // Notices a real change made elsewhere -- another tab, another device via
  // the shared edit link -- since this session first loaded this trip.
  // Deliberately lightweight: no dedicated polling loop, just comparing
  // against whatever React Query's own default refetch-on-window-focus
  // behavior already brings back, since a background poll tight enough to
  // catch this within seconds would mean real, mostly-wasted load against
  // a change that in practice happens rarely.
  const seenUpdatedAtRef = useRef<string | null>(null);
  const [tripChangedElsewhere, setTripChangedElsewhere] = useState(false);

  useEffect(() => {
    seenUpdatedAtRef.current = null;
    setTripChangedElsewhere(false);
  }, [tripId]);

  useEffect(() => {
    if (!trip) return;
    if (seenUpdatedAtRef.current === null) seenUpdatedAtRef.current = trip.updatedAt;
    else if (trip.updatedAt !== seenUpdatedAtRef.current) setTripChangedElsewhere(true);
  }, [trip]);

  function handleRefreshTrip() {
    seenUpdatedAtRef.current = trip?.updatedAt ?? null;
    setTripChangedElsewhere(false);
    refreshTrip();
  }

  useEffect(() => {
    localStorage.setItem("interests", JSON.stringify(interests));
  }, [interests]);

  useEffect(() => {
    trackEvent("tab_view", tab);
  }, [tab]);

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
    <div className="mx-auto flex min-h-screen max-w-[460px] flex-col sm:max-w-[600px] md:max-w-[720px]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-onaccent"
      >
        {t("app.skipToContent")}
      </a>
      {!online && (
        <div className="bg-aging-bg px-5 py-1.5 text-center font-mono text-[11px] uppercase tracking-wide text-aging">
          {t("app.offline")}
        </div>
      )}
      {tripChangedElsewhere && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 bg-aging-bg px-5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-aging"
        >
          <span>{t("app.tripChangedElsewhere")}</span>
          <button type="button" onClick={handleRefreshTrip} className="shrink-0 underline">
            {t("app.refresh")}
          </button>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-line bg-paper px-5 pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent">{t("app.tagline")}</p>
          <div className="flex items-center gap-3">
            {tripId && (
              <button
                type="button"
                onClick={copyLink}
                className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint underline"
              >
                <span role="status">{copied ? t("app.copied") : t("app.copyLink")}</span>
              </button>
            )}
            <div className="flex gap-1 font-mono text-[10.5px] uppercase tracking-wide text-ink-faint" aria-label={t("app.language")}>
              {SUPPORTED_LANGUAGES.map((lang: Language) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setLanguage(lang);
                    trackEvent("language_changed", lang);
                  }}
                  aria-pressed={i18n.language === lang}
                  className={`px-1 py-1 ${i18n.language === lang ? "text-accent underline" : "underline"}`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <AccountPanel onOpenTrip={openTrip} />
          </div>
        </div>
        <h1 className="mb-1 font-serif text-[22px]">
          {trip
            ? [trip.destination, ...trip.legs.map((l) => l.destination)].join(" → ")
            : t("app.newTripTitle")}
        </h1>
        <p className="text-[12.5px] text-ink-soft">
          {trip
            ? `${trip.startDate?.slice(0, 10) ?? ""} – ${trip.endDate?.slice(0, 10) ?? ""} · ${t("app.soloTrip")}${
                tripCurrency ? ` · ${t("app.pricesThere", { currency: tripCurrency })}` : ""
              }`
            : t("app.newTripSubtitle")}
        </p>
      </header>

      <nav
        role="tablist"
        aria-label={t("app.tagline")}
        className="sticky top-[86px] z-10 flex gap-0.5 border-b border-line bg-paper px-5 pt-2.5"
      >
        {TABS.map((tabName) => (
          <button
            key={tabName}
            type="button"
            role="tab"
            id={`tab-${tabName}`}
            aria-selected={tab === tabName}
            aria-controls="main-content"
            onClick={() => setTab(tabName)}
            className={`flex-1 border-b-2 px-1 pb-3 pt-2.5 font-mono text-[12.5px] capitalize tracking-wide ${
              tab === tabName ? "border-accent text-ink" : "border-transparent text-ink-faint"
            }`}
          >
            {t(`app.tabs.${tabName}`)}
            {tabName === "itinerary" && addedIds.size > 0 && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] text-onaccent">
                {addedIds.size}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main
        id="main-content"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={-1}
        className="flex-1 px-5 py-5"
      >
        {tab === "setup" && (
          <SetupScreen interests={interests} onInterestsChange={setInterests} onCreated={handleCreated} />
        )}
        {tab !== "setup" && trip && (
          <div className="mb-4">
            <EditTripPanel trip={trip} />
          </div>
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
        {tab !== "setup" && !tripId && <p className="text-sm text-ink-soft">{t("app.setUpFirst")}</p>}
      </main>

      {/* Required attribution for OpenStreetMap-sourced place data (ODbL) —
          a single blanket credit here, not per-card, matches how OSM data
          is normally attributed in an app rather than in a curated dataset. */}
      <footer className="space-y-1 border-t border-line px-5 py-3 text-center font-mono text-[10px] uppercase tracking-wide text-ink-faint">
        <p>
          {/* Split on a plain %LINK% token rather than react-i18next's Trans
              component -- verified live that this Trans/i18next version
              combo duplicates the surrounding text and drops the tag
              entirely whenever real text precedes it in Trans's children,
              which silently left this link with no accessible name.
              "OpenStreetMap" itself stays untranslated, a proper noun like
              every other real place name in this app. */}
          {(() => {
            const [before, after] = t("app.attribution").split("%LINK%");
            return (
              <>
                {before}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  OpenStreetMap
                </a>
                {after}
              </>
            );
          })()}
        </p>
        {/* Off by default -- no real support-link URL exists yet. Set
            VITE_SUPPORT_URL at build time (Render env vars) once you've
            picked a platform (Ko-fi, GitHub Sponsors, etc.) to turn this on;
            nothing renders otherwise, never a placeholder/fake link. */}
        {import.meta.env.VITE_SUPPORT_URL && (
          <p>
            <a href={import.meta.env.VITE_SUPPORT_URL} target="_blank" rel="noreferrer" className="underline">
              {t("app.support")}
            </a>
          </p>
        )}
      </footer>
    </div>
  );
}
