# Trip Planner

A working slice of the trip planner concept — discovery + freshness pipeline for a solo traveler, now live in 159 pilot cities across all six inhabited continents, per the concept brief and system architecture.

## Run it

```
cd backend
npm install
npm run db:push      # creates dev.db (SQLite)
npm run db:seed      # seeds the static checklist template items
npm run ingest -- --city=nyc
npm run ingest -- --city=chicago
npm run ingest -- --city=la
npm run ingest -- --city=sf
npm run ingest -- --city=boston
npm run ingest -- --city=seattle
npm run ingest -- --city=dc
npm run ingest -- --city=toronto
npm run ingest -- --city=vancouver
npm run ingest -- --city=mexico-city
npm run ingest -- --city=rio
npm run ingest -- --city=buenos-aires
npm run ingest -- --city=lima
npm run ingest -- --city=santiago
npm run ingest -- --city=bogota
npm run ingest -- --city=san-jose-cr
npm run ingest -- --city=cape-town
npm run ingest -- --city=nairobi
npm run ingest -- --city=cairo
npm run ingest -- --city=marrakech
npm run ingest -- --city=sydney
npm run ingest -- --city=melbourne
npm run ingest -- --city=london
npm run ingest -- --city=paris
npm run ingest -- --city=rome
npm run ingest -- --city=barcelona
npm run ingest -- --city=amsterdam
npm run ingest -- --city=berlin
npm run ingest -- --city=tokyo
npm run ingest -- --city=seoul
npm run ingest -- --city=singapore
npm run ingest -- --city=bangkok
npm run ingest -- --city=taipei
npm run ingest -- --city=dubai
npm run ingest -- --city=miami
npm run ingest -- --city=las-vegas
npm run ingest -- --city=montreal
npm run ingest -- --city=cancun
npm run ingest -- --city=sao-paulo
npm run ingest -- --city=cusco
npm run ingest -- --city=panama-city
npm run ingest -- --city=johannesburg
npm run ingest -- --city=lagos
npm run ingest -- --city=brisbane
npm run ingest -- --city=auckland
npm run ingest -- --city=vienna
npm run ingest -- --city=prague
npm run ingest -- --city=lisbon
npm run ingest -- --city=istanbul
npm run ingest -- --city=hong-kong
npm run ingest -- --city=kuala-lumpur
npm run ingest -- --city=mumbai
npm run ingest -- --city=new-orleans
npm run ingest -- --city=nashville
npm run ingest -- --city=quebec-city
npm run ingest -- --city=tulum
npm run ingest -- --city=cartagena
npm run ingest -- --city=foz-do-iguacu
npm run ingest -- --city=quito
npm run ingest -- --city=antigua-guatemala
npm run ingest -- --city=zanzibar
npm run ingest -- --city=victoria-falls
npm run ingest -- --city=queenstown
npm run ingest -- --city=cairns
npm run ingest -- --city=nadi
npm run ingest -- --city=florence
npm run ingest -- --city=santorini
npm run ingest -- --city=reykjavik
npm run ingest -- --city=edinburgh
npm run ingest -- --city=dublin
npm run ingest -- --city=ubud
npm run ingest -- --city=chiang-mai
npm run ingest -- --city=ho-chi-minh-city
npm run ingest -- --city=kyoto
npm run ingest -- --city=charleston
npm run ingest -- --city=asheville
npm run ingest -- --city=puerto-vallarta
npm run ingest -- --city=halifax
npm run ingest -- --city=medellin
npm run ingest -- --city=valparaiso
npm run ingest -- --city=salvador
npm run ingest -- --city=belize-city
npm run ingest -- --city=kigali
npm run ingest -- --city=essaouira
npm run ingest -- --city=swakopmund
npm run ingest -- --city=hobart
npm run ingest -- --city=wellington
npm run ingest -- --city=porto
npm run ingest -- --city=tbilisi
npm run ingest -- --city=ljubljana
npm run ingest -- --city=krakow
npm run ingest -- --city=da-nang
npm run ingest -- --city=siem-reap
npm run ingest -- --city=colombo
npm run ingest -- --city=xian
npm run ingest -- --city=anchorage
npm run ingest -- --city=santa-fe
npm run ingest -- --city=whitehorse
npm run ingest -- --city=san-miguel-de-allende
npm run ingest -- --city=uyuni
npm run ingest -- --city=ushuaia
npm run ingest -- --city=chiloe
npm run ingest -- --city=lalibela
npm run ingest -- --city=kampala
npm run ingest -- --city=yulara
npm run ingest -- --city=rotorua
npm run ingest -- --city=torshavn
npm run ingest -- --city=bergen
npm run ingest -- --city=hallstatt
npm run ingest -- --city=luang-prabang
npm run ingest -- --city=leh
npm run ingest -- --city=paro
npm run ingest -- --city=san-juan
npm run ingest -- --city=punta-cana
npm run ingest -- --city=montego-bay
npm run ingest -- --city=nassau
npm run ingest -- --city=stockholm
npm run ingest -- --city=copenhagen
npm run ingest -- --city=helsinki
npm run ingest -- --city=zurich
npm run ingest -- --city=jerusalem
npm run ingest -- --city=amman
npm run ingest -- --city=kathmandu
npm run ingest -- --city=riyadh
npm run ingest -- --city=doha
npm run ingest -- --city=samarkand
npm run ingest -- --city=dubrovnik
npm run ingest -- --city=budapest
npm run ingest -- --city=tahiti
npm run ingest -- --city=cebu
npm run ingest -- --city=valletta
npm run ingest -- --city=maun
npm run ingest -- --city=montevideo
npm run ingest -- --city=bridgetown
npm run ingest -- --city=oranjestad
npm run ingest -- --city=male
npm run ingest -- --city=muscat
npm run ingest -- --city=tunis
npm run ingest -- --city=port-louis
npm run ingest -- --city=victoria-sc
npm run ingest -- --city=ulaanbaatar
npm run ingest -- --city=almaty
npm run ingest -- --city=bucharest
npm run ingest -- --city=belgrade
npm run dev          # API on :3001
```

```
npm test              # vitest — decay engine, ingestion (incl. adapter
                       # health tracking), Chicago grouping, market-collision
                       # guard, travel-profile coverage, destination
                       # recommender, retry/backoff behavior, password reset,
                       # account deletion, stale-trip and reset-token
                       # retention, Google Places spend guard, structured
                       # pricing, exchange-rate sync (74 tests)
npm run check:collisions  # standalone city-market collision check (also
                           # runs as part of the test suite)
npm run sweep:stale-trips [-- --days=90]  # deletes anonymous trips untouched
                                           # past the threshold (on-demand —
                                           # not yet on a schedule, see below)
```

```
cd frontend
npm install
npm run dev          # app on :5173, proxies /api to :3001
npm test             # vitest + React Testing Library — SetupScreen,
                      # ItineraryScreen, FindDestinationPanel, DiscoverScreen,
                      # AccountPanel (15 tests)
```

## Cities — Tier 1 (34)

**US:** NYC, Chicago, Los Angeles, San Francisco, Boston, Seattle, Washington DC.
**Canada:** Toronto, Vancouver.
**Mexico:** Mexico City.
**South America:** Rio de Janeiro, Buenos Aires, Lima, Santiago, Bogotá.
**Central America:** San José (Costa Rica).
**Africa:** Cape Town, Nairobi, Cairo, Marrakech.
**Australia:** Sydney, Melbourne.
**Europe:** London, Paris, Rome, Barcelona, Amsterdam, Berlin.
**Asia + UAE:** Tokyo, Seoul, Singapore, Bangkok, Taipei, Dubai.

## Cities — Tier 2 (18)

**US:** Miami, Las Vegas.
**Canada:** Montreal.
**Mexico:** Cancún.
**South/Central America:** São Paulo, Cusco, Panama City.
**Africa:** Johannesburg, Lagos.
**Australia/Oceania:** Brisbane, Auckland.
**Europe:** Vienna, Prague, Lisbon, Istanbul.
**Asia:** Hong Kong, Kuala Lumpur, Mumbai.

## Cities — Tier 3 (22)

**US:** New Orleans, Nashville.
**Canada:** Quebec City.
**Mexico:** Tulum.
**South/Central America:** Cartagena, Foz do Iguaçu, Quito, Antigua (Guatemala).
**Africa:** Zanzibar, Victoria Falls (Zambia).
**Australia/Oceania:** Queenstown, Cairns, Nadi (Fiji).
**Europe:** Florence, Santorini, Reykjavik, Edinburgh, Dublin.
**Asia:** Ubud (Bali), Chiang Mai, Ho Chi Minh City, Kyoto.

## Cities — Tier 4 (21)

**US:** Charleston, Asheville.
**Canada:** Halifax.
**Mexico:** Puerto Vallarta.
**South/Central America:** Medellín, Valparaíso, Salvador, Belize City.
**Africa:** Kigali (Rwanda), Essaouira (Morocco), Swakopmund (Namibia).
**Australia/Oceania:** Hobart, Wellington.
**Europe:** Porto, Tbilisi (Georgia), Ljubljana (Slovenia), Krakow.
**Asia:** Da Nang, Siem Reap (Cambodia), Colombo (Sri Lanka), Xi'an (China).

## Cities — Tier 5 (17)

**US:** Anchorage, Santa Fe.
**Canada:** Whitehorse.
**Mexico:** San Miguel de Allende.
**South America:** Uyuni (Bolivia), Ushuaia, Chiloé.
**Africa:** Lalibela (Ethiopia), Kampala (Uganda).
**Australia/Oceania:** Yulara (Uluru), Rotorua.
**Europe:** Tórshavn (Faroe Islands), Bergen, Hallstatt.
**Asia:** Luang Prabang (Laos), Leh, Paro (Bhutan).

## Cities — Reach expansion (11)

Not a sixth tier — the five-tier roadmap is complete and closed. This batch instead fills specific gaps identified after that roadmap finished: regions a general trip-planning audience would expect that the tier system, built continent-by-continent rather than gap-by-gap, happened not to reach. See "Reach expansion findings" below for what was checked.

**Caribbean:** San Juan (Puerto Rico), Punta Cana (Dominican Republic), Montego Bay (Jamaica), Nassau (Bahamas).
**Scandinavia:** Stockholm, Copenhagen, Helsinki.
**Switzerland:** Zurich.
**Middle East:** Jerusalem, Amman (Jordan).
**South Asia:** Kathmandu.

## Cities — Reach expansion, batch 2 (6)

A second gap-filling batch, same non-tier status as batch 1 above.

**Gulf:** Riyadh (Saudi Arabia), Doha (Qatar).
**Central Asia:** Samarkand (Uzbekistan).
**Balkans:** Dubrovnik (Croatia).
**Central Europe:** Budapest (Hungary).
**Pacific:** Papeete, Tahiti (French Polynesia).

## Cities — Reach expansion, batch 3 (15)

A third gap-filling batch, same non-tier status as batches 1 and 2.

**Southeast Asia:** Cebu (Philippines).
**Southern Europe:** Valletta (Malta).
**Southern Africa:** Maun (Botswana).
**South America:** Montevideo (Uruguay).
**Caribbean:** Bridgetown (Barbados), Oranjestad (Aruba).
**South Asia:** Malé (Maldives).
**Middle East:** Muscat (Oman).
**North Africa:** Tunis (Tunisia).
**Indian Ocean:** Port Louis (Mauritius), Victoria (Seychelles).
**Central Asia:** Ulaanbaatar (Mongolia), Almaty (Kazakhstan).
**Eastern Europe:** Bucharest (Romania), Belgrade (Serbia).

The Setup screen's destination picker reads `/api/cities` directly and groups by `country`, so both lists are the only things that need to change to add a city to the UI.

## The tier system

Five tiers, based on genuine global tourism significance rather than arbitrary picks — each tier a step down in universal recognition, and each one explicitly permitted to carry thinner data than the tier above it:

1. **Tier 1 (done, 34 cities)** — the cities nearly everyone recognizes; each country's dominant global tourism flagship.
2. **Tier 2 (done, 18 cities)** — a country's second/third major market, or the capital of another globally well-known country not yet covered.
3. **Tier 3 (done, 22 cities)** — well-known regional hubs and specialized draws (a specific nature/adventure gateway, a smaller capital).
4. **Tier 4 (done, 21 cities)** — emerging destinations with real, growing tourist interest but less universal recognition.
5. **Tier 5 (done, 17 cities)** — niche/off-the-beaten-path but legitimate destinations, where thin data is the expected outcome, not a gap to apologize for.

Tier 2's research was deliberately lighter than Tier 1's, per explicit instruction that less-abundant information is acceptable at this depth: no open-data-portal search per city, no volatile-tier (festival/event) seed entries, 2-3 static landmarks each, and booking links included only where genuinely confident rather than guessed. **What was never relaxed**: real per-country Ticketmaster/SeatGeek/CityPASS verification. That discipline holds at every tier — the depth of seed content can shrink, but a coverage claim is never asserted without a real check behind it.

Tier 2's country-coverage findings, continuing the same continent order as Tier 1:
- **Reused from Tier 1, no new check needed** (same country, second city): US, Canada, Mexico, Brazil, Peru, South Africa, Nigeria, Australia — all already confirmed.
- **Newly confirmed**: New Zealand (strong — Ticketmaster holds exclusive ticketing deals with Auckland's major stadiums), Czech Republic (2017 Ticketpro acquisition).
- **Reasonably confirmed, less deeply documented**: Turkey.
- **Ambiguous, same International-Discovery-API situation as continental Europe**: Austria (Vienna) — already known from the Tier 1 Europe pass, no new research needed.
- **Thin or unconfirmed**: Hong Kong and Malaysia show only parent-company (Live Nation) presence, not clear direct consumer ticketing. Portugal and India surfaced no evidence either way. Panama gets the same unconfirmed-but-included treatment as its Tier 1 neighbor Costa Rica.

Tier 3's country-coverage findings, same continent order, same lean-research policy as Tier 2 (no open-data check, no volatile-tier entries, seed sets often down to 1-2 landmarks):
- **Reused, no new check**: US, Canada, Mexico, Colombia, Brazil, New Zealand, Australia, Italy, UK, Thailand, Japan — all already confirmed from Tier 1/2. Ireland specifically was confirmed all the way back in the very first Ticketmaster research in this project (named alongside the UK).
- **Newly confirmed**: Zambia (named directly in the 2024 Quicket acquisition — Victoria Falls' seed entry is on the Zambia side specifically because of this), Greece (a genuinely strong market, operating there since 2005 with ~97% of the country's sports-team ticketing).
- **Unconfirmed, no evidence found**: Ecuador, Guatemala, Tanzania, Fiji, Iceland, Indonesia, Vietnam. All seven included anyway for representation — Quito, Antigua, Zanzibar, Nadi, Reykjavik, Ubud, and Ho Chi Minh City are all real, legitimate Tier 3 destinations regardless of ticketing-platform status, same reasoning as Costa Rica/Cairo/Marrakech.
- **Three cities dropped to a single seed entry** rather than the usual 2-3 — Foz do Iguaçu, Zanzibar, and Nadi are each genuinely a one-landmark destination (a waterfall, a historic quarter, a hot spring) rather than a place with multiple distinct things to seed.

Tier 4's country-coverage findings, same continent order and lean-research policy — 21 cities, seed sets often down to a single landmark:
- **Reused, no new check**: US, Canada, Mexico, Colombia, Chile, Brazil, Australia, New Zealand, Morocco, Portugal, Vietnam — all already confirmed or flagged from earlier tiers.
- **Newly confirmed**: Poland (Ticketmaster Poland since 2014, Warsaw office).
- **Ambiguous/thin**: China — real historical joint-venture investments (Beijing Gehua Ticketmaster, Emma Ticketmaster in Beijing/Shanghai) but nothing confirming the standard endpoint this app calls actually returns results there. Same category as Hong Kong.
- **Unconfirmed, no evidence found**: Slovenia, Georgia, Rwanda, Namibia, Belize, Cambodia, Sri Lanka — seven of the nine newly-checked countries. Worth naming as a pattern rather than a coincidence: "emerging" destinations by definition skew toward countries with less-developed international ticketing infrastructure. All included anyway — Tbilisi, Ljubljana, Kigali, Swakopmund, Belize City, Siem Reap, and Colombo are all real, legitimate destinations regardless of ticketing-platform status.
- **Nine cities dropped to a single seed entry** (Belize City, Kigali, Essaouira, Swakopmund, Tbilisi, Ljubljana, Da Nang, Siem Reap, Xi'an) — each is a genuine one-landmark-first destination (Angkor Wat, the Terracotta Army, a genocide memorial) rather than an arbitrary trim.

Tier 5's country-coverage findings, same continent order, leanest research policy yet — 17 cities, most down to a single seed landmark by design:
- **Reused, no new check**: US, Canada, Mexico, Argentina, Chile, Australia, New Zealand, India — all already confirmed from earlier tiers. Austria and Norway were already flagged ambiguous from the Tier 1 Europe pass (the same closed International-Discovery-API situation), so no new research was needed there either.
- **Uganda reused, not newly checked**: Kenya's July 2024 Quicket acquisition was documented back in the Tier 1 Africa pass as covering "Kenya (among others)" — Uganda falls under that same acquisition, so Kampala inherits Kenya's confirmed status rather than needing its own lookup.
- **Unconfirmed, no evidence found**: Bolivia, Ethiopia, Laos, Bhutan — all four newly-checked countries this tier came back with no confirmed Ticketmaster or SeatGeek presence. Zero-for-four continues the Tier 4 pattern that off-the-beaten-path destinations skew toward countries with less-developed international ticketing infrastructure. All four included anyway — Uyuni's salt flat, Lalibela's rock churches, Luang Prabang's old town, and Paro's Tiger's Nest monastery are real, legitimate destinations regardless of ticketing-platform status.
- **CityPASS confirmed absent for all 17** (checked against the same 17-destination North-American-only list referenced at every earlier tier — no new destinations added to it since).
- **Fourteen of the seventeen cities dropped to a single seed entry** (Anchorage, Whitehorse, Uyuni, Ushuaia, Chiloé, Lalibela, Kampala, Yulara, Rotorua, Tórshavn, Hallstatt, Luang Prabang, Leh, Paro) — the most extreme thinning yet, matching the tier's explicit design as niche, one-thing-you-go-there-for destinations (a glacier, a salt flat, a monastery) rather than an arbitrary trim.

### Reach expansion findings (11 cities, post-tier-roadmap)

Two of eleven came back *more* confirmed than expected, and the Nordics turned out to be a case this project had already half-solved without realizing it:

- **Caribbean — the single biggest gap this project had.** San Juan and Punta Cana are both **genuinely confirmed** — real, current, dated venue/event listings on ticketmaster.com itself (Coliseo de Puerto Rico; Puntacana Resort & Club hosting a PGA Tour event) and, for San Juan, on seatgeek.com too. That's stronger evidence than most of this project's "confirmed" markets, which usually rest on a launch announcement rather than a live listing. Montego Bay and Nassau came back unconfirmed (no evidence either way) — included anyway, same treatment as Costa Rica/Cairo/Marrakech. CityPASS's real 17-destination list (rechecked, unchanged) still has zero Caribbean coverage.
- **Scandinavia — a correction, not just an addition.** Sweden, Denmark, and Finland were already named, back in the very first Tier 1 Europe pass, as historical International Discovery API markets (the same closed product behind Germany/Netherlands/Austria's ambiguity) — so this project already "knew" about them in a sense, just hadn't used that knowledge to add cities yet. Direct verification this round found real, current, dated 2026 listings at named venues on each country's own Ticketmaster domain (Strawberry Arena in Stockholm; Royal Arena and Parken in Copenhagen) — enough to upgrade all three from ambiguous to confirmed, the same "real launch + live listings" standard that upgraded Poland at Tier 4.
- **Switzerland — confirmed the same way**: a real 2016 launch (Ticketmaster Schweiz AG), a named MD as of 2024, a live ticketmaster.ch site with real event listings.
- **Israel — confirmed strongly**, on the same standard as South Africa/Kenya: a direct, named 2017 Live Nation launch (via Tel Aviv's Bluestone Entertainment) explicitly covering "the full country including both Tel Aviv and Jerusalem."
- **Jordan and Nepal — unconfirmed, no evidence found**, continuing the established pattern that off-the-beaten-path and single-standout-landmark destinations (Petra; Everest-region trekking) skew toward markets with local, not international, ticketing platforms (Jordan's eTathkara; Nepal's TicketChha and TicketSanjal both surfaced directly in research). Included anyway — same reasoning applied to every unconfirmed market in this project.
- **A CKAN platform got its first real adapter.** Boston, Toronto, and Vancouver had all been checked-and-rejected for "runs on CKAN, not Socrata" at Tier 1, without ever actually querying the API. Re-verification found Boston's "Special Event License Applications" dataset is genuinely live and forward-dated (8,357 rows since 2014, real filterable 2026-08+ public events via `datastore_search_sql`) — now a real bespoke adapter (`boston-events.ts`), the fourth city with one. Toronto's one plausible dataset turned out to point at a dead, access-denied backend link despite recent-looking metadata. Vancouver's open-data portal turned out to actually run OpenDataSoft, not CKAN — a second platform-misidentification catch in this project, after Melbourne — and has no qualifying events dataset regardless.

### Reach expansion findings, batch 2 (6 cities)

- **Gulf markets confirmed strongly.** Ticketmaster has run regional offices (Dubai, Abu Dhabi, Qatar, Saudi Arabia) since 2012, and Qatar has its own named 2014 launch press release ("Ticketmaster Expands Presence To 19 Countries With Launch Of Ticketmaster Qatar") — the same direct-launch evidentiary standard as Israel and South Africa, not a weaker "presence claimed" tier.
- **Uzbekistan — unconfirmed**, no evidence found. The local iTicket.uz platform dominates. Included anyway — Samarkand's Registan is too significant a Silk Road destination to skip for representation, same reasoning applied throughout this project.
- **Croatia came back a clean no**, same category as South Korea rather than merely unconfirmed: local platforms (Eventim.hr, ulaznice.hr) hold the market, no direct Ticketmaster Croatia operation found anywhere in research.
- **Hungary is thinner still** — only cross-border reach from Ticketmaster Austria's domain, and that reach is explicitly declining against local competitors (LiveNation.hu, TicketSwap Hungary) per third-party traffic-ranking data. Treated the same as Hong Kong/Malaysia's "parent-company presence only, not real direct operation" bucket.
- **French Polynesia — unconfirmed**, no evidence either way. Included anyway for the same reason as every other unconfirmed-but-essential destination in this project.
- **Currency research surfaced a real nuance worth flagging**: Croatia adopted the euro in 2023, so Dubrovnik's currency is EUR, not the Croatian kuna a stale mental model might assume — a small, concrete reminder that "what currency does this country use" isn't a fact that stays true indefinitely either.

### Reach expansion findings, batch 3 (15 cities)

- **Philippines confirmed strongly, and specifically for both cities added.** A real, current (2026) joint venture — "SM Ticketmaster," between Ticketmaster and Philippine developer SM Prime — with direct press coverage naming Manila (SM Mall of Asia Arena) and Cebu (the upcoming SM Seaside Cebu Arena) by name. Cebu was chosen as the flagship over Manila on the same "tourist concentration over capital-city default" logic used for Cancún over Mexico City and Nadi over Suva.
- **Malta confirmed** the same way Sweden/Denmark/Finland were: real, current event listings on ticketmaster.com itself ("Breaking Borders 2026") rather than a launch announcement.
- **Botswana confirmed — a correction to Tier 4, not just a new finding.** Tier 4 named Ticketmaster's July 2024 Quicket acquisition as covering "Nigeria, Uganda, Kenya, Zambia" without checking the acquisition's own announcement closely enough — it names Botswana too. Caught this round while researching Maun; worth recording as a reminder that "confirmed for A, B, C" claims are worth re-reading in full, not just skimmed for the country currently being checked.
- **Everything else in this batch came back unconfirmed**, no evidence either way: Uruguay (notably absent from Ticketmaster's own named Latin America expansion list — Mexico, Chile, Argentina, Brazil, Colombia, not Uruguay), Barbados (a real local platform, TicketLinkz, with no sign of Ticketmaster), Aruba, the Maldives, Oman, Tunisia, Mauritius, Seychelles, Mongolia, Kazakhstan, Romania, and Serbia. All eleven included anyway, same standard applied to every unconfirmed-but-legitimate destination throughout this project — a local ticketing platform's dominance says nothing about whether Malé or Ulaanbaatar are real, worthwhile places to visit.
- **Social media platforms (X, Instagram/Facebook, Snapchat, YouTube, Reddit, TikTok) were separately researched as a possible new data-source category and rejected** — not for cost, but because none of them return structured place/event data the way every real adapter in this app does; extracting one would require an NLP/AI pipeline this app has never had. Two real, structured alternatives were found instead and are worth knowing about even though neither is built: **Foursquare Places API** (a genuinely strong free tier — 500 free calls/month plus $200/month in new-account credit, comparable to or better than Google Places') and **Yelp Fusion API** (real structured business data, but its free tier has ended — now $7.99–$14.99 per 1,000 calls). Full detail, including why Eventbrite and Meetup were also checked and rejected, is in the "Open Items" reference doc rather than repeated here.

## How many cities per country/continent

There's no fixed target — it tracks two things worth checking per country rather than a headcount:

- **Coverage reality first.** A country only earns a second or third city once its data sources (ticketing platforms, city passes, open data) genuinely extend past one hub. A second city in a market the data doesn't reach is a thinner duplicate, not real coverage.
- **Tourist concentration, not equal spread.** Most countries have one or two cities that account for the overwhelming share of visitor demand.

In practice: **one flagship city by default**, **2-3 for a country with genuinely distinct major markets**, and 5+ reserved for something the size of the US (7 cities, each a legitimately separate tourist/event market — not padding).

## Two ways into the app: decided vs. undecided travelers

Most users already know where and when they're going — that's the whole app as built (Setup → Discover → Itinerary → Checklist). But some don't know where or when yet, and that's a genuinely different job: a *destination recommender*, not an in-city discovery tool.

**Built, following the two constraints set out when this was scoped:**

- **No fabricated destination-comparison metrics.** There is no numeric "crowd score" or "density index" anywhere in the recommender. Every result shows a real count — "N of M ingested places are tagged X" — computed live from what's actually in the database, not a precomputed or invented number.
- **Vibe-matching comes from data already collected, honestly.** `backend/src/services/destinationRecommender.service.ts` runs one grouped Prisma query (`Place.groupBy` on city + category) and ranks cities by what fraction of their real ingested places match the requested vibe. There are five vibes, each mapped 1:1 to a real category already used everywhere else in the app (History & Culture → `sightseeing-culture`, Outdoor & Adventure → `outdoor-nature`, Nightlife & Entertainment → `arts-entertainment-nightlife`, Food-Focused → `food-dining`, Relaxation & Wellness → `wellness-relaxation`) — deliberately not a richer taxonomy, so every option is guaranteed to correspond to something real. A city with nothing ingested for a vibe (or at all) is left out of results entirely rather than shown with a zero score.
- **Budget tier and best season are curated, checked fields — not a live integration.** `backend/src/config/travelProfile.ts` has one real, considered entry per city (hemisphere-aware season, relative cost tier), same discipline as `seed.ts`'s landmark data — general travel-guide-level knowledge, not a fabricated metric or an assumed API. A test (`travelProfile.test.ts`) enforces every city in the registry has an explicit entry, so a newly added city can't silently fall back to a generic default without someone deciding to add it.

**How it's surfaced:** a single "Not sure yet? Find a destination →" link on the Setup screen (`FindDestinationPanel.tsx`) — collapsed by default, exactly the "thin front-door" shape decided on originally. Picking a vibe and/or budget tier shows ranked real matches; picking one sets the destination and closes the panel, dropping straight back into the same Setup flow with that city pre-filled. No second product, no separate tab.

`GET /api/recommend-destination?vibe=&budget=` and `GET /api/recommend-destination/vibes` are the two endpoints; both are covered by `destinationRecommender.service.test.ts` (ranking, vibe-exclusion, budget-filtering, and the "nothing ingested → no result" case) and were smoke-tested live against the real database.

## Going international — Tier 1 findings

Every new region is a fresh verification pass, not a continuation of the last one's assumptions — worth recording exactly what held up and what didn't each time, rather than assuming coverage carries over. (Tier 2's findings, lighter-weight per its explicit scope, are summarized in "The tier system" above rather than repeated at this depth.)

**North America (Canada, Mexico):**
- **Ticketmaster's standard Discovery API** (what this app uses — not the separate "International Discovery API" product) genuinely covers the US, Canada, and Mexico. No adapter code changes needed — same adapter, different `ticketmasterMarket` string.
- **SeatGeek** is US/Canada-primary with only partial event coverage in Mexico — expect thinner or empty results there; that's honest degradation, not a bug.
- **CityPASS covers Toronto but not Vancouver or Mexico City** (verified against their actual destination list) — only Toronto has a city-pass seed entry.
- **No municipal open-data adapter for any of the three** — Toronto/Vancouver run CKAN (not Socrata), and Mexico City's portal didn't surface a clear events dataset.

**South America (Brazil, Argentina, Peru, Chile, Colombia) + Central America (Costa Rica):**
- **Ticketmaster's Latin America expansion is real and confirmed per country** — Brazil, Peru, Chile, and Argentina were named directly in Ticketmaster's own announcements; Colombia was confirmed separately via its 2026 market-launch press release (they opened a Bogotá HQ). Added `countryCode` to the Ticketmaster adapter's query params as a direct result of this batch — without it, "San Jose" (Costa Rica) would silently collide with San Jose, CA.
- **No confirmed Ticketmaster (or SeatGeek) market operation in Costa Rica** — only international-tournament ticket sales involving Costa Rican teams surfaced, not a local ticketing business. Added anyway, on seed data only, because representation was explicitly requested and Costa Rica is the region's dominant tourist market.
- **Buenos Aires' "permisos-eventos-masivos" dataset looked promising and turned out not to be** — a static one-off 2023 XLSX export, not a live queryable API. A distinct rejection reason from "wrong platform" or "historical cutoff" — worth telling these apart rather than lumping every rejection into one bucket.

**Africa (South Africa, Kenya, Egypt, Morocco):**
- **Ticketmaster launched directly in South Africa in 2022**, then expanded into Kenya (among others) via its July 2024 Quicket acquisition — both confirmed, citable, no code changes needed.
- **Egypt and Morocco have no confirmed Ticketmaster or SeatGeek presence at all.** Added Cairo and Marrakech anyway, seed-only, for the same reason as Costa Rica — too significant to skip for regional representation, but honestly flagged as unconfirmed rather than presented the same as Cape Town/Nairobi.
- **CityPASS has no African destinations at all** (checked, not assumed) — none of the four have a city-pass entry.
- **Two seed entries (the Pyramids and the Egyptian Museum) intentionally omit a booking link** rather than guess at an official ticketing domain I wasn't confident about — same standard as everywhere else: no citation, no claim.

**Australia:**
- **Ticketmaster has operated here since 1995**, with local offices in Melbourne, Sydney, Brisbane, Perth, and Adelaide. **SeatGeek also directly confirmed operating in both Sydney and Melbourne** — the strongest non-US/Canada SeatGeek coverage found anywhere in this rollout.
- **A search-result claim turned out wrong on direct verification.** Search snippets described Melbourne's open-data portal as Socrata; hitting the actual API endpoint returned an OpenDataSoft error page instead — a different platform entirely. No bespoke adapter built, same as every CKAN city, but the specific lesson here is narrower: a confident-sounding search result about *which platform* something runs on still needs to be checked against the real endpoint, not just cited.
- **CityPASS doesn't cover Australia** — what exists under a similar name is a different, unrelated "Australia Multi-City Attractions Pass" product. No structured-tier entry for either city.

**Europe (UK, France, Italy, Spain, Netherlands, Germany):**
- **Ticketmaster's coverage here is genuinely ambiguous — the first region where this wasn't cleanly resolvable.** A separate "International Discovery API" product (different endpoint: `app.ticketmaster.eu`) historically covered continental markets like Germany, Spain, and the Netherlands. It's now closed to new API key requests, and Ticketmaster's own docs redirect new integrations to the standard Discovery API this app already uses — but whether that standard endpoint has since absorbed continental coverage isn't confirmed by documentation, and can't be resolved without a live key to test against. **UK is the clean exception** — cleanly confirmed on the standard API, same as every English-speaking market so far.
- **SeatGeek**: confirmed real UK presence (ticketing partner for multiple Premier League clubs); unconfirmed for the five continental markets.
- **Paris got a real bespoke adapter — the first non-Socrata, non-CKAN platform integrated (OpenDataSoft).** Its "Que faire à Paris" dataset is genuinely excellent: live, dated years into the future, real geo-coordinates, well-maintained. Pulled 15 real events on first ingest (jazz sessions, open-air cinema, a sky-watching evening) — the strongest live-data result of any city in this rollout besides NYC/Chicago.
- **Paris is also the first city with non-English ingested content.** The live event names/descriptions are in French, surfacing the language gap for real rather than as a hypothetical caveat — nothing translates it, by design (no i18n exists anywhere in this app).
- **CityPASS doesn't cover any of the six** (confirmed against their full destination list, not assumed) — no structured-tier entries anywhere in this batch.
- **Two Rome seed entries (the Colosseum) intentionally omit a booking link** — Italy's heritage-site ticketing has moved across several official portals over the years and I wasn't confident which one is current, so no link rather than a guess.

**Asia + UAE (Japan, South Korea, Singapore, Thailand, Taiwan, UAE) — the last queued region, and the first where coverage split three distinct ways instead of two:**
- **Confirmed real expansion**: Singapore and Taiwan (2020 launches) and Thailand (2022 acquisition of Thai Ticket Major) — genuine Ticketmaster Southeast Asia presence, same confidence level as South Africa/Kenya/Australia.
- **Confirmed *not* covered**: South Korea. Interpark, Ticketlink, and Yes24 are the real primary ticketers there — unlike Costa Rica/Cairo/Marrakech (merely unconfirmed), this one came back a clean no. Seoul included anyway, seed-only, for representation.
- **Ambiguous, same as continental Europe**: Dubai/UAE. Ticketmaster Middle East has run since 2012 (`ticketmaster.ae`), but UAE was explicitly named as an *International Discovery API* market — the same now-closed product that made Germany/Spain/Netherlands unresolvable. Whether its inventory reaches the standard endpoint this app calls is genuinely unknown, not assumed either way.
- **Tokyo has no confirmed consumer Ticketmaster operation at all** — only a narrow partnership with Japan's own PIA ticketing provider for specific events (the 2025 World Athletics Championships). Included anyway for essential representation, same treatment as Cairo/Marrakech.
- **Singapore's government open data is extensive, but its tourism-specific access point (Tourism Info Hub) requires its own API key signup** — treated the same as Ticketmaster/SeatGeek/Google Places (a real source to enable later with a key), not built as a zero-config adapter now. No free public events dataset surfaced for any of the six cities.
- **CityPASS covers none of these six** (checked, not assumed).

**Not addressed anywhere yet:** language (everything except the live Paris feed is English-only — no i18n exists in the app at all) — the further this goes from English-speaking markets, the more this shows. Currency now has real structure behind it (see "What's real vs. stubbed" — `Place.priceAmount`), though most individual prices remain honestly unverified rather than guessed.

This is the boundary of what "restructure once, expand cheaply" actually bought: city config + generic adapters scaled to six regions and 34 Tier 1 cities with almost zero code changes (the two real ones: `countryCode` on the Ticketmaster adapter, and a second adapter platform for Paris), but the verification work — what's covered, what's real, what would be a fabricated claim — had to be redone every single time, exactly as predicted before this started. Two regions (Europe, then Asia) hit genuine dead ends (Ticketmaster's continental-Europe and UAE ambiguity) rather than a clean yes/no, and Asia additionally produced the first confirmed-absent market (South Korea) rather than merely unconfirmed ones.

**All six continents are represented at Tiers 1 through 5, plus four reach-expansion batches closing specific post-roadmap gaps — 159 cities total.** The fourth batch (Madrid, Milan, Athens, Munich, Warsaw, Brussels, Geneva, Marseille, Seville, Valencia, Osaka, Macau, Antalya, Phuket, Casablanca) was added once the overpass adapter removed the free-tier city-count ceiling that previously bounded growth — see "What's real vs. stubbed." Remaining gaps (Pakistan/Bangladesh in South Asia; the Balkans beyond Slovenia/Croatia/Serbia; most of the Pacific beyond Fiji/French Polynesia; the Gulf beyond UAE/Saudi Arabia/Qatar/Oman) would need a fresh instruction on where to take the city list next.

## Adapter model

Every city gets the same **default adapters** (`seed`, `google-places`, `ticketmaster`, `seatgeek`) — each is already parameterized by city name (and `countryCode` for Ticketmaster), so no bespoke code is needed to add a city. A **municipal open-data adapter** (`extraAdapters` on a `CityConfig`) is an opt-in bonus for cities that happen to have a genuinely useful, forward-looking public events dataset — most won't, and that's expected, not a gap.

Four cities have one: NYC and Chicago (Socrata), Paris (OpenDataSoft), and now Boston (CKAN — see "Reach expansion findings" above for how this one was found after being wrongly written off at Tier 1). Every other city was checked for a candidate and rejected on the evidence, which is worth recording rather than glossing over:
- **San Francisco**'s closest dataset ("Temporary Street Closures") turned out to be utility/construction permits, not public events.
- **Seattle**'s "Special Events Permits" dataset stops at October 2025 — historical only, nothing forward-looking to ingest.
- **Toronto** runs CKAN like Boston does, and looked equally promising on paper — but its one plausible dataset ("festivals-events") points at a dead, access-denied legacy backend link despite recent-looking catalog metadata. A platform being "the same as a city that worked" doesn't mean the specific dataset does.
- **Vancouver** was previously assumed to run CKAN like Toronto; direct verification found it actually runs OpenDataSoft (the same platform Paris and, separately, Melbourne turned out to run) — and has no qualifying events dataset on that platform either.
- **Melbourne** looked like Socrata per search results but is actually OpenDataSoft on direct verification — Melbourne's own catalog search didn't surface a usable dataset the way Paris's did.
- **Buenos Aires**' events dataset is a static annual file export, not a live API.
- **Los Angeles, Washington DC, Mexico City, Cape Town, Nairobi, Cairo, Marrakech, Sydney, London, Rome, Barcelona, Amsterdam, Berlin, Tokyo, Seoul, Singapore, Bangkok, Taipei, and Dubai** had no clearly matching dataset surfaced in research (or, for Singapore, one that exists but requires its own API key — a future "real key" source, not a zero-config adapter).
- **All 18 Tier 2, 22 Tier 3, 21 Tier 4, 17 Tier 5, and 32 reach-expansion cities (all three batches)**, per those batches' lighter-research scope — no open-data-portal check was performed for any of them (see "The tier system" and "Reach expansion findings").

This is the real-world version of the "not every city needs a bespoke adapter" argument — 155 of 159 cities run on the generic adapters alone and are no worse off for it. It's also a live demonstration that "checked and rejected" needs an expiry date: Boston sat in the rejected column for the entire Tier 1–5 rollout on a one-line "runs on CKAN" note, and the real dataset was there the whole time.

## What's real vs. stubbed

- **Seed data** per city — always loads, no keys needed, and is where the verified/aging/stale confidence bands are demonstrated live. Every landmark, address, and coordinate is a real, checked fact; every "structured" (city-pass) entry only exists for cities CityPASS actually covers (verified — none of the Tier 2-5 or reach-expansion cities are covered either, so none of them have one). Tier 2+ entries are intentionally leaner than Tier 1's — but **every city in the registry now has at least 2 seed landmarks**: a follow-up pass went back through the 28 cities left at a single entry after the tier rollout (mostly Tier 4/5) and added a second, real, checked landmark to each, often diversifying into a category (food-dining, shopping, wellness-relaxation, arts-entertainment-nightlife) the city didn't have any seed data in yet — both because a one-place city reads as broken in Discover, and because the destination recommender's vibe-matching needs more than one category tagged per city to produce a meaningful signal. 281 seed records total, up from 253.
- **NYC Open Data permitted events**, **Chicago Park District event permits**, **Paris's "Que faire à Paris" events**, and **Boston's "Special Event License Applications"** — all real, live, no API key required. The Chicago adapter groups a multi-day, multi-venue festival (e.g. Lollapalooza) into one record rather than one per facility/day — the raw dataset is a facility-booking table, not an events table, so this grouping matters. Boston's is queried live via CKAN's `datastore_search_sql`, filtered to `Status = 'Open'` and a future start date. Paris's feed is in French — the only non-English ingested content anywhere in the app.
- **Ticketmaster / SeatGeek** — real adapters, self-serve free keys, not yet enabled, and now wrapped in retry-with-backoff (see below). Add `TICKETMASTER_API_KEY` / `SEATGEEK_CLIENT_ID` to `backend/.env` and re-run `npm run ingest` for any city — all one hundred forty-four pick them up automatically since they're default adapters, though expect near-zero SeatGeek results outside the US/Canada/South Africa/Australia/UK, and genuinely unknown or unconfirmed Ticketmaster results for the markets still flagged ambiguous/unconfirmed throughout this document (continental Europe, Dubai, Hong Kong, Kuala Lumpur, Lisbon, Mumbai, Ecuador, Guatemala, Tanzania, Fiji, Iceland, Indonesia, Vietnam, China, Slovenia, Georgia, Rwanda, Namibia, Belize, Cambodia, Sri Lanka, Bolivia, Ethiopia, Laos, Bhutan, Jordan, Nepal, Uzbekistan, Croatia, Hungary, French Polynesia, Uruguay, Barbados, Aruba, Maldives, Oman, Tunisia, Mauritius, Seychelles, Mongolia, Kazakhstan, Romania, and Serbia). Vienna, Sweden, Denmark, Finland, Switzerland, Saudi Arabia, Qatar, the Philippines, Malta, and Botswana have since been upgraded out of that list — see "Reach expansion findings."
- **Google Places** — real call structure, metered/paid, real key live in production. **Not a universal default anymore** — `adapters/index.ts`'s `adaptersForCity()` only includes it for `priorityTier` cities (~53 of 159), now that overpass provides free baseline coverage for everyone else. Has a real, persisted spend guard, not just a key gate: `lib/rateLimiter.ts` checks a per-day call count *before* every call and skips it once `GOOGLE_PLACES_MAX_CALLS_PER_DAY` (166 — the real free-tier ceiling, not a placeholder) is reached. Counted via a small `ApiCallBudget` table (one row per adapter per day) so the count survives a restart, datastore-agnostic (a plain upsert-and-count).
- **OpenStreetMap (via the Overpass API)** — real, live, no API key, no metered budget, and the reason city-count isn't capped by Google Places' free-tier ceiling anymore. `adapters/overpass.ts` queries eight real OSM tags within an 8km radius of each city's real coordinates (`CityConfig.lat/lng`, geocoded live against Nominatim — not asserted from memory), mapped to this app's own category taxonomy instead of one flat bucket: `tourism=attraction/museum/viewpoint` and `historic=monument/memorial` → sightseeing-culture, `leisure=park` → outdoor-nature, `amenity=theatre` → arts-entertainment-nightlife, `amenity=marketplace` → shopping. Each tag gets its own per-tag result cap (`out body 3` per clause, not one combined cap) — verified live that a single combined cap after a union query returns results grouped by clause, so a common tag (theatres) would silently crowd out a rarer one (markets) before the cap was ever reached. Verified viable before building: ODbL permits commercial use with attribution (a footer credit lives in `App.tsx`), and the public instance's documented safe threshold (10,000 queries/day) has enormous headroom versus this app's actual usage. **A real operational lesson from building it**: it needs an identifying `User-Agent` header the same way Nominatim does — omitting it, combined with `warmPriorityCities` initially firing requests for 44 cities without bounding real concurrency, got requests from this app's IP actively rejected (406s) by the shared public instance during testing; fixed by adding the header and rewriting `warmPriorityCities` to run strictly sequentially. Data quality is real but more variable than Google Places' curated set (crowdsourced OSM tagging) — filtered to entries with an actual name, and price fields (`fee`/`charge`) are deliberately never parsed since they're free text, not a structured number.
- **CityPASS / Go City / OpenTable / Resy / Tripadvisor** — no public data API exists (or requires partner approval per the API research). Currently represented as seed data or a plain outbound link; upgrading these needs a direct partnership, not just a key.
- **Local transit** — a straight-line-distance heuristic (`services/transit.ts`), not real routing. Fine for demoing the itinerary's transit connectors; a real version needs a routing engine.
- **Datastore** — SQLite for zero-setup local dev. The architecture doc recommends Postgres for production — genuinely needed for concurrent write throughput and a real managed-hosting story at more than a handful of simultaneous users, neither of which SQLite is built for. **PostGIS specifically is not actually needed for anything this app currently does**, which is worth correcting rather than repeating: transit-time estimates between itinerary stops (`services/transit.ts`) are a plain two-point Haversine calculation in application code — no database query, spatial index, or PostGIS extension involved, and it produces identical results on SQLite or Postgres today. PostGIS would earn its place if the app added a genuinely different capability it doesn't have — a database-level "find places within N km" query — not for what it already does. Migrating to a hosted Postgres is still blocked on choosing and paying for a provider (Neon, Supabase, etc.), which needs your account and a real decision, not something to pick unprompted.
- **Ingestion is demand-driven, not scheduled.** There is no background scheduler proactively refreshing the whole city registry on a timer anymore — that was found to be spending metered API budget (Google Places specifically) uniformly across every registered city regardless of whether anyone had ever actually looked at most of them. Instead, `ensureCityFresh()` (`services/ingestion.service.ts`) runs on the read path — `GET /api/places?city=X` checks each relevant adapter's last-success time against its tier's real decay window (`config/adapterCadence.ts`: static/seed never re-runs after its first success, `google-places` at 24h, `ticketmaster`/`seatgeek`/open-data at 1h) and only re-fetches whichever adapters are actually stale for that specific city, before serving from the database. A per-city in-memory lock collapses concurrent requests for the same never-before-seen city into a single real ingest rather than firing duplicate live calls. A small, deliberate exception: `warmPriorityCities()` pre-warms the ~53 cities tagged `priorityTier` (verified major tourism hubs, see `config/cities.ts`) once at server startup, so the first real visitor to Paris or NYC isn't the one paying the cold-start latency — everything else is fetched purely on demand. Each adapter outcome is still `{ count, ok, error? }` rather than a bare number, so a dead API and a genuinely quiet market don't look identical in the logs.
- **Cross-source duplicate places — a real, checked guard, not just a hope.** Once google-places and overpass both run for the same priority-tier city, the same real landmark can surface from both — confirmed live in Brussels ("Manneken Pis" from both sources, 1m apart). `lib/dedup.ts`'s `isLikelyDuplicate()` (close distance *and* matching/overlapping name, conservative on purpose — a missed duplicate just shows an extra card, a false positive would silently drop a real place) is checked for every overpass record against everything already stored for that city before upsert; a match is skipped, not stored twice. Verified live: found and removed the real pre-existing Brussels duplicate, then re-ran overpass ingestion for that city and confirmed it correctly skipped recreating it while still inserting 12 other genuinely distinct records.
- **Retry/backoff on every live HTTP call** — `lib/httpRetry.ts` wraps all seven adapters that call a real external API (Ticketmaster, SeatGeek, Google Places, NYC/Chicago/Paris/Boston open data) with a bounded retry: up to 3 attempts, exponential backoff with jitter, and `Retry-After` support for 429s. Previously a single transient rate-limit or 500 killed the whole adapter run for that city; now it has two more chances to recover first. Non-retryable failures (a real 404, a genuine success) still return on the first attempt — no wasted retries on failures that can't resolve.
- **Adapter health tracking — the "silent error trap" now has a real fix, not just detection.** A new `AdapterHealth` table (one row per city+adapter) records `lastAttemptAt`, `lastSuccessAt`, `lastError`, and `consecutiveFailures` on every ingest, success or failure (`ingestion.service.ts`). `GET /api/city-health?city=X` exposes it, and the Discover screen shows a real "event data may be temporarily outdated" banner naming the specific degraded adapter when `consecutiveFailures > 0` — without hiding or suppressing the rest of that city's still-good data. This is the concrete difference between a dead Ticketmaster call and a market that genuinely has zero events this week, surfaced to the user rather than just logged.
- **City-market collisions** — a real, automated guard now exists (`lib/collisions.ts`, `scripts/checkCollisions.ts`, `npm run check:collisions`, and enforced in the test suite) rather than the single one-off `countryCode` patch that fixed the original San José/San Jose collision. It checks every city's resolved Ticketmaster/SeatGeek market string, case-insensitively, and fails loudly if two collide — catching the next "Valencia" or "Santiago" before it ships instead of after.
- **Accounts** — optional. A trip can be planned and shared via its `/trip/:id` URL with no login; logging in (email + password) only attaches trips to a "My Trips" list for cross-device access. **Password reset and account deletion are both real now** (`POST /api/auth/reset-request` / `reset-confirm`, `DELETE /api/auth/me`) — the reset token is single-use, expires in an hour, and is stored as a SHA-256 hash rather than the raw token (`lib/resetToken.ts`); deletion removes only the account's identifying data (email, password hash) and leaves owned trips intact as ordinary anonymous trips via the schema's `onDelete: SetNull`, rather than destroying someone's actual travel plans as a side effect of removing their login. **What's still not real**: reset emails aren't actually delivered — `lib/email.ts` has the real call structure but no transactional email provider is configured (same "off by default until a real key exists" pattern as Google Places), so in dev the email is logged to the console instead of sent. `AccountPanel.tsx` has working UI for both flows.
- **Stale-data retention** — anonymous trips (no account attached) untouched for 90+ days are deleted by `services/retention.service.ts`, run via `npm run sweep:stale-trips`. "Untouched" is tracked precisely: adding, moving, or removing an itinerary item, or toggling a checklist entry, all bump `Trip.updatedAt` via a `touchTrip()` call (`trips.service.ts`, `checklist.service.ts`) — a trip's creation date alone isn't used, so someone actively planning a 91-day-old trip won't have it swept out from under them. **Caught by smoke-testing against the real database, not by the unit tests**: Prisma silently turns an empty `update({ data: {} })` into a plain `SELECT` with no `UPDATE` at all, so the first version of `touchTrip()` never actually bumped anything — fixed by setting `updatedAt` explicitly rather than relying on `@updatedAt`'s auto-bump on a no-op write. The same script also sweeps expired or already-used `PasswordResetToken` rows, which previously had no cleanup path at all and would have accumulated forever. **Now on a real automatic schedule** — `.github/workflows/retention-sweep.yml` runs it daily via GitHub Actions (`workflow_dispatch` also available for a manual trigger), reading `DATABASE_URL` from a repo secret pointed at the same production Neon database Render uses.
- **Reset-token logging is production-safe.** The dev-mode fallback in `lib/email.ts` (used when no `EMAIL_WEBHOOK_URL` is set) logs the full email — including the raw reset token — to the console, which is fine for local development but would be a real account-takeover vector if it ever fired in a production deploy pointed at a log aggregator (Datadog, CloudWatch, etc.). It now checks `NODE_ENV`: in production, a missing email provider throws instead of silently logging the secret, so a misconfiguration fails loudly rather than quietly leaking tokens.
- **Offline/PWA support** — real, in production builds only (`npm run build`, service worker registration is gated behind `import.meta.env.PROD` so `npm run dev` / HMR is untouched). The checklist's "Save this itinerary for offline access" item does something real now: a "Save now" button that prefetches the trip, itinerary, checklist, and city's places into the cache. **Not verified in a live browser** — this environment has no browser to test in.
- **Currency and timezone** — real now, not stubbed: every city resolves to a real ISO 4217 currency and IANA timezone (`config/localization.ts`, country-level defaults plus per-city overrides for multi-timezone countries — US, Canada, Mexico, Australia, plus a few individual cities like Salvador and Ubud whose country default would be wrong for that one city). `/api/cities` exposes both; the itinerary's day labels render in the destination's own timezone instead of the visitor's browser timezone (fixing a real date-shift bug for any city outside the visitor's own zone), and the app header shows the trip's local currency code. **Language** is still entirely unaddressed — everything except the live Paris feed is English-only, no i18n exists in the app.
- **Structured pricing — real now, honestly incomplete.** `Place.priceAmount` (nullable) replaces "informal text is the only record of price": `null` means not verified, `0` means confirmed free, `>0` is a real sourced number — never a guessed one. Of the 293 seed entries, 113 were already explicitly marked "Free" in their description and are now `0`; the 2 that already stated a real number (MoMA, The Met — both $30) carry it; the other ~178 stay `null` rather than an invented figure — filling those in would mean researching ~178 individually current prices that (unlike most facts this project verifies, e.g. "does Ticketmaster operate in Kenya") decay on a real timescale, not a one-time check; declined for now rather than approximated. **Ticketmaster and SeatGeek both already return real price data their adapters were previously discarding** (`priceRanges[0].min` and `stats.lowest_price` respectively) — now extracted, so live events carry real, sourced prices the moment real keys are added, with no backfilling involved. `PlaceCard` renders "Free" at 0, a formatted amount in the city's currency at >0 (via `getCurrency()` — there is no `currency` column on `Place`; it's derived from `CityConfig`, never duplicated, so the data can't contradict itself), and nothing at all when `null`, identical to the pre-existing UI.
- **Exchange-rate sync and home currency — both real now.** `lib/exchangeRates.ts` has a dedicated exchangerate-api.com integration (real key, live), a per-pair-per-UTC-day cache (`ExchangeRateCache`) so a connected provider gets at most one live call per pair per day, and an honest `null` — never a guessed rate — when a pair has no real rate. **The product decision this was blocked on is resolved**: home currency is a per-trip field (`Trip.homeCurrency`, nullable), not an account setting or locale guess — set once at creation (`SetupScreen`'s currency picker, defaulting to USD) alongside the destination and dates, working identically for anonymous and logged-in trips since accounts are optional throughout this app. `DiscoverScreen` fetches one real rate per city/home-currency pair (not one per place) and `PlaceCard` shows a converted estimate — `$30 (≈ CA$41)` — next to the native price, only when a real rate actually exists for that pair; never a fabricated conversion. Verified live against the real database and the real exchangerate-api.com API: created a trip with `homeCurrency: "CAD"`, confirmed it persisted and round-tripped, confirmed a live USD→CAD rate (1.4018 at verification time).
- **Destination recommender for undecided travelers** — built, not just designed. `GET /api/recommend-destination` ranks cities by real ingested category data against one of five vibes; `config/travelProfile.ts` adds a curated budget tier and best season per city. Surfaced as a collapsed "Not sure yet? Find a destination →" panel on Setup. See "Two ways into the app" above for the full detail.
- **Multi-city trips and share-link permissions — both real now.** A trip can have additional `TripLeg`s beyond its primary city ("Paris then Rome"), added via SetupScreen's "+ Add another city." Which leg a new item belongs to is inferred server-side from the place's own city matched against the trip's legs — the frontend never tracks "which city am I adding to" as separate state. **A real security gap closed at the same time**: previously, anyone with a `/trip/:id` link could edit or delete an anonymous trip, no check at all. `Trip.editToken` (a second, separate token, returned once at creation and never again — `GET /trips/:id` deliberately excludes it) now gates every mutation; the plain view link is view-only. Verified live: the one real pre-existing trip in the database predates this field and was safely backfilled with a real generated token during migration, not broken. **A real correctness issue caught before shipping, not after**: the itinerary's displayed day number is a clean global sequence across all cities, but each `TripItem.dayIndex` is stored leg-relative (matching how it was always computed) — conflating the two would have let the "move to a different day" control silently corrupt an item's stored day for any multi-city trip. `moveTripItem` validates the target against the item's own leg's real date range now, and `ItineraryScreen`'s day-picker shows real calendar dates instead of ambiguous day numbers specifically to avoid this. Also fixed a latent single-city-only assumption in the existing timezone-correctness code: day labels now resolve each stop's own city's timezone rather than one city for the whole screen.
- **Automated tests, backend and frontend both** — backend: `vitest`, `npm test`, 145 tests across 24 files, now also covering the demand-driven `ensureCityFresh` gate, `adaptersForCity`'s priority-tier scoping (including the resolved-city → overpass-only restriction), the overpass adapter's per-tag category mapping, the cross-source duplicate guard, trip edit-permission checks, multi-city itinerary grouping/validation, and city resolution (Nominatim's real User-Agent and ~1req/s throttle, settlement-level filtering, curated-vs-cached-vs-live search precedence, the alias-matching fix for local-name mismatches, `resolveCity`/`listAllCities`) (confidence-decay engine, ingestion incl. failure-vs-empty distinction, adapter-health recording, and priceAmount survival through upsert, Chicago festival grouping, market-collision guard checked live against all 159 real cities, travel-profile coverage, destination-recommender ranking/filtering, retry/backoff behavior, password-reset token generation/consumption, account deletion, stale-trip and reset-token retention sweeps, production-safe email logging, Google Places spend-guard behavior, real price extraction in the Ticketmaster/SeatGeek adapters, exchange-rate cache/fallback behavior). Frontend: `vitest` + React Testing Library, 51 tests across 9 files, now also covering the language toggle (defaults to English, switches real rendered UI text to Spanish, persists the choice) and a translation-completeness check that fails the build if the English and Spanish key sets ever diverge (`i18n/resources.test.ts`), `CitySearchPanel` (collapsed-by-default, debounced search, curated-vs-community result marking, real empty state) and SetupScreen's resolved-city pick-and-submit flow, the auto-fill starter itinerary's selection logic (`autoFill.test.ts`: category diversification, verified-over-stale preference, exclusion of already-added places, honest under-fill when there simply aren't enough real candidates) and the auto-fill button's real click-through behavior in `ItineraryScreen`, DiscoverScreen's search/filter and city-switcher behavior, the footer's conditional support link, and SetupScreen's multi-city leg picker (ItineraryScreen's timezone-correct day labels, including a regression test for the exact date-shift bug the original single-city fix resolved and a second one for the multi-city version of the same bug, FindDestinationPanel's collapsed-by-default and real-vibe-list behavior, DiscoverScreen's degraded-data banner, price rendering across free/priced/unverified states, and converted-price display, AccountPanel's forgot-password flow and two-click account-deletion confirmation). There was no test suite at all — backend or frontend — before this pass; every prior claim of "verified" or "smoke-tested" in this document came from one-off manual `curl`/ingest runs, not a repeatable check.
- **CI** — `.github/workflows/ci.yml` runs both test suites (plus typecheck, collision-check, and frontend build) on push/PR, live against the real GitHub repo. **A real bug caught while adding the retention-sweep workflow**: it was only configured to trigger on a `main` branch, but this repo's actual default branch has been `master` since `git init` — meaning it silently never ran on a single push this session until fixed. `.github/workflows/retention-sweep.yml` runs the stale-trip/token cleanup daily.
- **Search/filter in Discover** — client-side, filters the already-fetched, already-category-filtered place list by name/description match. A distinct empty state ("nothing matches your current filters") when a search legitimately matches zero places, separate from the pre-existing "nothing ingested yet" message — the two are different situations and were collapsing into one message before this.
- **Auto-fill a starter itinerary** — a direct response to how real competitors (Wanderlog, TripIt, Roadtrippers, the AI-planner entrants) actually solve decision paralysis: generate a default itinerary first rather than presenting an even longer list of choices. `ItineraryScreen`'s empty state now offers "Or auto-fill a starter itinerary →" alongside the existing "add from Discover" path — never instead of it. Selection (`frontend/src/autoFill.ts`) is a plain, explainable function, not an "AI" black box: round-robin diversify across categories so a starter set isn't accidentally all museums, preferring verified/fresher entries within each category, using the exact same confidence data already shown on every place card. Target count is 3 real places per real day of the trip (floor of 3, cap of 15). No new backend endpoint — `useAutoFillItinerary` (`frontend/src/hooks.ts`) sequentially calls the same permission-checked, leg-aware `addItem` the manual "Add to trip" button already uses, once per place per city in the trip, so multi-city trips get a starter set per leg with no separate logic to duplicate or drift from the manual path.
- **Any real place, not just the curated ~159 — resolved on demand, free.** `GET /api/cities/search` checks the curated registry, then previously-resolved cities, and only falls through to a live OpenStreetMap Nominatim geocode when neither already has a match — so the same real place is only ever geocoded once, cached permanently in a new `ResolvedCity` table (`services/cityResolution.service.ts`). Timezone comes from `geo-tz` (lat/lon → real IANA zone, fully offline, no API call); currency reuses the existing country table. A resolved city is scoped to `overpass` only in `adaptersForCity` — no seed data exists for it and Ticketmaster/SeatGeek need a hand-verified market string, so guessing one risks matching the wrong real market; honest degradation over a wrong result. SetupScreen's destination and per-leg pickers each gained a collapsed-by-default "Search any place →" panel (`CitySearchPanel.tsx`) alongside the existing curated dropdown — picking a result works immediately even before the bulk `/api/cities` cache would otherwise know about it. **A real bug caught live, not in a mock**: Nominatim returns a place's local name, not necessarily what was searched for (searching "Bruges" resolves and caches a row literally named "Brugge, Belgium") — a second search for the same English spelling was silently losing that cached result because the lookup only matched against the stored name. Fixed by caching every raw query as a lowercased alias (`ResolvedCity.aliases`) and matching against both; verified live end-to-end afterward — search, cache, ingest-via-overpass-only, and the resolved city appearing correctly in `/api/cities` all confirmed against the real database, not just unit tests.
- **Language support — UI chrome only, real now.** Scoped deliberately, not silently: place names/descriptions stay exactly as sourced regardless of language (a live demonstration already exists — the Paris events feed is French and untouched); translating that would need either a paid translation API or community contributions, neither of which fits a free, no-key-required tool. `react-i18next` wired through every screen's buttons/labels/headings (`frontend/src/i18n/{en,es}.ts`), defaulting to English rather than guessing from the browser locale (deterministic, and matches the app's existing "explicit, user-driven" pattern for locale-ish choices like home currency) with a visible EN/ES toggle in the header, persisted to `localStorage`. Spanish is the first language, chosen because the curated registry has real weight in Spanish-speaking countries (Mexico, Spain, most of Latin America) — **flagged honestly**: it's AI-translated, not reviewed by a native speaker, same "no citation, no claim" discipline this project applies to place data. A real cleanup fell out of this pass: SetupScreen's ~97-entry hand-maintained, English-only, already-incomplete `COUNTRY_NAMES` map was replaced with `Intl.DisplayNames` — a standard built-in API, not a new dependency, that's both complete and automatically localized to whichever language is active. A real, checked safety net: `i18n/resources.test.ts` fails the build if the English and Spanish key sets ever diverge, so a missing translation is caught immediately rather than silently falling back at runtime. Checklist item text and destination-recommender vibe labels are backend-authored template content, not frontend chrome — explicitly out of scope here, the same boundary as place data.
- **A support/donation link** — real infrastructure, off by default: `App.tsx`'s footer conditionally renders a "Support this project" link only when `VITE_SUPPORT_URL` is set at build time. No placeholder or fake URL exists anywhere — set the env var on Render once a real platform (Ko-fi, GitHub Sponsors, etc.) is picked, and it appears; leave it unset and nothing renders, same "no real value, no claim" pattern as every other optional integration in this app.
- **Privacy policy and terms of service** — first drafts exist (`PRIVACY.md`, `TERMS.md` at the repo root), written directly from what the app's code actually does and updated as that code changes — account deletion and the retention sweep both moved from `[ ]` placeholders to described real behavior in this pass. Both are still explicitly marked as drafts needing real legal review, and both still call out exactly what's missing to make them real: no entity name or jurisdiction (nothing can be published without one), no data-export flow, no reset emails actually being delivered, and — deliberately left as an open question for counsel rather than pre-filled — whether an arbitration/class-action-waiver clause belongs in "Dispute resolution" at all.
- **Live infrastructure** — real, hosted Neon Postgres (migrated, not just `db push`), real Ticketmaster/Resend/ExchangeRate-API/Google Places keys, deployed backend + frontend on Render as two separate services, pushed to a real GitHub repo. This whole section described a purely local, unhosted app for most of this project's history — it isn't that anymore.

## Adding another city (or country)

1. Add an entry to `backend/src/config/cities.ts` (slug, display name, `country` code, real `lat`/`lng` — geocode it, don't guess — Ticketmaster/SeatGeek market names). `lat`/`lng` are required now (the overpass adapter needs them); Nominatim (`nominatim.openstreetmap.org/search?q=...`) is the same free geocoder used to source the existing 159. That alone makes it a working city on the default adapters — verify first that Ticketmaster/SeatGeek actually have coverage there before assuming it (overpass and seed work for any real place regardless).
2. Optionally add a `seed` entry in `adapters/seed.ts` with a handful of real, checked landmarks — verify any "structured" city-pass claim against the vendor's actual coverage list before including it, and omit a booking link entirely rather than guess at one.
3. Optionally, if (and only if) research turns up a genuinely forward-looking public events dataset for that city, add a bonus adapter and list it in `extraAdapters` — mirroring `nycOpenDataEvents.ts` or `chicagoParkEvents.ts`.

No frontend changes needed at any step — the Setup screen's city picker and country grouping both read live from `/api/cities`.

## Structure

- `backend/src/adapters/` — one file per external source, normalized to a common record shape. `index.ts` defines `DEFAULT_ADAPTERS` (seed, overpass, ticketmaster, seatgeek — every city) and `adaptersForCity()`, which adds `google-places` only for `priorityTier` cities. Google Places is deliberately not a universal default: overpass now covers baseline static-tier coverage for free and unlimited, so Places' metered budget is concentrated on the ~44 verified/major cities where quality matters most rather than diluted across the whole registry.
- `backend/src/lib/httpRetry.ts` — retry-with-backoff wrapper used by every adapter that calls a live HTTP API.
- `backend/src/lib/rateLimiter.ts` — persisted daily call-budget guard, currently wired into `google-places` (the one metered/paid adapter).
- `backend/src/lib/exchangeRates.ts` + `routes/exchangeRate.routes.ts` — currency conversion sync: real cache, no provider connected, not called from the UI yet (no home-currency preference exists to call it with).
- `backend/src/services/ingestion.service.ts` — `ingestCity()` runs a city's default + extra adapters (optionally filtered), upserts into `Place`, and records per-adapter health, returning `{ count, ok, error? }` per adapter. `ensureCityFresh()` is the demand-driven gate that decides which adapters actually need re-running for a given read, and `warmPriorityCities()` pre-warms the small verified-major-city tier once at startup (see "What's real vs. stubbed").
- `backend/src/config/adapterCadence.ts` — per-adapter-tier staleness thresholds used by `ensureCityFresh()`.
- `backend/src/lib/decay.ts` — the confidence/provenance engine (verified/aging/stale bands).
- `backend/src/lib/collisions.ts` + `scripts/checkCollisions.ts` — the city-market collision guard.
- `backend/src/routes/health.routes.ts` — exposes `AdapterHealth` per city, backing the Discover screen's degraded-data banner.
- `backend/src/config/cities.ts` — the City Config Registry.
- `backend/src/config/localization.ts` — per-city currency (ISO 4217) and timezone (IANA) resolution.
- `backend/src/config/travelProfile.ts` — curated per-city budget tier and best season, used by the destination recommender.
- `backend/src/services/destinationRecommender.service.ts` + `routes/recommend.routes.ts` — the undecided-traveler destination recommender.
- `backend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx` — the two vitest suites (`npm test` in each directory).
- `backend/src/routes/auth.routes.ts` + `middleware/auth.middleware.ts` — accounts (JWT, bcrypt), including password reset and self-service deletion.
- `backend/src/lib/email.ts` — the email-sending abstraction behind password reset; logs in dev, real once `EMAIL_WEBHOOK_URL` points at a real provider.
- `backend/src/lib/resetToken.ts` — reset-token generation/hashing, kept separate from `auth.service.ts` so it's independently testable.
- `backend/src/services/retention.service.ts` + `scripts/sweepStaleTrips.ts` — the anonymous-trip retention sweep (`npm run sweep:stale-trips`).
- `frontend/src/components/` — Setup (with city picker and `FindDestinationPanel`), Discover (with the degraded-data banner), Itinerary (timezone-correct day labels), Checklist, AccountPanel (login, forgot-password, self-service account deletion).
- `.github/workflows/ci.yml` — CI workflow; ready, inert until this becomes a real git repo with a remote.
- `.gitignore` — covers `node_modules`, build output, the local SQLite file, and real `.env` files (but not the `.env*.example` templates, which are meant to be committed) — needed the moment this becomes a real repo, so it's here before that happens rather than after.
- `backend/.env.example` — the local-dev variable template (kept in sync with what the code actually reads).
- `backend/.env.production.example` — a reference, not a file the app reads: every variable a real deploy needs, annotated with what has to become true first (a chosen Postgres provider, real API keys, a generated `JWT_SECRET`, why `NODE_ENV=production` specifically matters here) and where the remaining gaps are (the frontend's same-origin `/api` assumption, the retention sweep's missing cron trigger). Written once so the "which env var maps to which already-built feature" question doesn't need re-deriving at actual deploy time.
- `PRIVACY.md`, `TERMS.md` — first-draft legal docs at the repo root, not yet reviewed or ready to publish.
