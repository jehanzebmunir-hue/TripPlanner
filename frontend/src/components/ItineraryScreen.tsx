import { TFunction } from "i18next";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { tagBookingUrl, trackEvent } from "../analytics";
import { daysBetween } from "../dateUtils";
import { useAutoFillItinerary, useCities, useItinerary, useMoveItem, useTrip } from "../hooks";
import { buildIcs, downloadIcs } from "../ics";
import { ItineraryDay, ItineraryStop } from "../types";
import { Skeleton } from "./Skeleton";

// See DiscoverScreen for the same reasoning -- maps default to collapsed, so
// Leaflet shouldn't be in the initial bundle for a feature most visits never
// open. One shared lazy chunk regardless of how many days end up rendering
// their own MapView instance.
const MapView = lazy(() => import("./MapView").then((m) => ({ default: m.MapView })));

const DAY_MS = 24 * 60 * 60 * 1000;

// Trip dates are stored as UTC-midnight timestamps with no time-of-day
// meaning — rendering them in the visitor's own browser timezone can shift
// the displayed date by a day in either direction. Pinning the format to
// the destination's own timezone (falling back to UTC if it isn't loaded
// yet) means "Day 1" always shows the date it actually is in that city.
function formatDayLabel(t: TFunction, dayIndex: number, date: string | null, timezone: string): string {
  if (!date) return t("itinerary.dayLabel", { day: dayIndex });
  const d = new Date(date);
  const formatted = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
  return t("itinerary.dayLabelWithDate", { day: dayIndex, date: formatted });
}

export function ItineraryScreen({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const { data: days, isLoading } = useItinerary(tripId);
  const { data: trip } = useTrip(tripId);
  const { data: cities } = useCities();
  const moveItem = useMoveItem(tripId);
  const autoFill = useAutoFillItinerary(tripId);
  // Drag-and-drop is a progressive enhancement on top of the day-move
  // dropdown below, not a replacement for it -- HTML5 drag events don't
  // work on touch devices, so the dropdown stays the only way to move a
  // stop on mobile. draggedStop is looked up fresh on each dragstart
  // rather than carried in dataTransfer, since it's already all in memory.
  const [draggedStop, setDraggedStop] = useState<ItineraryStop | null>(null);
  const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null);
  // Collapsed by default -- previously each day mounted its own live
  // Leaflet + tile-load instance unconditionally, so a 7-day trip loaded
  // 7 concurrent map instances whether or not anyone opened them.
  const [showMaps, setShowMaps] = useState(false);

  function handleExport() {
    if (!days) return;
    const ics = buildIcs(trip?.destination ?? "Trip", days);
    downloadIcs(`${(trip?.destination ?? "trip").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`, ics);
    trackEvent("itinerary_exported");
  }

  if (isLoading) {
    return (
      <div className="space-y-7">
        <p role="status" className="sr-only">
          {t("common.loading")}
        </p>
        <div>
          <Skeleton className="mb-3 h-6 w-40" />
          <Skeleton className="mb-3 h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }
  if (!days || days.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-faint">{t("itinerary.emptyState")}</p>
        {trip && (
          <button
            type="button"
            onClick={() => {
              autoFill.mutate(trip);
              trackEvent("autofill_used");
            }}
            disabled={autoFill.isPending}
            className="w-full border border-accent py-2.5 text-sm font-semibold text-accent disabled:opacity-60"
          >
            {autoFill.isPending ? t("itinerary.autoFilling") : t("itinerary.autoFillButton")}
          </button>
        )}
        {autoFill.isError && (
          <p role="alert" className="text-xs text-stale">
            {t("itinerary.autoFillError")}
          </p>
        )}
      </div>
    );
  }

  // Each stop belongs to its OWN city (its leg, or the trip's primary city
  // if it has none) — a multi-city trip has no single timezone or single
  // day-count that applies to every stop, so both are resolved per stop,
  // not once for the whole screen the way a single-city trip could get
  // away with.
  function cityFor(stop: ItineraryStop): string {
    if (!stop.legId) return trip?.city ?? "";
    return trip?.legs.find((l) => l.id === stop.legId)?.city ?? trip?.city ?? "";
  }

  // Labelled by real calendar date, not a bare "Day N" -- N here is
  // leg-relative (what's actually stored), while the heading above each
  // group shows a different, global "Day N" (see backend buildItinerary).
  // Showing the real date instead of either number sidesteps the
  // mismatch entirely rather than risking a dropdown that reads "Day 1"
  // directly under a "Day 3" heading.
  function dayOptionsFor(stop: ItineraryStop): { value: number; label: string; date: string | null }[] {
    const leg = stop.legId ? trip?.legs.find((l) => l.id === stop.legId) : undefined;
    const start = leg ? leg.startDate : trip?.startDate;
    const end = leg ? leg.endDate : trip?.endDate;
    const totalDays = daysBetween(start, end);
    const timezone = cities?.find((c) => c.slug === cityFor(stop))?.timezone ?? "UTC";

    return Array.from({ length: totalDays }, (_, i) => {
      const value = i + 1;
      if (!start) return { value, label: t("itinerary.dayLabel", { day: value }), date: null };
      const date = new Date(new Date(start).getTime() + i * DAY_MS);
      const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: timezone });
      return { value, label, date: date.toISOString() };
    });
  }

  // What day-index a drag-and-drop of this stop onto that day group should
  // resolve to -- the same leg-relative value the "move to day" dropdown
  // already computes for this exact stop, just picked by matching real
  // calendar dates instead of a menu selection. Returns null when the drop
  // target isn't a real day for this stop's own leg (e.g. a Rome-leg item
  // dropped onto a date outside Rome's own range) -- the same constraint
  // the dropdown already enforces, just silently declining the drop rather
  // than allowing an invalid move.
  function targetDayIndexFor(stop: ItineraryStop, targetDay: ItineraryDay): number | null {
    if (targetDay.date) {
      const targetKey = targetDay.date.slice(0, 10);
      const match = dayOptionsFor(stop).find((o) => o.date?.slice(0, 10) === targetKey);
      return match ? match.value : null;
    }
    // Undated trips group days by (legId, dayIndex) directly (see backend
    // buildItinerary) -- valid only when the target day's own stops share
    // this stop's leg, and the target dayIndex comes straight from them.
    const targetStop = targetDay.stops[0];
    if (!targetStop || targetStop.legId !== stop.legId) return null;
    return targetStop.itemDayIndex;
  }

  return (
    <div className="space-y-7">
      <h2 className="sr-only">{t("app.tabs.itinerary")}</h2>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">{t("itinerary.splitEvenly")}</p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => {
              setShowMaps((v) => !v);
              trackEvent("map_toggled", "itinerary");
            }}
            className="font-mono text-[11px] uppercase tracking-wide text-ink-faint underline"
          >
            {showMaps ? t("map.hide") : t("map.show")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!days.some((d) => d.date)}
            className="font-mono text-[11px] uppercase tracking-wide text-ink-faint underline disabled:opacity-40"
            title={days.some((d) => d.date) ? undefined : t("itinerary.exportNeedsDates")}
          >
            {t("itinerary.export")}
          </button>
        </div>
      </div>

      {moveItem.isError && (
        <p role="alert" className="border border-stale bg-stale-bg px-3 py-2 text-xs text-stale">
          {t("itinerary.moveError")}
        </p>
      )}

      {days.map((day) => {
        const dayTimezone = day.stops[0]
          ? cities?.find((c) => c.slug === cityFor(day.stops[0]))?.timezone ?? "UTC"
          : "UTC";

        return (
          <div
            key={day.dayIndex}
            onDragOver={(e) => {
              if (!draggedStop || targetDayIndexFor(draggedStop, day) === null) return;
              e.preventDefault(); // required for onDrop to fire at all
              setDragOverDayIndex(day.dayIndex);
            }}
            onDragLeave={() => setDragOverDayIndex((cur) => (cur === day.dayIndex ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverDayIndex(null);
              if (!draggedStop) return;
              const targetDayIndex = targetDayIndexFor(draggedStop, day);
              if (targetDayIndex !== null) {
                moveItem.mutate({ placeId: draggedStop.place.id, dayIndex: targetDayIndex });
                trackEvent("itinerary_drag_move");
              }
            }}
            className={dragOverDayIndex === day.dayIndex ? "outline outline-2 outline-accent" : undefined}
          >
            <h3 className="mb-3 font-serif text-lg">{formatDayLabel(t, day.dayIndex, day.date, dayTimezone)}</h3>

            {showMaps && day.stops.length > 0 && (
              <div className="mb-3">
                <Suspense fallback={null}>
                  <MapView places={day.stops.map((s) => s.place)} />
                </Suspense>
              </div>
            )}

            {day.stops.map((s) => (
              <div key={s.place.id}>
                {s.transitFromPrevious && (
                  <p className="my-2 pl-1 font-mono text-[11px] text-ink-faint">
                    {t("itinerary.transit", { minutes: s.transitFromPrevious.minutes, mode: s.transitFromPrevious.mode })}
                  </p>
                )}
                <div
                  draggable
                  onDragStart={() => setDraggedStop(s)}
                  onDragEnd={() => {
                    setDraggedStop(null);
                    setDragOverDayIndex(null);
                  }}
                  className={`mb-3 cursor-grab border border-line bg-paper-raised p-3.5 active:cursor-grabbing ${
                    draggedStop?.place.id === s.place.id ? "opacity-50" : ""
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold">{s.place.name}</h4>
                    <select
                      value={s.itemDayIndex}
                      onChange={(e) =>
                        moveItem.mutate({ placeId: s.place.id, dayIndex: Number(e.target.value) })
                      }
                      aria-label={t("itinerary.moveTo", { place: s.place.name })}
                      className="border border-line bg-paper px-2 py-1.5 font-mono text-[11px] text-ink-soft"
                    >
                      {dayOptionsFor(s).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {s.place.description && <p className="mb-2 text-xs text-ink-soft">{s.place.description}</p>}
                  {s.place.bookingRef && (
                    <a
                      href={tagBookingUrl(s.place.bookingRef, s.place.source)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackEvent("booking_link_clicked", s.place.source)}
                      className="inline-block bg-accent px-3 py-2 text-xs font-bold text-onaccent"
                    >
                      {s.place.bookingLabel ?? t("itinerary.book")} ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
