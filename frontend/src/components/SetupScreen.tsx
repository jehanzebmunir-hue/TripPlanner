import { useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "../categories";
import { useCities, useCreateTrip } from "../hooks";
import { CitySummary, Trip } from "../types";
import { FindDestinationPanel } from "./FindDestinationPanel";

interface Props {
  interests: string[];
  onInterestsChange: (interests: string[]) => void;
  onCreated: (trip: Trip) => void;
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
};

function groupByCountry(cities: CitySummary[]): [string, CitySummary[]][] {
  const groups = new Map<string, CitySummary[]>();
  for (const c of cities) {
    const list = groups.get(c.country) ?? [];
    list.push(c);
    groups.set(c.country, list);
  }
  return Array.from(groups.entries());
}

export function SetupScreen({ interests, onInterestsChange, onCreated }: Props) {
  const { data: cities } = useCities();
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("2026-10-09");
  const [endDate, setEndDate] = useState("2026-10-11");
  const createTrip = useCreateTrip();
  const cityGroups = useMemo(() => groupByCountry(cities ?? []), [cities]);

  useEffect(() => {
    if (!city && cities && cities.length > 0) setCity(cities[0].slug);
  }, [cities, city]);

  function toggle(slug: string) {
    onInterestsChange(interests.includes(slug) ? interests.filter((i) => i !== slug) : [...interests, slug]);
  }

  function handleSubmit() {
    const destination = cities?.find((c) => c.slug === city)?.name ?? city;
    createTrip.mutate({ city, destination, startDate, endDate, interests }, { onSuccess: onCreated });
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
