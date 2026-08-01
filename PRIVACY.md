# Privacy Policy (draft)

> **This is a working draft, not a reviewed legal document.** It was written directly from the current codebase — every claim below reflects what the app actually does today, not aspirational or templated language. Before this goes live, it needs a real review (a lawyer, or at minimum a founder decision on retention/deletion policy), and it needs to be re-checked against the code any time data handling changes. Placeholders are marked `[ ]`.

**Last drafted:** 2026-08-01, against the codebase as of the 129-city release. Updated from the 2026-07-31 draft to reflect real account-deletion and retention behavior that's since been built — see "Data retention and deletion" and "Your rights" below, both of which changed from `[ ]` placeholders to actual described behavior.

## What this covers

Trip Planner (the app) helps you discover things to do in a city, plan an itinerary, and optionally save trips to an account. This policy describes what data the app collects, why, and what it doesn't do.

## What we collect

**If you never create an account:** almost nothing. A trip is created and stored with a random, unguessable ID — no email, no name, no account. Only whoever has the trip's URL (`/trip/:id`) can view or edit it. If you don't save that URL, the trip is unreachable.

**If you create an account:** your email address and a hashed password (via bcrypt — we never store or can recover your actual password). Creating an account lets your trips show up under "My Trips" across devices, instead of relying on saving each trip's URL. If you request a password reset, a temporary token is generated and emailed to you — it's stored as a one-way hash (not the raw token itself), expires after one hour, and is deleted once used. `[ ]` *the reset email itself isn't actually sent anywhere yet — see README, no transactional email provider is configured.*

**Trip data**, with or without an account: the destination city, trip dates, selected interests, which places you've added to your itinerary, which day each is assigned to, and your checklist progress. This is the data the app needs to function — there's no data collected beyond what's shown back to you in the product.

**What we do not collect:** no payment information (the app never handles payment — it links out to third-party booking sites), no location tracking, no device fingerprinting, no analytics or advertising trackers of any kind. `[ ]` *if analytics are added later, this section and the rest of this policy need to be updated before that ships.*

## How your data is used

Your trip and account data is used only to run the app for you: rendering your itinerary, remembering your checklist progress, and (if logged in) listing your trips. It is not sold, shared with advertisers, or used to train anything.

## Third-party services

The app calls a small number of external APIs server-side to populate real place and event data for the city you're planning in (Ticketmaster, SeatGeek, Google Places, and a few municipal open-data portals). These calls send a city name/query — never your personal data, trip contents, or account details.

Booking links (e.g., "Buy on Ticketmaster") take you to the third party's own site. Once you click through, that site's own privacy policy applies — this app has no visibility into or control over what happens on their end.

## Data retention and deletion

**Account deletion is self-service.** Deleting your account permanently removes your email address and password — the two things that actually identify you — immediately, with no support request needed. Your trips are not deleted along with it: they revert to anonymous, reachable only by whoever has each trip's URL, exactly as if you'd never logged in. We made this choice deliberately — a city, some dates, and a list of place names aren't identifying on their own, and destroying someone's actual travel plans as a side effect of removing login credentials seemed like a worse outcome than the one this section exists to prevent. `[ ]` *if that tradeoff should instead delete trip content too, that's a real product decision to make before launch, not a technical constraint — the code can do either.*

**Anonymous trips that are never claimed by an account are automatically deleted after 90 days of inactivity** (no items added, moved, or checklist changes — not merely 90 days since creation). This runs as an on-demand script today (`npm run sweep:stale-trips`), not yet on an automatic schedule — `[ ]` *wiring it to a real recurring job needs a production deployment target, which doesn't exist yet (see README).* Trips attached to an account are never swept — an account is itself a signal the trip was worth keeping.

`[ ]` **Still undecided:** whether accounts themselves should also expire after long inactivity, separate from the trips they own.

## Cookies and local storage

No cookies are set. If you log in, your session token is stored in your browser's `localStorage` (not a cookie) and sent with API requests; it expires after 30 days. Your current trip ID and selected interests are also kept in `localStorage` so the app remembers your place between visits.

## Children's privacy

`[ ]` **Not addressed.** The app has no age gate and doesn't ask for age. If this is meant to be available to a general audience, someone needs to decide whether a children's-privacy statement (e.g., COPPA-related, if applicable) is needed before launch.

## Your rights

You can delete a trip yourself, at any time, without an account, and you can delete your account yourself from the account menu — both take effect immediately, no request needed. `[ ]` **Data export is not yet implemented.** A GDPR/CCPA-style "download a copy of my data" request would currently need to be handled manually rather than self-service — worth building before this is treated as compliant for EU/California users specifically. `[ ]` *Whether this app's userbase and business setup actually trigger GDPR/CCPA obligations in the first place is a legal question, not a technical one — flagged here, not answered here.*

## Changes to this policy

`[ ]` **Not yet decided:** how you'll be notified of changes (email, in-app banner, etc.) once accounts are a real, active feature.

## Contact

`[ ]` *No contact email or entity name exists yet for this project — needs to be filled in before this is published anywhere real.*
