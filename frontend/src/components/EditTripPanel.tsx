import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { trackEvent } from "../analytics";
import { HOME_CURRENCIES } from "../homeCurrencies";
import { useUpdateTrip } from "../hooks";
import { Trip } from "../types";

interface Props {
  trip: Trip;
}

const TODAY = new Date().toISOString().slice(0, 10);

function toInputDate(v?: string | null): string {
  return v ? v.slice(0, 10) : "";
}

interface LegDraft {
  startDate: string;
  endDate: string;
}

function draftFromTrip(trip: Trip): Record<string, LegDraft> {
  return Object.fromEntries(
    trip.legs.map((l) => [l.id, { startDate: toInputDate(l.startDate), endDate: toInputDate(l.endDate) }])
  );
}

// Deliberately narrow: dates and home currency only, on the trip and on
// its existing legs -- matches backend updateTrip's own scope. Changing a
// city (primary or leg) is out of scope here: every already-added
// TripItem is tied to a specific city, and reassigning it out from under
// them is a real data-integrity question a same-city date fix doesn't
// need to answer. Adding/removing legs stays creation-time only.
export function EditTripPanel({ trip }: Props) {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(toInputDate(trip.startDate));
  const [endDate, setEndDate] = useState(toInputDate(trip.endDate));
  const [homeCurrency, setHomeCurrency] = useState(trip.homeCurrency ?? "USD");
  const [legDrafts, setLegDrafts] = useState<Record<string, LegDraft>>(() => draftFromTrip(trip));
  const updateTrip = useUpdateTrip(trip.id);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local draft state re-syncs from the real trip every time the panel
  // opens -- edits are uncommitted until Save, and this also picks up any
  // change made elsewhere (another tab, the edit link shared with someone
  // else) since it was last open.
  useEffect(() => {
    if (!open) return;
    setStartDate(toInputDate(trip.startDate));
    setEndDate(toInputDate(trip.endDate));
    setHomeCurrency(trip.homeCurrency ?? "USD");
    setLegDrafts(draftFromTrip(trip));
    firstFieldRef.current?.focus();
  }, [open, trip]);

  useEffect(() => {
    if (!open) return;
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

  const primaryDateError = Boolean(startDate && endDate && endDate < startDate);
  const legDateError = Object.values(legDrafts).some((d) => d.startDate && d.endDate && d.endDate < d.startDate);
  const dateError = primaryDateError || legDateError;

  function updateLegDraft(legId: string, patch: Partial<LegDraft>) {
    setLegDrafts((prev) => ({ ...prev, [legId]: { ...prev[legId], ...patch } }));
  }

  function handleSave() {
    updateTrip.mutate(
      {
        startDate: startDate || null,
        endDate: endDate || null,
        homeCurrency: homeCurrency || null,
        legs: trip.legs.map((l) => ({
          id: l.id,
          startDate: legDrafts[l.id]?.startDate || null,
          endDate: legDrafts[l.id]?.endDate || null,
        })),
        // Lets the backend reject this save with a real conflict error if
        // someone else changed the trip since this panel's draft was last
        // synced from it, instead of silently overwriting their edit.
        expectedUpdatedAt: trip.updatedAt,
      },
      {
        onSuccess: () => {
          setOpen(false);
          trackEvent("trip_edited");
        },
      }
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls={panelId}
        className="font-mono text-[11px] uppercase tracking-wide text-ink-faint underline"
      >
        {t("editTrip.opener")}
      </button>
    );
  }

  return (
    <div id={panelId} ref={containerRef} className="border border-line bg-paper-raised p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-serif text-base">{t("editTrip.heading")}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded={true}
          aria-controls={panelId}
          className="px-1 py-1 font-mono text-[11px] text-ink-faint"
        >
          {t("common.close")}
        </button>
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          {t("setup.dates")}
        </label>
        <div className="flex gap-2.5">
          <input
            ref={firstFieldRef}
            type="date"
            value={startDate}
            min={TODAY}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label={t("setup.startDate")}
            className="flex-1 border border-line bg-paper px-3 py-2 font-mono text-[13px]"
          />
          <input
            type="date"
            value={endDate}
            min={startDate || TODAY}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label={t("setup.endDate")}
            className="flex-1 border border-line bg-paper px-3 py-2 font-mono text-[13px]"
          />
        </div>
        {primaryDateError && (
          <p role="alert" className="mt-1.5 text-xs text-stale">
            {t("setup.dateOrderError")}
          </p>
        )}
      </div>

      {trip.legs.map((leg) => (
        <div key={leg.id} className="mb-3">
          <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">
            {leg.destination}
          </label>
          <div className="flex gap-2.5">
            <input
              type="date"
              value={legDrafts[leg.id]?.startDate ?? ""}
              min={TODAY}
              onChange={(e) => updateLegDraft(leg.id, { startDate: e.target.value })}
              aria-label={t("editTrip.legStartDate", { destination: leg.destination })}
              className="flex-1 border border-line bg-paper px-3 py-2 font-mono text-[13px]"
            />
            <input
              type="date"
              value={legDrafts[leg.id]?.endDate ?? ""}
              min={legDrafts[leg.id]?.startDate || TODAY}
              onChange={(e) => updateLegDraft(leg.id, { endDate: e.target.value })}
              aria-label={t("editTrip.legEndDate", { destination: leg.destination })}
              className="flex-1 border border-line bg-paper px-3 py-2 font-mono text-[13px]"
            />
          </div>
          {legDrafts[leg.id]?.startDate &&
            legDrafts[leg.id]?.endDate &&
            legDrafts[leg.id].endDate < legDrafts[leg.id].startDate && (
              <p role="alert" className="mt-1.5 text-xs text-stale">
                {t("setup.dateOrderError")}
              </p>
            )}
        </div>
      ))}

      <div className="mb-4">
        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          {t("setup.yourCurrency")}
        </label>
        <select
          value={homeCurrency}
          onChange={(e) => setHomeCurrency(e.target.value)}
          aria-label={t("setup.yourCurrency")}
          className="w-full border border-line bg-paper px-3 py-2 text-sm"
        >
          {HOME_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {updateTrip.isError && (
        <p role="alert" className="mb-3 border border-stale bg-stale-bg px-3 py-2 text-xs text-stale">
          {(updateTrip.error as Error).message}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={updateTrip.isPending || dateError}
        className="w-full bg-accent py-2.5 text-sm font-bold text-onaccent disabled:opacity-60"
      >
        {updateTrip.isPending ? t("editTrip.saving") : t("editTrip.save")}
      </button>
    </div>
  );
}
