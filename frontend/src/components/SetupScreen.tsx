import { useEffect, useMemo, useState } from "react";
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

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  BR: "Brazil",
  AR: "Argentina",
  PE: "Peru",
  CL: "Chile",
  CO: "Colombia",
  CR: "Costa Rica",
  ZA: "South Africa",
  KE: "Kenya",
  EG: "Egypt",
  MA: "Morocco",
  AU: "Australia",
  GB: "United Kingdom",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  DE: "Germany",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  TH: "Thailand",
  TW: "Taiwan",
  AE: "United Arab Emirates",
  PA: "Panama",
  NG: "Nigeria",
  NZ: "New Zealand",
  AT: "Austria",
  CZ: "Czech Republic",
  PT: "Portugal",
  TR: "Turkey",
  HK: "Hong Kong",
  MY: "Malaysia",
  IN: "India",
  EC: "Ecuador",
  GT: "Guatemala",
  TZ: "Tanzania",
  ZM: "Zambia",
  FJ: "Fiji",
  GR: "Greece",
  IS: "Iceland",
  IE: "Ireland",
  ID: "Indonesia",
  VN: "Vietnam",
  BZ: "Belize",
  RW: "Rwanda",
  NA: "Namibia",
  GE: "Georgia",
  SI: "Slovenia",
  PL: "Poland",
  KH: "Cambodia",
  LK: "Sri Lanka",
  CN: "China",
  BO: "Bolivia",
  ET: "Ethiopia",
  UG: "Uganda",
  FO: "Faroe Islands",
  NO: "Norway",
  LA: "Laos",
  BT: "Bhutan",
  PR: "Puerto Rico",
  DO: "Dominican Republic",
  JM: "Jamaica",
  BS: "Bahamas",
  SE: "Sweden",
  DK: "Denmark",
  FI: "Finland",
  CH: "Switzerland",
  IL: "Israel",
  JO: "Jordan",
  NP: "Nepal",
  SA: "Saudi Arabia",
  QA: "Qatar",
  UZ: "Uzbekistan",
  HR: "Croatia",
  HU: "Hungary",
  PF: "French Polynesia",
  PH: "Philippines",
  MT: "Malta",
  BW: "Botswana",
  UY: "Uruguay",
  BB: "Barbados",
  AW: "Aruba",
  MV: "Maldives",
  OM: "Oman",
  TN: "Tunisia",
  MU: "Mauritius",
  SC: "Seychelles",
  MN: "Mongolia",
  KZ: "Kazakhstan",
  RO: "Romania",
  RS: "Serbia",
  BE: "Belgium",
  MO: "Macau",
};

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

export function SetupScreen({ interests, onInterestsChange, onCreated }: Props) {
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
        <h2 className="mb-1 font-serif text-xl">Plan the trip</h2>
        <p className="text-sm text-ink-soft">Set the basics — Discover tunes itself to this.</p>
      </div>

      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          Destination
        </label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Destination"
          className="mb-2 w-full border border-line bg-paper-raised px-3 py-2.5 text-sm"
        >
          {cityGroups.map(([country, group]) => (
            <optgroup key={country} label={COUNTRY_NAMES[country] ?? country}>
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
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">Dates</label>
        <div className="flex gap-2.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 border border-line bg-paper-raised px-3 py-2.5 font-mono text-[13px]"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 border border-line bg-paper-raised px-3 py-2.5 font-mono text-[13px]"
          />
        </div>
      </div>

      <div>
        {legs.map((leg, i) => (
          <div key={i} className="mb-2.5 border border-line bg-paper-raised p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                Also visiting
              </span>
              <button
                type="button"
                onClick={() => removeLeg(i)}
                aria-label={`Remove city ${i + 2}`}
                className="font-mono text-[11px] text-ink-faint underline"
              >
                Remove
              </button>
            </div>
            <select
              value={leg.city}
              onChange={(e) => updateLeg(i, { city: e.target.value })}
              aria-label={`City ${i + 2}`}
              className="mb-2 w-full border border-line bg-paper px-3 py-2 text-sm"
            >
              {cityGroups.map(([country, group]) => (
                <optgroup key={country} label={COUNTRY_NAMES[country] ?? country}>
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
                onChange={(e) => updateLeg(i, { startDate: e.target.value })}
                aria-label={`City ${i + 2} start date`}
                className="flex-1 border border-line bg-paper px-3 py-2 font-mono text-[13px]"
              />
              <input
                type="date"
                value={leg.endDate}
                onChange={(e) => updateLeg(i, { endDate: e.target.value })}
                aria-label={`City ${i + 2} end date`}
                className="flex-1 border border-line bg-paper px-3 py-2 font-mono text-[13px]"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addLeg}
          className="w-full border border-dashed border-line py-2 text-xs font-semibold text-ink-soft"
        >
          + Add another city
        </button>
      </div>

      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          Your currency <span className="normal-case text-ink-faint">— prices show a converted estimate too</span>
        </label>
        <select
          value={homeCurrency}
          onChange={(e) => setHomeCurrency(e.target.value)}
          aria-label="Your currency"
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
          Interests <span className="normal-case text-ink-faint">— optional, narrows what you see</span>
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
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={createTrip.isPending || !city}
        type="button"
        className="w-full bg-accent py-3 text-sm font-bold text-onaccent disabled:opacity-60"
      >
        {createTrip.isPending ? "Setting up…" : interests.length === 0 ? "See everything →" : "See what's on →"}
      </button>
    </div>
  );
}
