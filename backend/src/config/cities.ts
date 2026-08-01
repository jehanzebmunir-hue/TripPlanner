import { CityConfig } from "../types";

// priorityTier marks the cities pre-warmed at server startup (see
// services/ingestion.service.ts's warmPriorityCities) so the first real
// visitor to a major city doesn't pay the on-demand ensureCityFresh
// cold-start latency. Everything outside this small set is fetched purely
// on demand, the first time someone actually requests it.
//
// Tier 1 (11 cities): backed by real, cross-corroborated international-
// arrivals data — Euromonitor's own December 2025 press release directly
// names Bangkok (30.3M arrivals) and confirms Paris/Madrid/Tokyo/Rome/Milan
// as its top 5 in the separate "leading city for tourism" composite index;
// Hong Kong/London/Macau/Istanbul/Dubai/Mecca/Antalya/Paris/Kuala Lumpur
// round out the arrivals top 10 consistently across multiple independent
// sources with matching figures. Macau, Madrid, and Milan aren't in this
// registry, so they're not tagged even though they're real top-tier cities
// elsewhere. A third-party "full top 100" table was checked and rejected —
// beyond roughly rank 18 its figures decreased in suspiciously exact linear
// steps (a tell for fabricated/interpolated filler, not real data), and it
// isn't corroborated by Euromonitor's own public release.
//
// Tier 2 (33 cities): unambiguous major world capitals/tourism hubs by
// general knowledge — a judgment call, explicitly not backed by the kind of
// citation tier 1 has. Everything else in the registry is untagged, which
// means "no claim either way," not "unimportant."
export const CITIES: CityConfig[] = [
  {
    slug: "nyc",
    name: "New York, NY",
    country: "US",
    lat: 40.7127281,
    lng: -74.0060152,
    priorityTier: 1,
    ticketmasterMarket: "New York",
    seatgeekVenueCity: "New York",
    extraAdapters: ["nyc-open-data-events"],
  },
  {
    slug: "chicago",
    name: "Chicago, IL",
    country: "US",
    lat: 41.8755616,
    lng: -87.6244212,
    priorityTier: 2,
    ticketmasterMarket: "Chicago",
    seatgeekVenueCity: "Chicago",
    extraAdapters: ["chicago-park-events"],
  },
  // The four below run on the default adapters only (seed + google-places +
  // ticketmaster + seatgeek) — each candidate municipal open-data portal was
  // checked and rejected (SF's dataset is utility/construction permits, not
  // events; Seattle's stops in 2025 with no forward-looking rows; LA and DC
  // had no clearly matching dataset). Boston, previously in this list under
  // "runs on CKAN, not Socrata," was re-checked directly against its live
  // CKAN API and turned out to have a genuinely usable dataset — see
  // boston-events below and the README's Adapter model section. That's the
  // real lesson: "different platform" was a reason to check harder, not a
  // reason to stop. That's still the point of extraAdapters being
  // optional, though — most cities genuinely won't have one.
  {
    slug: "la",
    name: "Los Angeles, CA",
    country: "US",
    lat: 34.0536909,
    lng: -118.242766,
    priorityTier: 2,
    ticketmasterMarket: "Los Angeles",
    seatgeekVenueCity: "Los Angeles",
  },
  {
    slug: "sf",
    name: "San Francisco, CA",
    country: "US",
    lat: 37.7879363,
    lng: -122.4075201,
    priorityTier: 2,
    ticketmasterMarket: "San Francisco",
    seatgeekVenueCity: "San Francisco",
  },
  {
    slug: "boston",
    name: "Boston, MA",
    country: "US",
    lat: 42.3588336,
    lng: -71.0578303,
    ticketmasterMarket: "Boston",
    seatgeekVenueCity: "Boston",
    extraAdapters: ["boston-events"],
  },
  {
    slug: "seattle",
    name: "Seattle, WA",
    country: "US",
    lat: 47.6038321,
    lng: -122.330062,
    ticketmasterMarket: "Seattle",
    seatgeekVenueCity: "Seattle",
  },
  {
    slug: "dc",
    name: "Washington, DC",
    country: "US",
    lat: 38.8950982,
    lng: -77.0363849,
    priorityTier: 2,
    ticketmasterMarket: "Washington DC",
    seatgeekVenueCity: "Washington",
  },
  // First non-US cities. Ticketmaster's standard Discovery API (what we use,
  // not the separate "International Discovery API") genuinely covers Canada
  // and Mexico, verified before adding these — so no adapter code changes
  // needed. SeatGeek is US/Canada-primary with only partial Mexico coverage;
  // it'll just return fewer or no results for Mexico City, which is honest
  // degradation, not a bug. Toronto/Vancouver/Mexico City open-data portals
  // were each checked and none had a viable forward-looking events dataset
  // (Toronto and Vancouver aren't even on Socrata), so none get extraAdapters.
  {
    slug: "toronto",
    name: "Toronto, ON",
    country: "CA",
    lat: 43.6534817,
    lng: -79.3839347,
    priorityTier: 2,
    ticketmasterMarket: "Toronto",
    seatgeekVenueCity: "Toronto",
  },
  {
    slug: "vancouver",
    name: "Vancouver, BC",
    country: "CA",
    lat: 49.2608724,
    lng: -123.113952,
    priorityTier: 2,
    ticketmasterMarket: "Vancouver",
    seatgeekVenueCity: "Vancouver",
  },
  {
    slug: "mexico-city",
    name: "Mexico City, MX",
    country: "MX",
    lat: 19.3207722,
    lng: -99.1514678,
    priorityTier: 2,
    ticketmasterMarket: "Mexico City",
    seatgeekVenueCity: "Mexico City",
  },
  // South America. Ticketmaster's Latin America expansion is confirmed and
  // verified per-country before adding each: Brazil, Peru, Chile, and
  // Argentina were named directly in Ticketmaster's own expansion
  // announcements; Colombia was confirmed via its own 2026 market-launch
  // press release (HQ in Bogotá). SeatGeek's coverage here is essentially
  // US/Canada-only — expect it to return nothing for all five, which is
  // honest, not a bug. Buenos Aires' "permisos-eventos-masivos" dataset
  // looked promising but turned out to be a static one-off 2023 XLSX
  // export, not a live queryable API — a new rejection reason distinct
  // from "wrong platform" or "historical cutoff," worth telling apart.
  // countryCode is now passed to the Ticketmaster adapter specifically
  // because of this batch — without it, "San Jose" (added below, Costa
  // Rica) would collide with San Jose, CA.
  {
    slug: "rio",
    name: "Rio de Janeiro, Brazil",
    country: "BR",
    lat: -22.9110137,
    lng: -43.2093727,
    priorityTier: 2,
    ticketmasterMarket: "Rio de Janeiro",
    seatgeekVenueCity: "Rio de Janeiro",
  },
  {
    slug: "buenos-aires",
    name: "Buenos Aires, Argentina",
    country: "AR",
    lat: -34.6095579,
    lng: -58.3887904,
    priorityTier: 2,
    ticketmasterMarket: "Buenos Aires",
    seatgeekVenueCity: "Buenos Aires",
  },
  {
    slug: "lima",
    name: "Lima, Peru",
    country: "PE",
    lat: -12.0459808,
    lng: -77.0305912,
    ticketmasterMarket: "Lima",
    seatgeekVenueCity: "Lima",
  },
  {
    slug: "santiago",
    name: "Santiago, Chile",
    country: "CL",
    lat: -33.4376995,
    lng: -70.6510671,
    ticketmasterMarket: "Santiago",
    seatgeekVenueCity: "Santiago",
  },
  {
    slug: "bogota",
    name: "Bogotá, Colombia",
    country: "CO",
    lat: 4.6533817,
    lng: -74.0836331,
    ticketmasterMarket: "Bogota",
    seatgeekVenueCity: "Bogota",
  },
  // Central America. No evidence of a local Ticketmaster market operation
  // here (only international-tournament ticket sales that happen to
  // involve Costa Rican/Panamanian teams) — unlike the confirmed South
  // American launches above, this is genuinely unconfirmed. Included
  // anyway, on seed data, because Costa Rica is the region's dominant
  // tourist market and representation was explicitly asked for — but
  // expect Ticketmaster/SeatGeek to return little or nothing here, and
  // don't read that as a bug.
  {
    slug: "san-jose-cr",
    name: "San José, Costa Rica",
    country: "CR",
    lat: 9.9327707,
    lng: -84.0796144,
    ticketmasterMarket: "San Jose",
    seatgeekVenueCity: "San Jose",
  },
  // Africa. Ticketmaster launched directly in South Africa in 2022, then
  // expanded into Kenya (among others) via its July 2024 Quicket
  // acquisition — both confirmed, citable. Morocco and Egypt have no
  // confirmed Ticketmaster/SeatGeek presence at all — same honest-gap
  // treatment as Costa Rica: included anyway, seed-only, because Cairo and
  // Marrakech are too significant to skip for African representation.
  // CityPASS has no African destinations at all (checked, not assumed).
  {
    slug: "cape-town",
    name: "Cape Town, South Africa",
    country: "ZA",
    lat: -33.9288301,
    lng: 18.4172197,
    priorityTier: 2,
    ticketmasterMarket: "Cape Town",
    seatgeekVenueCity: "Cape Town",
  },
  {
    slug: "nairobi",
    name: "Nairobi, Kenya",
    country: "KE",
    lat: -1.302398,
    lng: 36.8288509,
    ticketmasterMarket: "Nairobi",
    seatgeekVenueCity: "Nairobi",
  },
  {
    slug: "cairo",
    name: "Cairo, Egypt",
    country: "EG",
    lat: 30.0443879,
    lng: 31.2357257,
    priorityTier: 2,
    ticketmasterMarket: "Cairo",
    seatgeekVenueCity: "Cairo",
  },
  {
    slug: "marrakech",
    name: "Marrakech, Morocco",
    country: "MA",
    lat: 31.6258257,
    lng: -7.9891608,
    priorityTier: 2,
    ticketmasterMarket: "Marrakech",
    seatgeekVenueCity: "Marrakech",
  },
  // Australia. Ticketmaster has operated here since 1995 with local offices
  // in Melbourne, Sydney, Brisbane, Perth, and Adelaide; SeatGeek also
  // confirmed operating in both Sydney and Melbourne directly — the
  // strongest non-US/Canada SeatGeek coverage found in this whole rollout.
  // No bespoke municipal adapter for either: Sydney's open data is split
  // across data.gov.au/ArcGIS with nothing clearly matching, and Melbourne's
  // portal — despite search results claiming Socrata — turned out on direct
  // API testing to actually run OpenDataSoft, a different platform. Search
  // snippets citing a platform aren't a substitute for hitting the real
  // endpoint. CityPASS doesn't cover Australia (a similarly-named but
  // different "Australia Multi-City Attractions Pass" / Go City product
  // does) — no structured-tier entry for either city.
  {
    slug: "sydney",
    name: "Sydney, Australia",
    country: "AU",
    lat: -33.8698439,
    lng: 151.2082848,
    priorityTier: 2,
    ticketmasterMarket: "Sydney",
    seatgeekVenueCity: "Sydney",
  },
  {
    slug: "melbourne",
    name: "Melbourne, Australia",
    country: "AU",
    lat: -37.8142454,
    lng: 144.9631732,
    priorityTier: 2,
    ticketmasterMarket: "Melbourne",
    seatgeekVenueCity: "Melbourne",
  },
  // Europe. Genuinely different from every prior region: Ticketmaster's
  // coverage here is ambiguous, not cleanly confirmed either way. The
  // separate "International Discovery API" historically covered continental
  // markets (Germany, Netherlands, Spain, etc.) via a different endpoint
  // (app.ticketmaster.eu) — but it's closed to new API key requests, and
  // Ticketmaster's own docs now redirect new integrations to the standard
  // Discovery API (what this adapter calls) instead. Whether that standard
  // endpoint has since absorbed continental coverage isn't confirmed by
  // documentation alone and can't be resolved without a live key to test.
  // UK is the exception — cleanly confirmed on the standard API from the
  // start, same as every other English-speaking market in this rollout.
  // SeatGeek: confirmed real UK presence (Premier League ticketing
  // partnerships), unconfirmed for the continental markets below.
  //
  // Paris got a bespoke adapter — the first non-Socrata, non-CKAN platform
  // integrated (OpenDataSoft). Its "Que faire à Paris" dataset is genuinely
  // excellent: live, forward-dated years out, real geo-coordinates. Content
  // from it is in French — the first non-English data ingested anywhere in
  // this app, surfacing the language gap for real rather than hypothetically.
  {
    slug: "london",
    name: "London, United Kingdom",
    country: "GB",
    lat: 51.5074456,
    lng: -0.1277653,
    priorityTier: 1,
    ticketmasterMarket: "London",
    seatgeekVenueCity: "London",
  },
  {
    slug: "paris",
    name: "Paris, France",
    country: "FR",
    lat: 48.8588897,
    lng: 2.320041,
    priorityTier: 1,
    ticketmasterMarket: "Paris",
    seatgeekVenueCity: "Paris",
    extraAdapters: ["paris-events"],
  },
  {
    slug: "rome",
    name: "Rome, Italy",
    country: "IT",
    lat: 41.8933203,
    lng: 12.4829321,
    priorityTier: 1,
    ticketmasterMarket: "Rome",
    seatgeekVenueCity: "Rome",
  },
  {
    slug: "barcelona",
    name: "Barcelona, Spain",
    country: "ES",
    lat: 41.3825802,
    lng: 2.177073,
    priorityTier: 2,
    ticketmasterMarket: "Barcelona",
    seatgeekVenueCity: "Barcelona",
  },
  {
    slug: "amsterdam",
    name: "Amsterdam, Netherlands",
    country: "NL",
    lat: 52.3730796,
    lng: 4.8924534,
    priorityTier: 2,
    ticketmasterMarket: "Amsterdam",
    seatgeekVenueCity: "Amsterdam",
  },
  {
    slug: "berlin",
    name: "Berlin, Germany",
    country: "DE",
    lat: 52.5173885,
    lng: 13.3951309,
    priorityTier: 2,
    ticketmasterMarket: "Berlin",
    seatgeekVenueCity: "Berlin",
  },
  // Asia (+ Dubai). The last queued region — coverage here splits three ways
  // rather than the usual clean yes/no:
  //  - Confirmed real expansion: Singapore and Taiwan (2020 launches) and
  //    Thailand (2022 Thai Ticket Major acquisition).
  //  - Confirmed NOT covered: South Korea — Interpark, Ticketlink, and Yes24
  //    are the real primary ticketers there, no meaningful Ticketmaster
  //    presence found. Seoul included anyway for representation, seed-only.
  //  - Ambiguous, same as continental Europe: Dubai/UAE. Ticketmaster
  //    Middle East has run since 2012 (ticketmaster.ae), but UAE was
  //    explicitly named as an International Discovery API market — the
  //    now-closed product — so whether its inventory reaches the standard
  //    endpoint this app calls is unconfirmed, not assumed either way.
  //  - Tokyo has no confirmed consumer Ticketmaster operation at all, only a
  //    narrow event-specific partnership with Japan's own PIA ticketing
  //    provider — same "essential representation despite no confirmed
  //    coverage" treatment as Costa Rica/Cairo/Marrakech.
  // No municipal open-data adapter for any of the six: Singapore's
  // government open data is extensive but its tourism-specific access point
  // (Tourism Info Hub) requires its own API key signup — treated the same
  // as Ticketmaster/SeatGeek/Google Places (a real future source, not a
  // zero-config adapter), not built now. CityPASS covers none of these six.
  {
    slug: "tokyo",
    name: "Tokyo, Japan",
    country: "JP",
    lat: 35.6768601,
    lng: 139.7638947,
    priorityTier: 1,
    ticketmasterMarket: "Tokyo",
    seatgeekVenueCity: "Tokyo",
  },
  {
    slug: "seoul",
    name: "Seoul, South Korea",
    country: "KR",
    lat: 37.5666791,
    lng: 126.9782914,
    priorityTier: 2,
    ticketmasterMarket: "Seoul",
    seatgeekVenueCity: "Seoul",
  },
  {
    slug: "singapore",
    name: "Singapore",
    country: "SG",
    lat: 1.357107,
    lng: 103.8194992,
    priorityTier: 1,
    ticketmasterMarket: "Singapore",
    seatgeekVenueCity: "Singapore",
  },
  {
    slug: "bangkok",
    name: "Bangkok, Thailand",
    country: "TH",
    lat: 13.7524938,
    lng: 100.4935089,
    priorityTier: 1,
    ticketmasterMarket: "Bangkok",
    seatgeekVenueCity: "Bangkok",
  },
  {
    slug: "taipei",
    name: "Taipei, Taiwan",
    country: "TW",
    lat: 25.0375198,
    lng: 121.5636796,
    ticketmasterMarket: "Taipei",
    seatgeekVenueCity: "Taipei",
  },
  {
    slug: "dubai",
    name: "Dubai, UAE",
    country: "AE",
    lat: 25.0742823,
    lng: 55.1885624,
    priorityTier: 1,
    ticketmasterMarket: "Dubai",
    seatgeekVenueCity: "Dubai",
  },
  // ── Tier 2 ──────────────────────────────────────────────────────────────
  // Everything above is Tier 1 — the cities nearly everyone recognizes. This
  // batch is Tier 2: a country's second/third major market, or the capital
  // of another globally well-known country not yet covered. Per explicit
  // instruction, information is deliberately leaner here: no open-data
  // portal research per city (Tier 1's policy), no volatile-tier seed
  // entries (no festival/marathon claims at this depth), 2-3 static seed
  // landmarks each, booking links only where genuinely confident. Ticketmaster
  // country coverage is still real, checked research, not skipped — that's
  // the one thing this project has never relaxed.
  //
  // Reused from Tier 1 research, no new check needed: US, Canada, Mexico,
  // Brazil, Peru, South Africa, Nigeria (Quicket), Australia — all already
  // confirmed. New countries checked this pass:
  //  - Confirmed: New Zealand (strong — exclusive Auckland stadium deals),
  //    Czech Republic (2017 Ticketpro acquisition), Turkey (named alongside
  //    confirmed countries, less deeply documented but real).
  //  - Ambiguous, same International-API situation as continental Europe:
  //    Austria (Vienna) — already known from the Europe pass.
  //  - Thin/unconfirmed: Hong Kong and Malaysia show only parent-company
  //    (Live Nation) presence, not clear direct ticketing operations.
  //    Portugal and India surfaced no evidence either way. Panama gets the
  //    same unconfirmed treatment as its neighbor Costa Rica.
  {
    slug: "miami",
    name: "Miami, FL",
    country: "US",
    lat: 25.7741566,
    lng: -80.1935973,
    priorityTier: 2,
    ticketmasterMarket: "Miami",
    seatgeekVenueCity: "Miami",
  },
  {
    slug: "las-vegas",
    name: "Las Vegas, NV",
    country: "US",
    lat: 36.1674263,
    lng: -115.1484131,
    priorityTier: 2,
    ticketmasterMarket: "Las Vegas",
    seatgeekVenueCity: "Las Vegas",
  },
  {
    slug: "montreal",
    name: "Montreal, QC",
    country: "CA",
    lat: 45.5031824,
    lng: -73.5698065,
    ticketmasterMarket: "Montreal",
    seatgeekVenueCity: "Montreal",
  },
  {
    slug: "cancun",
    name: "Cancún, Mexico",
    country: "MX",
    lat: 21.1527467,
    lng: -86.8425761,
    ticketmasterMarket: "Cancun",
    seatgeekVenueCity: "Cancun",
  },
  {
    slug: "sao-paulo",
    name: "São Paulo, Brazil",
    country: "BR",
    lat: -23.5506507,
    lng: -46.6333824,
    priorityTier: 2,
    ticketmasterMarket: "Sao Paulo",
    seatgeekVenueCity: "Sao Paulo",
  },
  {
    slug: "cusco",
    name: "Cusco, Peru",
    country: "PE",
    lat: -13.5170887,
    lng: -71.9785356,
    ticketmasterMarket: "Cusco",
    seatgeekVenueCity: "Cusco",
  },
  {
    slug: "panama-city",
    name: "Panama City, Panama",
    country: "PA",
    lat: 8.9714493,
    lng: -79.5341802,
    ticketmasterMarket: "Panama City",
    seatgeekVenueCity: "Panama City",
  },
  {
    slug: "johannesburg",
    name: "Johannesburg, South Africa",
    country: "ZA",
    lat: -26.205,
    lng: 28.049722,
    ticketmasterMarket: "Johannesburg",
    seatgeekVenueCity: "Johannesburg",
  },
  {
    slug: "lagos",
    name: "Lagos, Nigeria",
    country: "NG",
    lat: 6.4550575,
    lng: 3.3941795,
    ticketmasterMarket: "Lagos",
    seatgeekVenueCity: "Lagos",
  },
  {
    slug: "brisbane",
    name: "Brisbane, Australia",
    country: "AU",
    lat: -27.4689623,
    lng: 153.0235009,
    ticketmasterMarket: "Brisbane",
    seatgeekVenueCity: "Brisbane",
  },
  {
    slug: "auckland",
    name: "Auckland, New Zealand",
    country: "NZ",
    lat: -36.852095,
    lng: 174.7631803,
    ticketmasterMarket: "Auckland",
    seatgeekVenueCity: "Auckland",
  },
  {
    slug: "vienna",
    name: "Vienna, Austria",
    country: "AT",
    lat: 48.2083537,
    lng: 16.3725042,
    priorityTier: 2,
    ticketmasterMarket: "Vienna",
    seatgeekVenueCity: "Vienna",
  },
  {
    slug: "prague",
    name: "Prague, Czech Republic",
    country: "CZ",
    lat: 50.0874654,
    lng: 14.4212535,
    priorityTier: 2,
    ticketmasterMarket: "Prague",
    seatgeekVenueCity: "Prague",
  },
  {
    slug: "lisbon",
    name: "Lisbon, Portugal",
    country: "PT",
    lat: 38.7077507,
    lng: -9.1365919,
    priorityTier: 2,
    ticketmasterMarket: "Lisbon",
    seatgeekVenueCity: "Lisbon",
  },
  {
    slug: "istanbul",
    name: "Istanbul, Turkey",
    country: "TR",
    lat: 41.006381,
    lng: 28.9758715,
    priorityTier: 1,
    ticketmasterMarket: "Istanbul",
    seatgeekVenueCity: "Istanbul",
  },
  {
    slug: "hong-kong",
    name: "Hong Kong",
    country: "HK",
    lat: 22.3492155,
    lng: 114.1857978,
    priorityTier: 1,
    ticketmasterMarket: "Hong Kong",
    seatgeekVenueCity: "Hong Kong",
  },
  {
    slug: "kuala-lumpur",
    name: "Kuala Lumpur, Malaysia",
    country: "MY",
    lat: 3.1516964,
    lng: 101.6942371,
    priorityTier: 1,
    ticketmasterMarket: "Kuala Lumpur",
    seatgeekVenueCity: "Kuala Lumpur",
  },
  {
    slug: "mumbai",
    name: "Mumbai, India",
    country: "IN",
    lat: 19.054999,
    lng: 72.8692035,
    priorityTier: 2,
    ticketmasterMarket: "Mumbai",
    seatgeekVenueCity: "Mumbai",
  },
  // ── Tier 3 ──────────────────────────────────────────────────────────────
  // Well-known regional hubs and specialized draws. Same lean-research
  // policy as Tier 2 (no open-data check, no volatile-tier entries, fewer
  // seed items), but real per-country Ticketmaster verification for every
  // newly-introduced country — that discipline still never relaxes.
  //
  // Reused, no new check: US, Canada, Mexico, Colombia, Brazil, New Zealand,
  // Australia, Italy, UK, Thailand, Japan — all already confirmed/flagged
  // from Tier 1/2. Ireland specifically was confirmed all the way back in
  // the very first Ticketmaster research (named alongside the UK on the
  // standard Discovery API).
  // New countries checked this pass:
  //  - Confirmed: Zambia (named directly in the 2024 Quicket acquisition),
  //    Greece (a genuinely strong market — operating since 2005, ~97% of
  //    the country's sports-team ticketing).
  //  - Unconfirmed, no evidence found: Ecuador, Guatemala, Tanzania, Fiji,
  //    Iceland, Indonesia, Vietnam. All included anyway for representation,
  //    same treatment as Costa Rica/Cairo/Marrakech at Tier 1.
  {
    slug: "new-orleans",
    name: "New Orleans, LA",
    country: "US",
    lat: 29.9561422,
    lng: -90.0733934,
    ticketmasterMarket: "New Orleans",
    seatgeekVenueCity: "New Orleans",
  },
  {
    slug: "nashville",
    name: "Nashville, TN",
    country: "US",
    lat: 36.1622767,
    lng: -86.7742984,
    ticketmasterMarket: "Nashville",
    seatgeekVenueCity: "Nashville",
  },
  {
    slug: "quebec-city",
    name: "Quebec City, QC",
    country: "CA",
    lat: 46.8137431,
    lng: -71.2084061,
    ticketmasterMarket: "Quebec City",
    seatgeekVenueCity: "Quebec City",
  },
  {
    slug: "tulum",
    name: "Tulum, Mexico",
    country: "MX",
    lat: 20.429647,
    lng: -87.6529306,
    ticketmasterMarket: "Tulum",
    seatgeekVenueCity: "Tulum",
  },
  {
    slug: "cartagena",
    name: "Cartagena, Colombia",
    country: "CO",
    lat: 10.4265566,
    lng: -75.5441671,
    ticketmasterMarket: "Cartagena",
    seatgeekVenueCity: "Cartagena",
  },
  {
    slug: "foz-do-iguacu",
    name: "Foz do Iguaçu, Brazil",
    country: "BR",
    lat: -25.5304023,
    lng: -54.5830692,
    ticketmasterMarket: "Foz do Iguacu",
    seatgeekVenueCity: "Foz do Iguacu",
  },
  {
    slug: "quito",
    name: "Quito, Ecuador",
    country: "EC",
    lat: -0.2201641,
    lng: -78.5123274,
    ticketmasterMarket: "Quito",
    seatgeekVenueCity: "Quito",
  },
  {
    slug: "antigua-guatemala",
    name: "Antigua, Guatemala",
    country: "GT",
    lat: 14.5567814,
    lng: -90.7337346,
    ticketmasterMarket: "Antigua",
    seatgeekVenueCity: "Antigua",
  },
  {
    slug: "zanzibar",
    name: "Zanzibar, Tanzania",
    country: "TZ",
    lat: -6.0999709,
    lng: 39.3209535,
    ticketmasterMarket: "Zanzibar",
    seatgeekVenueCity: "Zanzibar",
  },
  {
    slug: "victoria-falls",
    name: "Victoria Falls, Zambia",
    country: "ZM",
    lat: -17.923992,
    lng: 25.85201,
    ticketmasterMarket: "Livingstone",
    seatgeekVenueCity: "Livingstone",
  },
  {
    slug: "queenstown",
    name: "Queenstown, New Zealand",
    country: "NZ",
    lat: -45.0321923,
    lng: 168.661,
    ticketmasterMarket: "Queenstown",
    seatgeekVenueCity: "Queenstown",
  },
  {
    slug: "cairns",
    name: "Cairns, Australia",
    country: "AU",
    lat: -16.9206657,
    lng: 145.7721854,
    ticketmasterMarket: "Cairns",
    seatgeekVenueCity: "Cairns",
  },
  {
    slug: "nadi",
    name: "Nadi, Fiji",
    country: "FJ",
    lat: -17.7992725,
    lng: 177.4178549,
    ticketmasterMarket: "Nadi",
    seatgeekVenueCity: "Nadi",
  },
  {
    slug: "florence",
    name: "Florence, Italy",
    country: "IT",
    lat: 43.7697955,
    lng: 11.2556404,
    priorityTier: 2,
    ticketmasterMarket: "Florence",
    seatgeekVenueCity: "Florence",
  },
  {
    slug: "santorini",
    name: "Santorini, Greece",
    country: "GR",
    lat: 36.4071112,
    lng: 25.4566637,
    ticketmasterMarket: "Santorini",
    seatgeekVenueCity: "Santorini",
  },
  {
    slug: "reykjavik",
    name: "Reykjavik, Iceland",
    country: "IS",
    lat: 64.145981,
    lng: -21.9422367,
    ticketmasterMarket: "Reykjavik",
    seatgeekVenueCity: "Reykjavik",
  },
  {
    slug: "edinburgh",
    name: "Edinburgh, Scotland",
    country: "GB",
    lat: 55.9533456,
    lng: -3.1883749,
    priorityTier: 2,
    ticketmasterMarket: "Edinburgh",
    seatgeekVenueCity: "Edinburgh",
  },
  {
    slug: "dublin",
    name: "Dublin, Ireland",
    country: "IE",
    lat: 53.3493795,
    lng: -6.2605593,
    priorityTier: 2,
    ticketmasterMarket: "Dublin",
    seatgeekVenueCity: "Dublin",
  },
  {
    slug: "ubud",
    name: "Ubud, Bali, Indonesia",
    country: "ID",
    lat: -8.5170195,
    lng: 115.2550507,
    ticketmasterMarket: "Ubud",
    seatgeekVenueCity: "Ubud",
  },
  {
    slug: "chiang-mai",
    name: "Chiang Mai, Thailand",
    country: "TH",
    lat: 18.7882778,
    lng: 98.9858802,
    ticketmasterMarket: "Chiang Mai",
    seatgeekVenueCity: "Chiang Mai",
  },
  {
    slug: "ho-chi-minh-city",
    name: "Ho Chi Minh City, Vietnam",
    country: "VN",
    lat: 10.7737261,
    lng: 106.7166008,
    ticketmasterMarket: "Ho Chi Minh City",
    seatgeekVenueCity: "Ho Chi Minh City",
  },
  {
    slug: "kyoto",
    name: "Kyoto, Japan",
    country: "JP",
    lat: 35.0115754,
    lng: 135.7681441,
    priorityTier: 2,
    ticketmasterMarket: "Kyoto",
    seatgeekVenueCity: "Kyoto",
  },
  // ── Tier 4 ──────────────────────────────────────────────────────────────
  // Emerging destinations — real, growing tourist interest, less universal
  // recognition. Same lean policy as Tiers 2-3. Worth naming a pattern that
  // showed up clearly this pass: "emerging" destinations skew toward
  // countries with less developed international ticketing infrastructure —
  // only one of the nine new countries checked came back confirmed. That's
  // an expected correlation, not noise.
  //
  // Reused, no new check: US, Canada, Mexico, Colombia, Chile, Brazil,
  // Australia, New Zealand, Morocco (Essaouira — unconfirmed, same as
  // Marrakech), Portugal (Porto — unconfirmed, same as Lisbon), Vietnam
  // (Da Nang — unconfirmed, same as Ho Chi Minh City).
  // New countries checked:
  //  - Confirmed: Poland (Ticketmaster Poland since 2014, Warsaw office).
  //  - Ambiguous/thin: China — real historical joint-venture investments
  //    (Beijing Gehua Ticketmaster, Emma Ticketmaster in Beijing/Shanghai)
  //    but nothing confirming the standard Discovery API endpoint this app
  //    calls actually returns results there. Same category as Hong Kong.
  //  - Unconfirmed, no evidence found: Slovenia, Georgia, Rwanda, Namibia,
  //    Belize, Cambodia, Sri Lanka.
  {
    slug: "charleston",
    name: "Charleston, SC",
    country: "US",
    lat: 32.7884363,
    lng: -79.9399309,
    ticketmasterMarket: "Charleston",
    seatgeekVenueCity: "Charleston",
  },
  {
    slug: "asheville",
    name: "Asheville, NC",
    country: "US",
    lat: 35.595363,
    lng: -82.5508407,
    ticketmasterMarket: "Asheville",
    seatgeekVenueCity: "Asheville",
  },
  {
    slug: "puerto-vallarta",
    name: "Puerto Vallarta, Mexico",
    country: "MX",
    lat: 20.6407176,
    lng: -105.220306,
    ticketmasterMarket: "Puerto Vallarta",
    seatgeekVenueCity: "Puerto Vallarta",
  },
  {
    slug: "halifax",
    name: "Halifax, NS",
    country: "CA",
    lat: 44.648618,
    lng: -63.5859487,
    ticketmasterMarket: "Halifax",
    seatgeekVenueCity: "Halifax",
  },
  {
    slug: "medellin",
    name: "Medellín, Colombia",
    country: "CO",
    lat: 6.2697324,
    lng: -75.6025597,
    ticketmasterMarket: "Medellin",
    seatgeekVenueCity: "Medellin",
  },
  {
    slug: "valparaiso",
    name: "Valparaíso, Chile",
    country: "CL",
    lat: -33.0458456,
    lng: -71.6196749,
    ticketmasterMarket: "Valparaiso",
    seatgeekVenueCity: "Valparaiso",
  },
  {
    slug: "salvador",
    name: "Salvador, Brazil",
    country: "BR",
    lat: -12.9822499,
    lng: -38.4812772,
    ticketmasterMarket: "Salvador",
    seatgeekVenueCity: "Salvador",
  },
  {
    slug: "belize-city",
    name: "Belize City, Belize",
    country: "BZ",
    lat: 17.5002768,
    lng: -88.1988737,
    ticketmasterMarket: "Belize City",
    seatgeekVenueCity: "Belize City",
  },
  {
    slug: "kigali",
    name: "Kigali, Rwanda",
    country: "RW",
    lat: -1.9534357,
    lng: 30.1140089,
    ticketmasterMarket: "Kigali",
    seatgeekVenueCity: "Kigali",
  },
  {
    slug: "essaouira",
    name: "Essaouira, Morocco",
    country: "MA",
    lat: 31.5118281,
    lng: -9.7620903,
    ticketmasterMarket: "Essaouira",
    seatgeekVenueCity: "Essaouira",
  },
  {
    slug: "swakopmund",
    name: "Swakopmund, Namibia",
    country: "NA",
    lat: -22.6768424,
    lng: 14.528972,
    ticketmasterMarket: "Swakopmund",
    seatgeekVenueCity: "Swakopmund",
  },
  {
    slug: "hobart",
    name: "Hobart, Australia",
    country: "AU",
    lat: -42.8825088,
    lng: 147.3281233,
    ticketmasterMarket: "Hobart",
    seatgeekVenueCity: "Hobart",
  },
  {
    slug: "wellington",
    name: "Wellington, New Zealand",
    country: "NZ",
    lat: -41.2887953,
    lng: 174.7772114,
    ticketmasterMarket: "Wellington",
    seatgeekVenueCity: "Wellington",
  },
  {
    slug: "porto",
    name: "Porto, Portugal",
    country: "PT",
    lat: 41.1502195,
    lng: -8.6103497,
    ticketmasterMarket: "Porto",
    seatgeekVenueCity: "Porto",
  },
  {
    slug: "tbilisi",
    name: "Tbilisi, Georgia",
    country: "GE",
    lat: 41.6934591,
    lng: 44.8014495,
    ticketmasterMarket: "Tbilisi",
    seatgeekVenueCity: "Tbilisi",
  },
  {
    slug: "ljubljana",
    name: "Ljubljana, Slovenia",
    country: "SI",
    lat: 46.0500268,
    lng: 14.5069289,
    ticketmasterMarket: "Ljubljana",
    seatgeekVenueCity: "Ljubljana",
  },
  {
    slug: "krakow",
    name: "Krakow, Poland",
    country: "PL",
    lat: 50.0469432,
    lng: 19.9971534,
    ticketmasterMarket: "Krakow",
    seatgeekVenueCity: "Krakow",
  },
  {
    slug: "da-nang",
    name: "Da Nang, Vietnam",
    country: "VN",
    lat: 16.068501,
    lng: 108.2240242,
    ticketmasterMarket: "Da Nang",
    seatgeekVenueCity: "Da Nang",
  },
  {
    slug: "siem-reap",
    name: "Siem Reap, Cambodia",
    country: "KH",
    lat: 13.3617562,
    lng: 103.8590321,
    ticketmasterMarket: "Siem Reap",
    seatgeekVenueCity: "Siem Reap",
  },
  {
    slug: "colombo",
    name: "Colombo, Sri Lanka",
    country: "LK",
    lat: 6.9388614,
    lng: 79.8542005,
    ticketmasterMarket: "Colombo",
    seatgeekVenueCity: "Colombo",
  },
  {
    slug: "xian",
    name: "Xi'an, China",
    country: "CN",
    lat: 34.261004,
    lng: 108.9423363,
    ticketmasterMarket: "Xian",
    seatgeekVenueCity: "Xian",
  },
  // ── Tier 5 (last tier) ──────────────────────────────────────────────────
  // Niche/off-the-beaten-path but legitimate destinations. Thin data is the
  // expected, intended outcome here, not a gap — most cities below get a
  // single seed landmark. The country-coverage pattern from Tier 4 got even
  // more pronounced: 0 of 4 newly-checked countries came back confirmed
  // this time (vs. 1 of 9 at Tier 4). At this level of remoteness, that's
  // the expected correlation, not a surprise.
  //
  // Reused, no new check: US, Canada, Mexico, Argentina, Chile, Australia,
  // New Zealand, India (Leh — unconfirmed, same as Mumbai), Norway and
  // Austria (both already known ambiguous from the Tier 1 Europe /
  // International-Discovery-API finding). Uganda (Kampala) reuses its
  // confirmation from the very first Africa research in this project —
  // named directly in the 2024 Quicket acquisition alongside Nigeria,
  // Kenya, Zambia, and Botswana.
  // New countries checked, all unconfirmed: Bolivia, Ethiopia, Laos, Bhutan.
  {
    slug: "anchorage",
    name: "Anchorage, AK",
    country: "US",
    lat: 61.2163129,
    lng: -149.894852,
    ticketmasterMarket: "Anchorage",
    seatgeekVenueCity: "Anchorage",
  },
  {
    slug: "santa-fe",
    name: "Santa Fe, NM",
    country: "US",
    lat: 35.6876096,
    lng: -105.938456,
    ticketmasterMarket: "Santa Fe",
    seatgeekVenueCity: "Santa Fe",
  },
  {
    slug: "whitehorse",
    name: "Whitehorse, YT",
    country: "CA",
    lat: 60.721571,
    lng: -135.054932,
    ticketmasterMarket: "Whitehorse",
    seatgeekVenueCity: "Whitehorse",
  },
  {
    slug: "san-miguel-de-allende",
    name: "San Miguel de Allende, Mexico",
    country: "MX",
    lat: 20.9130501,
    lng: -100.73566,
    ticketmasterMarket: "San Miguel de Allende",
    seatgeekVenueCity: "San Miguel de Allende",
  },
  {
    slug: "uyuni",
    name: "Uyuni, Bolivia",
    country: "BO",
    lat: -20.4628406,
    lng: -66.8239072,
    ticketmasterMarket: "Uyuni",
    seatgeekVenueCity: "Uyuni",
  },
  {
    slug: "ushuaia",
    name: "Ushuaia, Argentina",
    country: "AR",
    lat: -54.807306,
    lng: -68.3084133,
    ticketmasterMarket: "Ushuaia",
    seatgeekVenueCity: "Ushuaia",
  },
  {
    slug: "chiloe",
    name: "Chiloé, Chile",
    country: "CL",
    lat: -42.5978086,
    lng: -73.959118,
    ticketmasterMarket: "Castro",
    seatgeekVenueCity: "Castro",
  },
  {
    slug: "lalibela",
    name: "Lalibela, Ethiopia",
    country: "ET",
    lat: 12.0360639,
    lng: 39.0456845,
    ticketmasterMarket: "Lalibela",
    seatgeekVenueCity: "Lalibela",
  },
  {
    slug: "kampala",
    name: "Kampala, Uganda",
    country: "UG",
    lat: 0.3177137,
    lng: 32.5813539,
    ticketmasterMarket: "Kampala",
    seatgeekVenueCity: "Kampala",
  },
  {
    slug: "yulara",
    name: "Yulara (Uluru), Australia",
    country: "AU",
    lat: -25.2410108,
    lng: 130.9869405,
    ticketmasterMarket: "Yulara",
    seatgeekVenueCity: "Yulara",
  },
  {
    slug: "rotorua",
    name: "Rotorua, New Zealand",
    country: "NZ",
    lat: -38.136073,
    lng: 176.2525434,
    ticketmasterMarket: "Rotorua",
    seatgeekVenueCity: "Rotorua",
  },
  {
    slug: "torshavn",
    name: "Tórshavn, Faroe Islands",
    country: "FO",
    lat: 62.0101396,
    lng: -6.7715709,
    ticketmasterMarket: "Torshavn",
    seatgeekVenueCity: "Torshavn",
  },
  {
    slug: "bergen",
    name: "Bergen, Norway",
    country: "NO",
    lat: 60.3943055,
    lng: 5.3259192,
    ticketmasterMarket: "Bergen",
    seatgeekVenueCity: "Bergen",
  },
  {
    slug: "hallstatt",
    name: "Hallstatt, Austria",
    country: "AT",
    lat: 47.5347939,
    lng: 13.5988875,
    ticketmasterMarket: "Hallstatt",
    seatgeekVenueCity: "Hallstatt",
  },
  {
    slug: "luang-prabang",
    name: "Luang Prabang, Laos",
    country: "LA",
    lat: 19.8887438,
    lng: 102.135898,
    ticketmasterMarket: "Luang Prabang",
    seatgeekVenueCity: "Luang Prabang",
  },
  {
    slug: "leh",
    name: "Leh, India",
    country: "IN",
    lat: 34.1642029,
    lng: 77.5848133,
    ticketmasterMarket: "Leh",
    seatgeekVenueCity: "Leh",
  },
  {
    slug: "paro",
    name: "Paro, Bhutan",
    country: "BT",
    lat: 27.4646365,
    lng: 89.3183409,
    ticketmasterMarket: "Paro",
    seatgeekVenueCity: "Paro",
  },

  // --- Reach expansion, post-tier-roadmap -----------------------------
  // The five-tier plan (Tiers 1-5, above) is complete. This block fills
  // specific, real gaps identified after that rollout closed — regions a
  // general trip-planning audience would expect that the tier system
  // happened not to reach. Same discipline as every batch above: every
  // coverage claim below is checked against a live search result or a
  // real Ticketmaster/SeatGeek listing, not assumed from a neighboring
  // country's pattern.

  // Caribbean — previously absent entirely, arguably the single biggest
  // gap for a US-anchored trip planner (one of the most-booked leisure
  // regions from that market). Two of four confirmed directly against
  // live ticketmaster.com/seatgeek.com listings, a first for this region:
  {
    slug: "san-juan",
    name: "San Juan, Puerto Rico",
    country: "PR",
    lat: 18.384239,
    lng: -66.05344,
    ticketmasterMarket: "San Juan",
    seatgeekVenueCity: "San Juan",
  },
  {
    slug: "punta-cana",
    name: "Punta Cana, Dominican Republic",
    country: "DO",
    lat: 18.556551,
    lng: -68.3691611,
    ticketmasterMarket: "Punta Cana",
    seatgeekVenueCity: "Punta Cana",
  },
  {
    slug: "montego-bay",
    name: "Montego Bay, Jamaica",
    country: "JM",
    lat: 18.4724603,
    lng: -77.9217357,
    ticketmasterMarket: "Montego Bay",
    seatgeekVenueCity: "Montego Bay",
  },
  {
    slug: "nassau",
    name: "Nassau, Bahamas",
    country: "BS",
    lat: 25.0782266,
    lng: -77.3383438,
    ticketmasterMarket: "Nassau",
    seatgeekVenueCity: "Nassau",
  },

  // Scandinavia — 3 of 4 Nordic countries were previously missing (only
  // Norway, via Bergen at Tier 5, was covered). All three were already
  // named, back in the original Tier 1 Europe research, as historical
  // International Discovery API markets (the same now-closed product
  // behind Germany/Netherlands/Austria/Spain's ambiguity) — so on paper
  // this looked like three more "ambiguous" entries. Direct verification
  // upgraded all three past that: ticketmaster.se, .dk, and .fi each
  // return real, current, dated 2026 event listings at named venues
  // (Strawberry Arena, Royal Arena, Parken) — the same "real launch +
  // live listings" standard that upgraded Poland at Tier 4, applied here
  // for the first time to markets that were previously on the ambiguous
  // list. The standard-vs-international-API technicality this app's own
  // adapter actually calls is still unresolved without a live key — same
  // as literally every non-US-anchored market in this project.
  {
    slug: "stockholm",
    name: "Stockholm, Sweden",
    country: "SE",
    lat: 59.3251172,
    lng: 18.0710935,
    priorityTier: 2,
    ticketmasterMarket: "Stockholm",
    seatgeekVenueCity: "Stockholm",
  },
  {
    slug: "copenhagen",
    name: "Copenhagen, Denmark",
    country: "DK",
    lat: 55.6867243,
    lng: 12.5700724,
    priorityTier: 2,
    ticketmasterMarket: "Copenhagen",
    seatgeekVenueCity: "Copenhagen",
  },
  {
    slug: "helsinki",
    name: "Helsinki, Finland",
    country: "FI",
    lat: 60.1666204,
    lng: 24.9435408,
    ticketmasterMarket: "Helsinki",
    seatgeekVenueCity: "Helsinki",
  },

  // Switzerland — confirmed the same way as the Nordics above: a real 2016
  // launch (Ticketmaster Schweiz AG, Zurich/Dübendorf), a named MD as of
  // 2024, and a live ticketmaster.ch site. Also historically named as an
  // International Discovery API market, same paper-ambiguity as the
  // Nordics, same upgrade via direct operational evidence.
  {
    slug: "zurich",
    name: "Zurich, Switzerland",
    country: "CH",
    lat: 47.3744489,
    lng: 8.5410422,
    priorityTier: 2,
    ticketmasterMarket: "Zurich",
    seatgeekVenueCity: "Zurich",
  },

  // Middle East beyond UAE — previously absent. Israel confirmed strongly
  // (Live Nation's direct 2017 launch via a majority stake in Tel Aviv's
  // Bluestone Entertainment, explicitly serving "the full country
  // including both Tel Aviv and Jerusalem" per its own press coverage —
  // the same category of evidence as South Africa/Kenya's direct launch
  // confirmations). Jordan came back with no Ticketmaster or SeatGeek
  // evidence at all — the local eTathkara platform dominates — included
  // anyway, seed-only, for the same reason as Costa Rica/Cairo/Marrakech:
  // Petra is too significant a destination to skip for representation.
  {
    slug: "jerusalem",
    name: "Jerusalem, Israel",
    country: "IL",
    lat: 31.7788472,
    lng: 35.2257856,
    ticketmasterMarket: "Jerusalem",
    seatgeekVenueCity: "Jerusalem",
  },
  {
    slug: "amman",
    name: "Amman, Jordan",
    country: "JO",
    lat: 31.9515694,
    lng: 35.9239625,
    ticketmasterMarket: "Amman",
    seatgeekVenueCity: "Amman",
  },

  // Nepal — previously absent; no confirmed Ticketmaster/SeatGeek presence
  // (local platforms TicketChha and TicketSanjal dominate), included
  // anyway for the same reason as Jordan: Kathmandu and the Everest-region
  // trekking market are too significant to skip on ticketing-coverage
  // grounds alone.
  {
    slug: "kathmandu",
    name: "Kathmandu, Nepal",
    country: "NP",
    lat: 27.708317,
    lng: 85.3205817,
    ticketmasterMarket: "Kathmandu",
    seatgeekVenueCity: "Kathmandu",
  },

  // --- Second reach-expansion batch ---------------------------------------
  // Gulf markets confirmed strongly: Ticketmaster has run regional offices
  // (Dubai, Abu Dhabi, Qatar, Saudi Arabia) since 2012, and Qatar has its
  // own named 2014 launch press release ("Ticketmaster Expands Presence To
  // 19 Countries With Launch Of Ticketmaster Qatar") — same evidentiary
  // standard as Israel/South Africa's direct-launch confirmations.
  {
    slug: "riyadh",
    name: "Riyadh, Saudi Arabia",
    country: "SA",
    lat: 24.638916,
    lng: 46.7160104,
    ticketmasterMarket: "Riyadh",
    seatgeekVenueCity: "Riyadh",
  },
  {
    slug: "doha",
    name: "Doha, Qatar",
    country: "QA",
    lat: 25.3108807,
    lng: 51.5081812,
    ticketmasterMarket: "Doha",
    seatgeekVenueCity: "Doha",
  },
  // Central Asia: no confirmed Ticketmaster/SeatGeek evidence — local
  // platform iTicket.uz dominates. Included anyway, same treatment as every
  // other unconfirmed-but-significant destination in this project.
  {
    slug: "samarkand",
    name: "Samarkand, Uzbekistan",
    country: "UZ",
    lat: 39.6550017,
    lng: 66.9756954,
    ticketmasterMarket: "Samarkand",
    seatgeekVenueCity: "Samarkand",
  },
  // Croatia came back a clean no — same category as South Korea: local
  // platforms (Eventim.hr, ulaznice.hr) hold the market, no direct
  // Ticketmaster Croatia operation found. Hungary is thinner still: only
  // Ticketmaster Austria's cross-border reach, actively losing ground to
  // local competitors per its own traffic-ranking data — treated the same
  // as Hong Kong/Malaysia's "parent-company presence only" bucket.
  {
    slug: "dubrovnik",
    name: "Dubrovnik, Croatia",
    country: "HR",
    lat: 42.6491029,
    lng: 18.0939501,
    ticketmasterMarket: "Dubrovnik",
    seatgeekVenueCity: "Dubrovnik",
  },
  {
    slug: "budapest",
    name: "Budapest, Hungary",
    country: "HU",
    lat: 47.4813896,
    lng: 19.1457723,
    priorityTier: 2,
    ticketmasterMarket: "Budapest",
    seatgeekVenueCity: "Budapest",
  },
  // French Polynesia: no evidence either way, included for the same reason
  // as every other unconfirmed-but-essential Pacific/island destination.
  {
    slug: "tahiti",
    name: "Papeete, Tahiti (French Polynesia)",
    country: "PF",
    lat: -17.5373835,
    lng: -149.5659964,
    ticketmasterMarket: "Papeete",
    seatgeekVenueCity: "Papeete",
  },

  // --- Third reach-expansion batch ---------------------------------------
  // Philippines confirmed strongly: a real 2026 joint venture ("SM
  // Ticketmaster") between Ticketmaster and Philippine developer SM Prime,
  // named in direct press coverage as covering both Manila (SM Mall of
  // Asia Arena) and Cebu (the upcoming SM Seaside Cebu Arena) specifically.
  {
    slug: "cebu",
    name: "Cebu, Philippines",
    country: "PH",
    lat: 10.47,
    lng: 123.83,
    ticketmasterMarket: "Cebu",
    seatgeekVenueCity: "Cebu",
  },
  // Malta confirmed via real, current event listings on ticketmaster.com
  // itself (e.g. "Breaking Borders 2026") rather than a launch
  // announcement — the same standard used for Sweden/Denmark/Finland.
  {
    slug: "valletta",
    name: "Valletta, Malta",
    country: "MT",
    lat: 35.8989979,
    lng: 14.5136607,
    ticketmasterMarket: "Malta",
    seatgeekVenueCity: "Malta",
  },
  // Botswana confirmed — missed at Tier 4/reach-batch-1, found this round:
  // Ticketmaster's July 2024 Quicket acquisition explicitly named Botswana
  // alongside Nigeria/Uganda/Kenya/Zambia, all already confirmed elsewhere
  // in this registry via that same acquisition.
  {
    slug: "maun",
    name: "Maun, Botswana",
    country: "BW",
    lat: -19.9860951,
    lng: 23.4224352,
    ticketmasterMarket: "Maun",
    seatgeekVenueCity: "Maun",
  },
  // Everything below came back unconfirmed — no Ticketmaster/SeatGeek
  // evidence found either way. Included anyway, same reasoning applied to
  // every unconfirmed-but-legitimate destination throughout this project:
  // Uruguay is notably absent from Ticketmaster's own named Latin America
  // expansion (Mexico, Chile, Argentina, Brazil, Colombia — not Uruguay);
  // Barbados has a real local platform (TicketLinkz) with no sign of
  // Ticketmaster; Oman, Tunisia, Mauritius, Seychelles, Mongolia,
  // Kazakhstan, Aruba, the Maldives, Romania, and Serbia all surfaced no
  // evidence in either direction.
  {
    slug: "montevideo",
    name: "Montevideo, Uruguay",
    country: "UY",
    lat: -34.9058916,
    lng: -56.1913095,
    ticketmasterMarket: "Montevideo",
    seatgeekVenueCity: "Montevideo",
  },
  {
    slug: "bridgetown",
    name: "Bridgetown, Barbados",
    country: "BB",
    lat: 13.0977832,
    lng: -59.6184184,
    ticketmasterMarket: "Bridgetown",
    seatgeekVenueCity: "Bridgetown",
  },
  {
    slug: "oranjestad",
    name: "Oranjestad, Aruba",
    country: "AW",
    lat: 12.5201024,
    lng: -70.0371329,
    ticketmasterMarket: "Aruba",
    seatgeekVenueCity: "Aruba",
  },
  {
    slug: "male",
    name: "Malé, Maldives",
    country: "MV",
    lat: 4.1779879,
    lng: 73.5107387,
    ticketmasterMarket: "Male",
    seatgeekVenueCity: "Male",
  },
  {
    slug: "muscat",
    name: "Muscat, Oman",
    country: "OM",
    lat: 23.6123628,
    lng: 58.5938134,
    ticketmasterMarket: "Muscat",
    seatgeekVenueCity: "Muscat",
  },
  {
    slug: "tunis",
    name: "Tunis, Tunisia",
    country: "TN",
    lat: 36.8002068,
    lng: 10.1857757,
    ticketmasterMarket: "Tunis",
    seatgeekVenueCity: "Tunis",
  },
  {
    slug: "port-louis",
    name: "Port Louis, Mauritius",
    country: "MU",
    lat: -20.1624522,
    lng: 57.5028044,
    ticketmasterMarket: "Port Louis",
    seatgeekVenueCity: "Port Louis",
  },
  {
    slug: "victoria-sc",
    name: "Victoria, Seychelles",
    country: "SC",
    lat: -4.6232085,
    lng: 55.452359,
    ticketmasterMarket: "Victoria",
    seatgeekVenueCity: "Victoria",
  },
  {
    slug: "ulaanbaatar",
    name: "Ulaanbaatar, Mongolia",
    country: "MN",
    lat: 47.9184676,
    lng: 106.9177016,
    ticketmasterMarket: "Ulaanbaatar",
    seatgeekVenueCity: "Ulaanbaatar",
  },
  {
    slug: "almaty",
    name: "Almaty, Kazakhstan",
    country: "KZ",
    lat: 43.2363924,
    lng: 76.9457275,
    ticketmasterMarket: "Almaty",
    seatgeekVenueCity: "Almaty",
  },
  {
    slug: "bucharest",
    name: "Bucharest, Romania",
    country: "RO",
    lat: 44.4361414,
    lng: 26.102684,
    ticketmasterMarket: "Bucharest",
    seatgeekVenueCity: "Bucharest",
  },
  {
    slug: "belgrade",
    name: "Belgrade, Serbia",
    country: "RS",
    lat: 44.8153318,
    lng: 20.4456588,
    ticketmasterMarket: "Belgrade",
    seatgeekVenueCity: "Belgrade",
  },
];

export function getCity(slug: string): CityConfig | undefined {
  return CITIES.find((c) => c.slug === slug);
}
