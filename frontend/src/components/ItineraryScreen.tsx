import { useCities, useItinerary, useMoveItem } from "../hooks";

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

export function ItineraryScreen({ tripId, city }: { tripId: string; city: string }) {
  const { data: days, isLoading } = useItinerary(tripId);
  const { data: cities } = useCities();
  const moveItem = useMoveItem(tripId);
  const timezone = cities?.find((c) => c.slug === city)?.timezone ?? "UTC";

  if (isLoading) return <p className="text-sm text-ink-soft">Loading…</p>;
  if (!days || days.length === 0) {
    return <p className="text-sm text-ink-faint">Add places from Discover to build your itinerary.</p>;
  }

  const dayOptions = Array.from({ length: Math.max(days.length, ...days.map((d) => d.dayIndex)) }, (_, i) => i + 1);

  return (
    <div className="space-y-7">
      <p className="text-sm text-ink-soft">
        Split evenly across your trip by default — move anything to a different day below.
      </p>

      {days.map((day) => (
        <div key={day.dayIndex}>
          <h2 className="mb-3 font-serif text-lg">{formatDayLabel(day.dayIndex, day.date, timezone)}</h2>

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
                    value={day.dayIndex}
                    onChange={(e) => moveItem.mutate({ placeId: s.place.id, dayIndex: Number(e.target.value) })}
                    className="border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink-soft"
                  >
                    {dayOptions.map((d) => (
                      <option key={d} value={d}>
                        Day {d}
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
      ))}
    </div>
  );
}
