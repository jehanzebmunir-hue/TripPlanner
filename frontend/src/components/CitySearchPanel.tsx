import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { trackEvent } from "../analytics";
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
// FindDestinationPanel -- but styled as a real bordered control (matching
// SetupScreen's "+ Add another city" button) rather than a plain text link,
// since a small underlined link was easy to miss entirely next to the
// dropdown above it.
export function CitySearchPanel({ onPick }: Props) {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Moves real keyboard/screen-reader focus into the panel the moment it
  // opens, rather than leaving focus on the now-hidden opener button --
  // otherwise a keyboard user has no indication anything changed.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls={panelId}
        className="flex w-full items-center justify-center gap-1.5 border border-dashed border-line py-2.5 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent"
      >
        {t("citySearch.opener")}
      </button>
    );
  }

  const trimmed = query.trim();

  return (
    <div id={panelId} className="border border-line bg-paper-raised p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-base">{t("citySearch.heading")}</h3>
          <p className="text-xs text-ink-soft">{t("citySearch.subheading")}</p>
        </div>
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

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={t("citySearch.placeholder")}
        aria-label={t("citySearch.heading")}
        className="mb-3 w-full border border-line bg-paper px-3 py-2 text-sm"
      />

      {loading && <p className="text-xs text-ink-faint">{t("citySearch.searching")}</p>}
      {!loading && trimmed.length >= 2 && results.length === 0 && (
        <p className="text-xs text-ink-faint">{t("citySearch.noMatches")}</p>
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
              trackEvent("city_search_used", r.dataSource);
            }}
            className="block w-full border border-line bg-paper p-3 text-left hover:border-accent"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold">{r.name}</span>
              {r.dataSource === "community" && (
                <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">{t("citySearch.osmOnly")}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
