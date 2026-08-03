import { ItineraryDay } from "./types";

// RFC 5545 line folding: a content line longer than 75 octets must be
// split across multiple physical lines, each continuation starting with a
// single space. Real calendar apps vary in how strictly they enforce
// this, but a place description running long enough to violate it is a
// real, common case (some seed descriptions run well past 75 chars), not
// a hypothetical.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length > 0) {
    result += "\r\n " + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return result;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, "");
}

// Trip dates are stored as UTC-midnight timestamps with no real
// time-of-day meaning (see ItineraryScreen) -- staying in UTC here avoids
// a local-timezone shift silently landing a stop on the wrong calendar day.
function nextDateOnly(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return dateOnly(d.toISOString());
}

/**
 * A real .ics (iCalendar, RFC 5545) file -- one all-day event per
 * itinerary stop, on its own real calendar date. All-day, not a specific
 * time, because this app never records what time of day a stop happens --
 * inventing a time (e.g. defaulting everything to 9am) would be exactly
 * the kind of fabricated specificity this project avoids elsewhere.
 * Undated days (a trip or leg with no real start/end date) are skipped
 * entirely rather than guessing a date for them.
 */
export function buildIcs(tripName: string, days: ItineraryDay[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TripPlanner//trip export//EN",
    "CALSCALE:GREGORIAN",
    foldLine(`X-WR-CALNAME:${escapeText(tripName)}`),
  ];

  const dtstamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

  for (const day of days) {
    if (!day.date) continue;
    for (const stop of day.stops) {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${stop.place.id}@tripplanner`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(day.date)}`);
      // DTEND on an all-day VEVENT is exclusive per RFC 5545 -- the day
      // after, not the same day, or the event would show as zero-length.
      lines.push(`DTEND;VALUE=DATE:${nextDateOnly(day.date)}`);
      lines.push(foldLine(`SUMMARY:${escapeText(stop.place.name)}`));
      if (stop.place.description) lines.push(foldLine(`DESCRIPTION:${escapeText(stop.place.description)}`));
      if (stop.place.address) lines.push(foldLine(`LOCATION:${escapeText(stop.place.address)}`));
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
