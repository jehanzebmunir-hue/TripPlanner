import { useEffect, useState } from "react";
import { api } from "../api";
import { CitySummary } from "../types";

interface Props {
  onPick: (city: CitySummary) => void;
}

// A free-text alternative to the curated dropdown -- backed by
// /api/cities/search, which checks the curated registry and previously
// resolved cities first and only falls through to a live OpenStreetMap
// geocode when neither already has a match (see backend
// cityResolution.service.ts). Collapsed by default, same pattern as
// FindDestinationPanel.
export function CitySearchPanel({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(() => {
      api
        .searchCities(trimmed)
        .then((r) => {
          if (!cancelled) setResults(r);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left font-mono text-[11.5px] uppercase tracking-wide text-accent underline"
      >
        Not on the list? Search any place →
      </button>
    );
  }

  const trimmed = query.trim();

  return (
    <div className="border border-line bg-paper-raised p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-base">Search any place</h3>
          <p className="text-xs text-ink-soft">Real OpenStreetMap data — fewer curated details than the main list.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="font-mono text-[11px] text-ink-faint">
          Close
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try a city, town, or village…"
        aria-label="Search any place"
        className="mb-3 w-full border border-line bg-paper px-3 py-2 text-sm"
      />

      {loading && <p className="text-xs text-ink-faint">Searching…</p>}
      {!loading && trimmed.length >= 2 && results.length === 0 && (
        <p className="text-xs text-ink-faint">No matches found.</p>
      )}

      <div className="space-y-2">
        {results.map((r) => (
          <button
            key={r.slug}
            type="button"
            onClick={() => {
              onPick(r);
              setOpen(false);
              setQuery("");
            }}
            className="block w-full border border-line bg-paper p-3 text-left hover:border-accent"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold">{r.name}</span>
              {r.dataSource === "community" && (
                <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">OSM only</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
