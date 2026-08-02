import { daysBetween } from "../dateUtils";
import { useAutoFillItinerary, useCities, useItinerary, useMoveItem, useTrip } from "../hooks";
import { ItineraryStop } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Trip dates are stored as UTC-midnight timestamps with no time-of-day
// meaning — rendering them in the visitor's own browser timezone can shift
// the displayed date by a day in either direction. Pinning the format to
// the destination's own timezone (falling back to UTC if it isn't loaded
// yet) means "Day 1" always shows the date it actually is in that city.
function formatDayLabel(dayIndex: number, date: string | null, timezone: string): string {
  if (!date) return `Day ${dayIndex}`;
  const d = new Date(date);
  const formatted = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
  return `Day ${dayIndex} · ${formatted}`;
}

export function ItineraryScreen({ tripId }: { tripId: string }) {
  const { data: days, isLoading } = useItinerary(tripId);
  const { data: trip } = useTrip(tripId);
  const { data: cities } = useCities();
  const moveItem = useMoveItem(tripId);
  const autoFill = useAutoFillItinerary(tripId);

  if (isLoading) return <p className="text-sm text-ink-soft">Loading…</p>;
  if (!days || days.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-faint">Add places from Discover to build your itinerary.</p>
        {trip && (
          <button
            type="button"
            onClick={() => autoFill.mutate(trip)}
            disabled={autoFill.isPending}
            className="w-full border border-accent py-2.5 text-sm font-semibold text-accent disabled:opacity-60"
          >
            {autoFill.isPending ? "Building a starter itinerary…" : "Or auto-fill a starter itinerary →"}
          </button>
        )}
        {autoFill.isError && (
          <p className="text-xs text-stale">Couldn't build a starter itinerary — try again in a moment.</p>
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
  function dayOptionsFor(stop: ItineraryStop): { value: number; label: string }[] {
    const leg = stop.legId ? trip?.legs.find((l) => l.id === stop.legId) : undefined;
    const start = leg ? leg.startDate : trip?.startDate;
    const end = leg ? leg.endDate : trip?.endDate;
    const totalDays = daysBetween(start, end);
    const timezone = cities?.find((c) => c.slug === cityFor(stop))?.timezone ?? "UTC";

    return Array.from({ length: totalDays }, (_, i) => {
      const value = i + 1;
      if (!start) return { value, label: `Day ${value}` };
      const date = new Date(new Date(start).getTime() + i * DAY_MS);
      const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: timezone });
      return { value, label };
    });
  }

  return (
    <div className="space-y-7">
      <p className="text-sm text-ink-soft">
        Split evenly across your trip by default — move anything to a different day below.
      </p>

      {days.map((day) => {
        const dayTimezone = day.stops[0]
          ? cities?.find((c) => c.slug === cityFor(day.stops[0]))?.timezone ?? "UTC"
          : "UTC";

        return (
          <div key={day.dayIndex}>
            <h2 className="mb-3 font-serif text-lg">{formatDayLabel(day.dayIndex, day.date, dayTimezone)}</h2>

            {day.stops.map((s) => (
              <div key={s.place.id}>
                {s.transitFromPrevious && (
                  <p className="my-2 pl-1 font-mono text-[11px] text-ink-faint">
                    {s.transitFromPrevious.minutes} min · {s.transitFromPrevious.mode}
                  </p>
                )}
                <div className="mb-3 border border-line bg-paper-raised p-3.5">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold">{s.place.name}</h3>
                    <select
                      value={s.itemDayIndex}
                      onChange={(e) =>
                        moveItem.mutate({ placeId: s.place.id, dayIndex: Number(e.target.value) })
                      }
                      className="border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink-soft"
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
                      href={s.place.bookingRef}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-accent px-3 py-1.5 text-xs font-bold text-onaccent"
                    >
                      {s.place.bookingLabel ?? "Book"} ↗
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
