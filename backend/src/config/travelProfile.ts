export type BudgetTier = "budget" | "moderate" | "premium";

export interface TravelProfile {
  budgetTier: BudgetTier;
  bestSeason: string;
}

/**
 * Curated, per-city facts — same discipline as seed.ts: real, checked
 * general knowledge (hemisphere, climate pattern, known cost-of-living
 * reputation), not a live third-party integration and not a fabricated
 * score. budgetTier is a relative judgment for a typical independent
 * traveler (accommodation + food + activities), not a formal cost index.
 * See the README's "Two ways into the app" section for why this exists
 * and what it deliberately doesn't do (no numeric crowd/density scores).
 */
export const TRAVEL_PROFILE_BY_SLUG: Record<string, TravelProfile> = {
  nyc: { budgetTier: "premium", bestSeason: "Apr–Jun, Sep–Nov" },
  chicago: { budgetTier: "moderate", bestSeason: "May–Sep" },
  la: { budgetTier: "premium", bestSeason: "Mar–May, Sep–Nov" },
  sf: { budgetTier: "premium", bestSeason: "Sep–Oct" },
  boston: { budgetTier: "moderate", bestSeason: "May–Oct" },
  seattle: { budgetTier: "moderate", bestSeason: "Jun–Sep" },
  dc: { budgetTier: "moderate", bestSeason: "Mar–May, Sep–Oct" },
  miami: { budgetTier: "premium", bestSeason: "Nov–Apr" },
  "las-vegas": { budgetTier: "moderate", bestSeason: "Mar–May, Oct–Nov" },
  "new-orleans": { budgetTier: "moderate", bestSeason: "Feb–May" },
  nashville: { budgetTier: "moderate", bestSeason: "Apr–Jun, Sep–Nov" },
  charleston: { budgetTier: "moderate", bestSeason: "Apr–Jun, Sep–Oct" },
  asheville: { budgetTier: "moderate", bestSeason: "Apr–Jun, Sep–Oct" },
  anchorage: { budgetTier: "moderate", bestSeason: "Jun–Aug" },
  "santa-fe": { budgetTier: "moderate", bestSeason: "May–Jun, Sep–Oct" },

  toronto: { budgetTier: "moderate", bestSeason: "Jun–Sep" },
  vancouver: { budgetTier: "moderate", bestSeason: "Jun–Sep" },
  montreal: { budgetTier: "moderate", bestSeason: "Jun–Sep" },
  "quebec-city": { budgetTier: "moderate", bestSeason: "Jun–Sep" },
  halifax: { budgetTier: "moderate", bestSeason: "Jun–Sep" },
  whitehorse: { budgetTier: "moderate", bestSeason: "Jun–Aug (midnight sun), Nov–Mar (northern lights)" },

  "mexico-city": { budgetTier: "moderate", bestSeason: "Mar–May, Sep–Nov" },
  cancun: { budgetTier: "moderate", bestSeason: "Dec–Apr" },
  tulum: { budgetTier: "moderate", bestSeason: "Dec–Apr" },
  "puerto-vallarta": { budgetTier: "moderate", bestSeason: "Nov–Apr" },
  "san-miguel-de-allende": { budgetTier: "moderate", bestSeason: "Nov–Apr" },

  rio: { budgetTier: "moderate", bestSeason: "Dec–Mar" },
  "sao-paulo": { budgetTier: "moderate", bestSeason: "Apr–Jun, Sep–Nov" },
  salvador: { budgetTier: "budget", bestSeason: "Sep–Mar" },
  "foz-do-iguacu": { budgetTier: "moderate", bestSeason: "Apr–Jun, Sep–Nov" },

  "buenos-aires": { budgetTier: "budget", bestSeason: "Sep–Nov, Mar–May" },
  ushuaia: { budgetTier: "moderate", bestSeason: "Nov–Mar" },

  lima: { budgetTier: "budget", bestSeason: "Apr–Oct" },
  cusco: { budgetTier: "budget", bestSeason: "Apr–Oct" },

  santiago: { budgetTier: "moderate", bestSeason: "Sep–Nov, Mar–May" },
  valparaiso: { budgetTier: "moderate", bestSeason: "Sep–Nov, Mar–May" },
  chiloe: { budgetTier: "moderate", bestSeason: "Dec–Feb" },

  bogota: { budgetTier: "budget", bestSeason: "Dec–Mar, Jul–Aug" },
  cartagena: { budgetTier: "moderate", bestSeason: "Dec–Apr" },
  medellin: { budgetTier: "budget", bestSeason: "Dec–Mar" },

  "san-jose-cr": { budgetTier: "moderate", bestSeason: "Dec–Apr" },
  "panama-city": { budgetTier: "moderate", bestSeason: "Dec–Apr" },
  "antigua-guatemala": { budgetTier: "budget", bestSeason: "Nov–Apr" },
  "belize-city": { budgetTier: "moderate", bestSeason: "Dec–Apr" },
  quito: { budgetTier: "budget", bestSeason: "Jun–Sep, Dec–Jan" },
  uyuni: { budgetTier: "budget", bestSeason: "Dec–Apr (mirror effect), May–Nov (dry salt flats)" },

  "cape-town": { budgetTier: "moderate", bestSeason: "Nov–Mar" },
  johannesburg: { budgetTier: "moderate", bestSeason: "Apr–Sep" },
  nairobi: { budgetTier: "moderate", bestSeason: "Jun–Oct, Jan–Feb" },
  cairo: { budgetTier: "budget", bestSeason: "Oct–Apr" },
  marrakech: { budgetTier: "budget", bestSeason: "Mar–May, Sep–Nov" },
  essaouira: { budgetTier: "budget", bestSeason: "Apr–Oct" },
  lagos: { budgetTier: "moderate", bestSeason: "Nov–Mar" },
  kigali: { budgetTier: "moderate", bestSeason: "Jun–Sep, Dec–Feb" },
  swakopmund: { budgetTier: "moderate", bestSeason: "Sep–Nov" },
  zanzibar: { budgetTier: "moderate", bestSeason: "Jun–Oct, Dec–Feb" },
  "victoria-falls": { budgetTier: "moderate", bestSeason: "May–Aug" },
  lalibela: { budgetTier: "budget", bestSeason: "Oct–Mar" },
  kampala: { budgetTier: "budget", bestSeason: "Jun–Aug, Dec–Feb" },

  sydney: { budgetTier: "premium", bestSeason: "Sep–Nov, Mar–May" },
  melbourne: { budgetTier: "premium", bestSeason: "Mar–May, Sep–Nov" },
  brisbane: { budgetTier: "moderate", bestSeason: "Apr–Oct" },
  cairns: { budgetTier: "moderate", bestSeason: "Jun–Oct" },
  hobart: { budgetTier: "moderate", bestSeason: "Dec–Feb" },
  yulara: { budgetTier: "moderate", bestSeason: "May–Sep" },

  auckland: { budgetTier: "moderate", bestSeason: "Dec–Feb" },
  queenstown: { budgetTier: "premium", bestSeason: "Dec–Feb, Jun–Aug" },
  wellington: { budgetTier: "moderate", bestSeason: "Dec–Mar" },
  rotorua: { budgetTier: "moderate", bestSeason: "Dec–Mar" },
  nadi: { budgetTier: "moderate", bestSeason: "May–Oct" },

  london: { budgetTier: "premium", bestSeason: "May–Sep" },
  edinburgh: { budgetTier: "moderate", bestSeason: "Jun–Sep" },
  dublin: { budgetTier: "moderate", bestSeason: "May–Sep" },
  paris: { budgetTier: "premium", bestSeason: "Apr–Jun, Sep–Oct" },
  rome: { budgetTier: "premium", bestSeason: "Apr–Jun, Sep–Oct" },
  florence: { budgetTier: "premium", bestSeason: "Apr–Jun, Sep–Oct" },
  barcelona: { budgetTier: "moderate", bestSeason: "May–Jun, Sep–Oct" },
  amsterdam: { budgetTier: "premium", bestSeason: "Apr–May, Jun–Aug" },
  berlin: { budgetTier: "moderate", bestSeason: "May–Sep" },
  vienna: { budgetTier: "premium", bestSeason: "Apr–Jun, Sep–Oct" },
  hallstatt: { budgetTier: "moderate", bestSeason: "May–Sep" },
  prague: { budgetTier: "moderate", bestSeason: "Apr–May, Sep–Oct" },
  lisbon: { budgetTier: "moderate", bestSeason: "Mar–May, Sep–Oct" },
  porto: { budgetTier: "moderate", bestSeason: "Mar–May, Sep–Oct" },
  istanbul: { budgetTier: "budget", bestSeason: "Apr–May, Sep–Oct" },
  santorini: { budgetTier: "premium", bestSeason: "Apr–Jun, Sep–Oct" },
  reykjavik: { budgetTier: "premium", bestSeason: "Jun–Aug, Sep–Mar" },
  tbilisi: { budgetTier: "budget", bestSeason: "Apr–Jun, Sep–Oct" },
  ljubljana: { budgetTier: "moderate", bestSeason: "May–Sep" },
  krakow: { budgetTier: "budget", bestSeason: "May–Sep" },
  torshavn: { budgetTier: "premium", bestSeason: "Jun–Aug" },
  bergen: { budgetTier: "premium", bestSeason: "May–Sep" },
  stockholm: { budgetTier: "premium", bestSeason: "Jun–Aug" },
  copenhagen: { budgetTier: "premium", bestSeason: "Jun–Aug" },
  helsinki: { budgetTier: "premium", bestSeason: "Jun–Aug" },
  zurich: { budgetTier: "premium", bestSeason: "Jun–Sep" },

  tokyo: { budgetTier: "premium", bestSeason: "Mar–Apr, Oct–Nov" },
  kyoto: { budgetTier: "premium", bestSeason: "Mar–Apr, Oct–Nov" },
  seoul: { budgetTier: "moderate", bestSeason: "Mar–May, Sep–Nov" },
  singapore: { budgetTier: "premium", bestSeason: "Feb–Apr" },
  bangkok: { budgetTier: "budget", bestSeason: "Nov–Feb" },
  "chiang-mai": { budgetTier: "budget", bestSeason: "Nov–Feb" },
  taipei: { budgetTier: "moderate", bestSeason: "Oct–Dec, Mar–Apr" },
  dubai: { budgetTier: "premium", bestSeason: "Nov–Mar" },
  "hong-kong": { budgetTier: "premium", bestSeason: "Oct–Dec" },
  "kuala-lumpur": { budgetTier: "budget", bestSeason: "Jun–Aug" },
  mumbai: { budgetTier: "budget", bestSeason: "Nov–Feb" },
  leh: { budgetTier: "budget", bestSeason: "Jun–Sep" },
  "ho-chi-minh-city": { budgetTier: "budget", bestSeason: "Dec–Apr" },
  "da-nang": { budgetTier: "budget", bestSeason: "Feb–May" },
  "siem-reap": { budgetTier: "budget", bestSeason: "Nov–Feb" },
  colombo: { budgetTier: "budget", bestSeason: "Dec–Mar" },
  xian: { budgetTier: "moderate", bestSeason: "Mar–May, Sep–Nov" },
  ubud: { budgetTier: "budget", bestSeason: "Apr–Oct" },
  "luang-prabang": { budgetTier: "budget", bestSeason: "Nov–Feb" },
  paro: { budgetTier: "premium", bestSeason: "Mar–May, Sep–Nov" },
  kathmandu: { budgetTier: "budget", bestSeason: "Oct–Nov, Mar–Apr" },

  "san-juan": { budgetTier: "moderate", bestSeason: "Dec–Apr" },
  "punta-cana": { budgetTier: "moderate", bestSeason: "Dec–Apr" },
  "montego-bay": { budgetTier: "moderate", bestSeason: "Dec–Apr" },
  nassau: { budgetTier: "premium", bestSeason: "Dec–Apr" },

  jerusalem: { budgetTier: "moderate", bestSeason: "Mar–May, Sep–Nov" },
  amman: { budgetTier: "moderate", bestSeason: "Mar–May, Sep–Oct" },

  riyadh: { budgetTier: "premium", bestSeason: "Nov–Mar" },
  doha: { budgetTier: "premium", bestSeason: "Nov–Mar" },
  samarkand: { budgetTier: "budget", bestSeason: "Mar–May, Sep–Nov" },
  dubrovnik: { budgetTier: "premium", bestSeason: "May–Jun, Sep–Oct" },
  budapest: { budgetTier: "budget", bestSeason: "Apr–Jun, Sep–Oct" },
  tahiti: { budgetTier: "premium", bestSeason: "May–Oct" },

  cebu: { budgetTier: "budget", bestSeason: "Dec–May" },
  valletta: { budgetTier: "moderate", bestSeason: "Apr–Jun, Sep–Oct" },
  maun: { budgetTier: "premium", bestSeason: "May–Sep" },
  montevideo: { budgetTier: "moderate", bestSeason: "Dec–Mar" },
  bridgetown: { budgetTier: "premium", bestSeason: "Dec–Apr" },
  oranjestad: { budgetTier: "premium", bestSeason: "Year-round (outside the hurricane belt)" },
  male: { budgetTier: "premium", bestSeason: "Nov–Apr" },
  muscat: { budgetTier: "premium", bestSeason: "Nov–Mar" },
  tunis: { budgetTier: "budget", bestSeason: "Mar–May, Sep–Nov" },
  "port-louis": { budgetTier: "premium", bestSeason: "May–Dec" },
  "victoria-sc": { budgetTier: "premium", bestSeason: "Apr–May, Oct–Nov" },
  ulaanbaatar: { budgetTier: "moderate", bestSeason: "Jun–Sep" },
  almaty: { budgetTier: "moderate", bestSeason: "May–Sep" },
  bucharest: { budgetTier: "budget", bestSeason: "May–Jun, Sep–Oct" },
  belgrade: { budgetTier: "budget", bestSeason: "Apr–Jun, Sep–Oct" },
};

export function getTravelProfile(slug: string): TravelProfile {
  return TRAVEL_PROFILE_BY_SLUG[slug] ?? { budgetTier: "moderate", bestSeason: "Year-round" };
}
