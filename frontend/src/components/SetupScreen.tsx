import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../categories";
import { useCities, useCreateTrip } from "../hooks";
import { CitySummary, CreatedTrip } from "../types";
import { CitySearchPanel } from "./CitySearchPanel";
import { FindDestinationPanel } from "./FindDestinationPanel";

interface Props {
  interests: string[];
  onInterestsChange: (interests: string[]) => void;
  onCreated: (trip: CreatedTrip) => void;
}

// A practical set of major world currencies for "what do you spend in
// day-to-day" -- not an exhaustive ISO 4217 list, and deliberately not tied
// to the destination-city currency list (a traveler's home currency has
// nothing to do with which cities this app covers).
const HOME_CURRENCIES = [
  "USD", "CAD", "EUR", "GBP", "AUD", "NZD", "JPY", "CNY", "INR", "MXN",
  "BRL", "CHF", "SEK", "NOK", "DKK", "SGD", "HKD", "KRW", "ZAR", "AED",
];

function groupByCountry(cities: CitySummary[]): [string, CitySummary[]][] {
  const groups = new Map<string, CitySummary[]>();
  for (const c of cities) {
    const list = groups.get(c.country) ?? [];
    list.push(c);
    groups.set(c.country, list);
  }
  return Array.from(groups.entries());
}

interface LegDraft {
  city: string;
  startDate: string;
  endDate: string;
}

// Real, complete, and automatically localized -- replaced a hand-maintained
// ~97-entry English-only country name map that was already missing several
// registry countries. Intl.DisplayNames is a standard ECMA-402 API, not an
// extra dependency, and follows i18n.language automatically so "FR" reads
// "France" in English and "Francia" in Spanish with zero translation work.
function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// Today's date, computed once per module load rather than per render --
// used as the floor for every date input so the browser's own picker won't
// even offer a day trip planning would never actually want (the past).
const TODAY = new Date().toISOString().slice(0, 10);

export function SetupScreen({ interests, onInterestsChange, onCreated }: Props) {
  const { t, i18n } = useTranslation();
  const { data: cities } = useCities();
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("2026-10-09");
  const [endDate, setEndDate] = useState("2026-10-11");
  const [homeCurrency, setHomeCurrency] = useState("USD");
  const [legs, setLegs] = useState<LegDraft[]>([]);
  // A city picked via CitySearchPanel or FindDestinationPanel might not be
  // in the (possibly stale-cached) bulk /api/cities list yet -- keyed here
  // so the dropdown and handleSubmit's lookups always have a real name for
  // it, without needing a refetch just to display what was just picked.
  const [pickedCities, setPickedCities] = useState<Record<string, CitySummary>>({});
  const createTrip = useCreateTrip();
  const allKnownCities = useMemo(() => {
    const map = new Map<string, CitySummary>();
    (cities ?? []).forEach((c) => map.set(c.slug, c));
    Object.values(pickedCities).forEach((c) => map.set(c.slug, c));
    return Array.from(map.values());
  }, [cities, pickedCities]);
  const cityGroups = useMemo(() => groupByCountry(allKnownCities), [allKnownCities]);
  // Unambiguously wrong (an end before its own start) rather than a softer
  // rule like leg chronology -- a traveler reordering legs mid-edit is a
  // real, valid intermediate state, not something to block on.
  const dateError =
    (startDate && endDate && endDate < startDate) || legs.some((l) => l.startDate && l.endDate && l.endDate < l.startDate);

  useEffect(() => {
    if (!city && cities && cities.length > 0) setCity(cities[0].slug);
  }, [cities, city]);

  function handlePick(c: CitySummary) {
    setPickedCities((prev) => ({ ...prev, [c.slug]: c }));
    setCity(c.slug);
  }

  function handleLegPick(index: number, c: CitySummary) {
    setPickedCities((prev) => ({ ...prev, [c.slug]: c }));
    updateLeg(index, { city: c.slug });
  }

  function toggle(slug: string) {
    onInterestsChange(interests.includes(slug) ? interests.filter((i) => i !== slug) : [...interests, slug]);
  }

  function addLeg() {
    // Defaults the new leg to start right after wherever the trip currently
    // ends (the primary city, or the previous leg) -- a reasonable guess
    // for "next stop," not a requirement; every field stays editable.
    const previousEnd = legs.length > 0 ? legs[legs.length - 1].endDate : endDate;
    setLegs([...legs, { city: cities?.[0]?.slug ?? "", startDate: previousEnd, endDate: previousEnd }]);
  }

  function updateLeg(index: number, patch: Partial<LegDraft>) {
    setLegs(legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));
  }

  function removeLeg(index: number) {
    setLegs(legs.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    const destination = allKnownCities.find((c) => c.slug === city)?.name ?? city;
    const legInputs = legs.map((leg) => ({
      city: leg.city,
      destination: allKnownCities.find((c) => c.slug === leg.city)?.name ?? leg.city,
      startDate: leg.startDate,
      endDate: leg.endDate,
    }));
    createTrip.mutate(
      { city, destination, startDate, endDate, interests, homeCurrency, legs: legInputs },
      { onSuccess: onCreated }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 font-serif text-xl">{t("setup.heading")}</h2>
        <p className="text-sm text-ink-soft">{t("setup.subheading")}</p>
      </div>

      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          {t("setup.destination")}
        </label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label={t("setup.destination")}
          className="mb-2 w-full border border-line bg-paper-raised px-3 py-2.5 text-sm"
        >
          {cityGroups.map(([country, group]) => (
            <optgroup key={country} label={countryName(country, i18n.language)}>
              {group.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <FindDestinationPanel onPick={setCity} />
        <div className="mt-2">
          <CitySearchPanel onPick={handlePick} />
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">{t("setup.dates")}</label>
        <div className="flex gap-2.5">
          <input
            type="date"
            value={startDate}
            min={TODAY}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label={t("setup.startDate")}
            className="flex-1 border border-line bg-paper-raised px-3 py-2.5 font-mono text-[13px]"
          />
          <input
            type="date"
            value={endDate}
            min={startDate || TODAY}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label={t("setup.endDate")}
            className="flex-1 border border-line bg-paper-raised px-3 py-2.5 font-mono text-[13px]"
          />
        </div>
        {startDate && endDate && endDate < startDate && (
          <p role="alert" className="mt-1.5 text-xs text-stale">
            {t("setup.dateOrderError")}
          </p>
        )}
      </div>

      <div>
        {legs.map((leg, i) => (
          <div key={i} className="mb-2.5 border border-line bg-paper-raised p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                {t("setup.alsoVisiting")}
              </span>
              <button
                type="button"
                onClick={() => removeLeg(i)}
                aria-label={t("setup.removeCity", { n: i + 2 })}
                className="font-mono text-[11px] text-ink-faint underline"
              >
                {t("setup.remove")}
              </button>
            </div>
            <select
              value={leg.city}
              onChange={(e) => updateLeg(i, { city: e.target.value })}
              aria-label={t("setup.cityN", { n: i + 2 })}
              className="mb-2 w-full border border-line bg-paper px-3 py-2 text-sm"
            >
              {cityGroups.map(([country, group]) => (
                <optgroup key={country} label={countryName(country, i18n.language)}>
                  {group.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="mb-2">
              <CitySearchPanel onPick={(c) => handleLegPick(i, c)} />
            </div>
            <div className="flex gap-2.5">
              <input
                type="date"
                value={leg.startDate}
                min={TODAY}
                onChange={(e) => updateLeg(i, { startDate: e.target.value })}
                aria-label={t("setup.cityNStartDate", { n: i + 2 })}
                className="flex-1 border border-line bg-paper px-3 py-2 font-mono text-[13px]"
              />
              <input
                type="date"
                value={leg.endDate}
                min={leg.startDate || TODAY}
                onChange={(e) => updateLeg(i, { endDate: e.target.value })}
                aria-label={t("setup.cityNEndDate", { n: i + 2 })}
                className="flex-1 border border-line bg-paper px-3 py-2 font-mono text-[13px]"
              />
            </div>
            {leg.startDate && leg.endDate && leg.endDate < leg.startDate && (
              <p role="alert" className="mt-1.5 text-xs text-stale">
                {t("setup.dateOrderError")}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addLeg}
          className="w-full border border-dashed border-line py-2 text-xs font-semibold text-ink-soft"
        >
          {t("setup.addAnotherCity")}
        </button>
      </div>

      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          {t("setup.yourCurrency")} <span className="normal-case text-ink-faint">{t("setup.yourCurrencyHint")}</span>
        </label>
        <select
          value={homeCurrency}
          onChange={(e) => setHomeCurrency(e.target.value)}
          aria-label={t("setup.yourCurrency")}
          className="w-full border border-line bg-paper-raised px-3 py-2.5 text-sm"
        >
          {HOME_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          {t("setup.interests")} <span className="normal-case text-ink-faint">{t("setup.interestsHint")}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => toggle(c.slug)}
              className={`border px-3.5 py-1.5 text-[13px] ${
                interests.includes(c.slug)
                  ? "border-accent bg-accent text-onaccent"
                  : "border-line bg-paper-raised text-ink-soft"
              }`}
            >
              {t(`categories.${c.slug}`, c.label)}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={createTrip.isPending || !city || dateError}
        type="button"
        className="w-full bg-accent py-3 text-sm font-bold text-onaccent disabled:opacity-60"
      >
        {createTrip.isPending ? t("setup.submitting") : interests.length === 0 ? t("setup.submitAll") : t("setup.submitFiltered")}
      </button>
    </div>
  );
}
