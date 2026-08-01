# Terms of Service (draft)

> **This is a working draft, not a reviewed legal document.** It was written directly from what the app actually does today. It needs a real legal review before publication, and needs a real entity name/jurisdiction filled in — this draft cannot be published as-is. Placeholders are marked `[ ]`.

**Last drafted:** 2026-08-01, against the codebase as of the 129-city release. Updated from the 2026-07-31 draft — password reset and account deletion, both named as gaps in that draft, are now real features; see "Accounts" below.

## What this app is

Trip Planner is a discovery and itinerary-planning tool. It helps you find things to do in a city, build a day-by-day plan, and track a pre-trip checklist. It is **not** a booking platform: it does not sell tickets, process payments, book hotels, or issue any tickets or reservations itself. Where a booking link is shown, it takes you to a third party's own site to complete that booking.

## No booking, no payment, no liability for third-party transactions

Every "Buy on Ticketmaster," "Buy on SeatGeek," or similar link on this app hands you off to that third party's own platform, under their own terms. This app has no role in, and no liability for, any transaction, ticket, reservation, refund, or dispute that happens after you leave this app. `[ ]` This needs to be reviewed by counsel before publishing — the exact liability-disclaimer language here is a first draft, not vetted legal phrasing.

## Accuracy of information

Places, events, hours, prices, and availability shown in this app are pulled from third-party sources (open-data portals, Ticketmaster, SeatGeek, Google Places) and from manually researched listings, each with a visible "last verified" indicator. **Nothing shown in this app should be treated as guaranteed current or accurate** — always confirm details (especially hours, prices, and whether a ticket/reservation is actually required) directly with the venue or official source before you rely on them, particularly for anything past its confidence window.

## Accounts

An account is optional. If you create one, you're responsible for keeping your login credentials secure and for all activity under your account. You can reset a forgotten password and delete your account yourself at any time, both from the account menu — deleting your account removes your login credentials but leaves your trips intact as anonymous, URL-only trips, the same as if you'd never logged in. `[ ]` *Password-reset emails aren't actually being delivered yet — the reset flow works end-to-end, but no transactional email provider is connected (see README); this needs to be wired up before "reset your password" is a real claim to a live user, not just a working API.*

## Affiliate links and monetization

This app does not currently use affiliate tracking, referral codes, or commission-earning links of any kind — every "Buy on Ticketmaster" or "Buy on SeatGeek" link goes to the exact URL that provider's own API returned, unmodified. `[ ]` *If affiliate tracking is added later (a real possibility — see README's monetization notes), FTC guidance requires a clear, conspicuous "we may earn a commission" disclosure at the point where the link is shown, not just buried in these terms. That's a UI change to make at the same time affiliate tracking is added, not before.*

## Acceptable use

`[ ]` **First draft, needs real review.** You agree not to: scrape or bulk-extract the app's data through automated means outside the documented API; attempt to access another user's trip without its URL or, for an account-linked trip, without being logged into that account; interfere with or disrupt the app's normal operation (including attempting to bypass rate limits); or use the app for any unlawful purpose.

## No warranty

`[ ]` **First draft, needs real review — not vetted legal phrasing.** This app is provided "as is" and "as available," without warranties of any kind, express or implied, including but not limited to accuracy, merchantability, fitness for a particular purpose, and non-infringement. See "Accuracy of information" above for what that means in practice.

## Limitation of liability

`[ ]` **First draft, needs real review before this can be relied on.** To the maximum extent permitted by law, this app's total liability for any claim arising from your use of it is limited to the greater of (a) the amount you paid to use the app in the 12 months before the claim (currently $0, since the app doesn't charge for anything), or (b) $100. This app is not liable for indirect, incidental, or consequential damages — including a missed flight, event, or reservation resulting from relying on information shown here (see "Accuracy of information" above for why that reliance is discouraged in the first place).

## Dispute resolution

`[ ]` **Not drafted.** Whether this should include an arbitration clause and/or class-action waiver is a real strategic choice with real tradeoffs for users, not a box to check reflexively — worth deciding deliberately with counsel rather than defaulting to the most protective boilerplate available.

## Changes to the app or these terms

The app is under active development; features, data coverage, and these terms may change. `[ ]` A real policy on how material changes are communicated (e.g., in-app notice, version date) should be decided before this is finalized.

## Governing law and entity

`[ ]` **Not filled in.** No legal entity, business name, or jurisdiction exists for this project yet. This section cannot be completed — and these terms cannot be published anywhere real — until that's decided.

## Contact

`[ ]` *No contact email or entity name exists yet for this project.*
