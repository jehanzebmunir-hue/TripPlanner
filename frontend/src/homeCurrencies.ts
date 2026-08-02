// A practical set of major world currencies for "what do you spend in
// day-to-day" -- not an exhaustive ISO 4217 list, and deliberately not tied
// to the destination-city currency list (a traveler's home currency has
// nothing to do with which cities this app covers). Shared between
// SetupScreen (set once at creation) and EditTripPanel (change it later)
// so the two pickers can't silently drift apart.
export const HOME_CURRENCIES = [
  "USD", "CAD", "EUR", "GBP", "AUD", "NZD", "JPY", "CNY", "INR", "MXN",
  "BRL", "CHF", "SEK", "NOK", "DKK", "SGD", "HKD", "KRW", "ZAR", "AED",
];
