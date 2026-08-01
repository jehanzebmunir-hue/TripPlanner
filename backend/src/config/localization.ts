import { CityConfig } from "../types";

// ISO 4217 currency per country. Where a country's official currency isn't
// what tourists actually transact in (Ecuador and Panama are dollarized;
// Cambodia's riel exists but USD is the de facto tourist currency), this
// uses the practical answer over the technically-official one — the point
// of this table is "what will you actually be paying with," not a strict
// legal-tender reference.
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS", PE: "PEN", CL: "CLP",
  CO: "COP", CR: "CRC", ZA: "ZAR", KE: "KES", EG: "EGP", MA: "MAD", AU: "AUD",
  GB: "GBP", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", DE: "EUR", JP: "JPY",
  KR: "KRW", SG: "SGD", TH: "THB", TW: "TWD", AE: "AED", PA: "USD", NG: "NGN",
  NZ: "NZD", AT: "EUR", CZ: "CZK", PT: "EUR", TR: "TRY", HK: "HKD", MY: "MYR",
  IN: "INR", EC: "USD", GT: "GTQ", TZ: "TZS", ZM: "ZMW", FJ: "FJD", GR: "EUR",
  IS: "ISK", IE: "EUR", ID: "IDR", VN: "VND", BZ: "BZD", RW: "RWF", NA: "NAD",
  GE: "GEL", SI: "EUR", PL: "PLN", KH: "USD", LK: "LKR", CN: "CNY", BO: "BOB",
  ET: "ETB", UG: "UGX", FO: "DKK", NO: "NOK", LA: "LAK", BT: "BTN", PR: "USD",
  DO: "DOP", JM: "JMD", BS: "BSD", SE: "SEK", DK: "DKK", FI: "EUR", CH: "CHF",
  IL: "ILS", JO: "JOD", NP: "NPR", SA: "SAR", QA: "QAR", UZ: "UZS", HR: "EUR",
  HU: "HUF", PF: "XPF", PH: "PHP", MT: "EUR", BW: "BWP", UY: "UYU", BB: "BBD",
  AW: "AWG", MV: "MVR", OM: "OMR", TN: "TND", MU: "MUR", SC: "SCR", MN: "MNT",
  KZ: "KZT", RO: "RON", RS: "RSD",
};

// IANA timezone per country — correct for every single-timezone country in
// the registry. Countries that span multiple zones (US, Canada, Mexico,
// Australia, plus a handful of individual cities elsewhere) are handled by
// TIMEZONE_OVERRIDE_BY_SLUG below instead, checked first.
const TIMEZONE_BY_COUNTRY: Record<string, string> = {
  BR: "America/Sao_Paulo", AR: "America/Argentina/Buenos_Aires", PE: "America/Lima",
  CL: "America/Santiago", CO: "America/Bogota", CR: "America/Costa_Rica",
  ZA: "Africa/Johannesburg", KE: "Africa/Nairobi", EG: "Africa/Cairo",
  MA: "Africa/Casablanca", GB: "Europe/London", FR: "Europe/Paris", IT: "Europe/Rome",
  ES: "Europe/Madrid", NL: "Europe/Amsterdam", DE: "Europe/Berlin", JP: "Asia/Tokyo",
  KR: "Asia/Seoul", SG: "Asia/Singapore", TH: "Asia/Bangkok", TW: "Asia/Taipei",
  AE: "Asia/Dubai", PA: "America/Panama", NG: "Africa/Lagos", NZ: "Pacific/Auckland",
  AT: "Europe/Vienna", CZ: "Europe/Prague", PT: "Europe/Lisbon", TR: "Europe/Istanbul",
  HK: "Asia/Hong_Kong", MY: "Asia/Kuala_Lumpur", IN: "Asia/Kolkata",
  EC: "America/Guayaquil", GT: "America/Guatemala", TZ: "Africa/Dar_es_Salaam",
  ZM: "Africa/Lusaka", FJ: "Pacific/Fiji", GR: "Europe/Athens", IS: "Atlantic/Reykjavik",
  IE: "Europe/Dublin", VN: "Asia/Ho_Chi_Minh", BZ: "America/Belize",
  RW: "Africa/Kigali", NA: "Africa/Windhoek", GE: "Asia/Tbilisi", SI: "Europe/Ljubljana",
  PL: "Europe/Warsaw", KH: "Asia/Phnom_Penh", LK: "Asia/Colombo", CN: "Asia/Shanghai",
  BO: "America/La_Paz", ET: "Africa/Addis_Ababa", UG: "Africa/Kampala",
  FO: "Atlantic/Faroe", NO: "Europe/Oslo", LA: "Asia/Vientiane", BT: "Asia/Thimphu",
  PR: "America/Puerto_Rico", DO: "America/Santo_Domingo", JM: "America/Jamaica",
  BS: "America/Nassau", SE: "Europe/Stockholm", DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki", CH: "Europe/Zurich", IL: "Asia/Jerusalem", JO: "Asia/Amman",
  NP: "Asia/Kathmandu", SA: "Asia/Riyadh", QA: "Asia/Qatar", UZ: "Asia/Samarkand",
  HR: "Europe/Zagreb", HU: "Europe/Budapest", PF: "Pacific/Tahiti",
  PH: "Asia/Manila", MT: "Europe/Malta", BW: "Africa/Gaborone",
  UY: "America/Montevideo", BB: "America/Barbados", AW: "America/Aruba",
  MV: "Indian/Maldives", OM: "Asia/Muscat", TN: "Africa/Tunis",
  MU: "Indian/Mauritius", SC: "Indian/Mahe", MN: "Asia/Ulaanbaatar",
  KZ: "Asia/Almaty", RO: "Europe/Bucharest", RS: "Europe/Belgrade",
};

// Multi-timezone countries (US, Canada, Mexico, Australia), plus a few
// individual cities whose country default would be wrong for that one city
// specifically (Salvador sits in Brazil's Bahia zone; Bali/Ubud is in
// Indonesia's WITA zone, not Jakarta's WIB; Ushuaia has its own zone entry
// in the tz database despite sharing Argentina's offset).
const TIMEZONE_OVERRIDE_BY_SLUG: Record<string, string> = {
  nyc: "America/New_York", boston: "America/New_York", dc: "America/New_York",
  miami: "America/New_York", "new-orleans": "America/Chicago", nashville: "America/Chicago",
  charleston: "America/New_York", asheville: "America/New_York", chicago: "America/Chicago",
  la: "America/Los_Angeles", sf: "America/Los_Angeles", seattle: "America/Los_Angeles",
  "las-vegas": "America/Los_Angeles", anchorage: "America/Anchorage", "santa-fe": "America/Denver",

  toronto: "America/Toronto", montreal: "America/Toronto", "quebec-city": "America/Toronto",
  vancouver: "America/Vancouver", halifax: "America/Halifax", whitehorse: "America/Whitehorse",

  "mexico-city": "America/Mexico_City", "puerto-vallarta": "America/Mexico_City",
  "san-miguel-de-allende": "America/Mexico_City", cancun: "America/Cancun", tulum: "America/Cancun",

  sydney: "Australia/Sydney", melbourne: "Australia/Melbourne", hobart: "Australia/Hobart",
  brisbane: "Australia/Brisbane", cairns: "Australia/Brisbane", yulara: "Australia/Darwin",

  salvador: "America/Bahia",
  ubud: "Asia/Makassar",
  ushuaia: "America/Argentina/Ushuaia",
};

export function getCurrency(city: Pick<CityConfig, "country">): string {
  return CURRENCY_BY_COUNTRY[city.country] ?? "USD";
}

export function getTimezone(city: Pick<CityConfig, "slug" | "country">): string {
  return TIMEZONE_OVERRIDE_BY_SLUG[city.slug] ?? TIMEZONE_BY_COUNTRY[city.country] ?? "UTC";
}
