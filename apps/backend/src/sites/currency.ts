/**
 * Countries a creator can run a connected account from, and the currency each
 * one collects in.
 *
 * Stripe Connect itself reaches 122 countries. This list is the subset whose
 * settlement currency is two-decimal *and* has a published minimum charge
 * amount, because both are load-bearing here: `toMinorUnits` assumes hundredths
 * (a zero-decimal currency like JPY would be charged 100x over), and
 * `AMOUNT_BOUNDS` needs a real floor rather than a guessed one. Widening the
 * list means adding a currency, its bounds, and its countries together.
 */
export const SUPPORTED_CURRENCIES = [
  "aed",
  "ars",
  "aud",
  "brl",
  "cad",
  "chf",
  "cop",
  "czk",
  "dkk",
  "eur",
  "gbp",
  "hkd",
  "idr",
  "ils",
  "inr",
  "mxn",
  "myr",
  "nok",
  "nzd",
  "php",
  "pln",
  "ron",
  "sek",
  "sgd",
  "thb",
  "usd",
  "zar",
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "eur";

const BY_COUNTRY = {
  AE: "aed",
  AR: "ars",
  AT: "eur",
  AU: "aud",
  BE: "eur",
  BR: "brl",
  CA: "cad",
  CH: "chf",
  CO: "cop",
  CY: "eur",
  CZ: "czk",
  DE: "eur",
  DK: "dkk",
  EE: "eur",
  ES: "eur",
  FI: "eur",
  FR: "eur",
  GB: "gbp",
  GR: "eur",
  HK: "hkd",
  HR: "eur",
  ID: "idr",
  IE: "eur",
  IL: "ils",
  IN: "inr",
  IT: "eur",
  LI: "chf",
  LT: "eur",
  LU: "eur",
  LV: "eur",
  MC: "eur",
  MT: "eur",
  MX: "mxn",
  MY: "myr",
  NL: "eur",
  NO: "nok",
  NZ: "nzd",
  PH: "php",
  PL: "pln",
  PT: "eur",
  RO: "ron",
  SE: "sek",
  SG: "sgd",
  SI: "eur",
  SK: "eur",
  SM: "eur",
  TH: "thb",
  US: "usd",
  ZA: "zar",
} as const satisfies Record<string, Currency>;

export type Country = keyof typeof BY_COUNTRY;

export const SUPPORTED_COUNTRIES = Object.keys(BY_COUNTRY) as Country[];

/**
 * Stripe accounts allowed to request each local payment method, by capability.
 * Wider than the eurozone -- several cover the US, Canada, Australia and Asian
 * markets -- so eligibility cannot be inferred from the currency.
 *
 * Transcribed from each method's "business locations" list in Stripe's docs,
 * the same way AMOUNT_BOUNDS is transcribed from their published minimums.
 * Predicting eligibility locally is what lets the setup step say "not available
 * in your country" before the creator clicks. Stripe stays the authority: a
 * capability request that comes back `unsupported` is still handled.
 *
 * Only iDEAL adds verification requirements beyond card payments. Methods that
 * charge the connected account a standing fee are deliberately absent, because
 * the creator is promised one deduction per donation and nothing else.
 */
const CAPABILITY_COUNTRIES: Record<string, ReadonlySet<string>> = {
  ideal_payments: new Set<string>([
    "AT",
    "AU",
    "BE",
    "BG",
    "CA",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GI",
    "GR",
    "HK",
    "HR",
    "HU",
    "IE",
    "IT",
    "JP",
    "LI",
    "LT",
    "LU",
    "LV",
    "MT",
    "MX",
    "NL",
    "NO",
    "NZ",
    "PL",
    "PT",
    "RO",
    "SE",
    "SG",
    "SI",
    "SK",
    "US",
  ]),
  bancontact_payments: new Set<string>([
    "AT",
    "AU",
    "BE",
    "BG",
    "CA",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GI",
    "GR",
    "HK",
    "HR",
    "HU",
    "IE",
    "IT",
    "JP",
    "LI",
    "LT",
    "LU",
    "LV",
    "MT",
    "MX",
    "NL",
    "NO",
    "NZ",
    "PL",
    "PT",
    "RO",
    "SE",
    "SG",
    "SI",
    "SK",
    "US",
  ]),
  eps_payments: new Set<string>([
    "AT",
    "AU",
    "BE",
    "BG",
    "CA",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GI",
    "GR",
    "HK",
    "HR",
    "HU",
    "IE",
    "IT",
    "JP",
    "LI",
    "LT",
    "LU",
    "LV",
    "MT",
    "MX",
    "NL",
    "NO",
    "NZ",
    "PL",
    "PT",
    "RO",
    "SE",
    "SG",
    "SI",
    "SK",
    "US",
  ]),
  cartes_bancaires_payments: new Set<string>([
    "AT",
    "AU",
    "BE",
    "BG",
    "CA",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GI",
    "GR",
    "HK",
    "HR",
    "HU",
    "IE",
    "IS",
    "IT",
    "JP",
    "LI",
    "LT",
    "LU",
    "LV",
    "MT",
    "MX",
    "NL",
    "NO",
    "NZ",
    "PL",
    "PT",
    "RO",
    "SE",
    "SG",
    "SI",
    "SK",
    "US",
  ]),
  revolut_pay_payments: new Set<string>([
    "AT",
    "BE",
    "BG",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GR",
    "HR",
    "HU",
    "IE",
    "IT",
    "LI",
    "LT",
    "LU",
    "LV",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "SE",
    "SI",
    "SK",
  ]),
  blik_payments: new Set<string>([
    "AT",
    "AU",
    "BE",
    "BG",
    "CA",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GR",
    "HR",
    "HU",
    "IE",
    "IS",
    "IT",
    "LI",
    "LT",
    "LU",
    "LV",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "SE",
    "SG",
    "SI",
    "SK",
    "US",
  ]),
  satispay_payments: new Set<string>([
    "AT",
    "AU",
    "BE",
    "BG",
    "CA",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GR",
    "HR",
    "HU",
    "IE",
    "IT",
    "LI",
    "LT",
    "LU",
    "LV",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "SE",
    "SG",
    "SI",
    "SK",
    "US",
  ]),
  pay_by_bank_payments: new Set<string>([
    "AT",
    "AU",
    "BE",
    "BG",
    "CA",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GR",
    "HR",
    "HU",
    "IE",
    "IT",
    "LI",
    "LT",
    "LU",
    "LV",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "SE",
    "SG",
    "SI",
    "SK",
    "US",
  ]),
};

export const LOCAL_METHOD_CAPABILITIES = Object.keys(CAPABILITY_COUNTRIES);

/**
 * What a single donation may be, in major units.
 *
 * `min` is at or above Stripe's published minimum charge for the currency, so a
 * donation inside these bounds is never refused for being too small. `max` is
 * ours, not Stripe's: roughly the 500 EUR ceiling the product started with,
 * converted and rounded to a number that reads like a limit rather than a rate.
 */
const AMOUNT_BOUNDS = {
  aed: { min: 5, max: 2000 },
  ars: { min: 1000, max: 500_000 },
  aud: { min: 1, max: 800 },
  brl: { min: 5, max: 3000 },
  cad: { min: 1, max: 750 },
  chf: { min: 1, max: 500 },
  cop: { min: 5000, max: 2_000_000 },
  czk: { min: 20, max: 12_000 },
  dkk: { min: 5, max: 3500 },
  eur: { min: 1, max: 500 },
  gbp: { min: 1, max: 400 },
  hkd: { min: 5, max: 4000 },
  idr: { min: 20_000, max: 8_000_000 },
  ils: { min: 5, max: 2000 },
  inr: { min: 100, max: 45_000 },
  mxn: { min: 20, max: 10_000 },
  myr: { min: 5, max: 2500 },
  nok: { min: 5, max: 6000 },
  nzd: { min: 2, max: 900 },
  php: { min: 100, max: 30_000 },
  pln: { min: 5, max: 2000 },
  ron: { min: 5, max: 2500 },
  sek: { min: 5, max: 6000 },
  sgd: { min: 1, max: 700 },
  thb: { min: 20, max: 18_000 },
  usd: { min: 1, max: 500 },
  zar: { min: 20, max: 10_000 },
} as const satisfies Record<Currency, { min: number; max: number }>;

export interface AmountBounds {
  min: number;
  max: number;
}

export function currencyForCountry(country: string | undefined | null): Currency {
  if (!country) return DEFAULT_CURRENCY;
  return BY_COUNTRY[country.toUpperCase() as Country] ?? DEFAULT_CURRENCY;
}

export function isSupportedCurrency(value: unknown): value is Currency {
  return typeof value === "string" && SUPPORTED_CURRENCIES.includes(value as Currency);
}

export function isSupportedCountry(value: unknown): value is Country {
  return typeof value === "string" && value.toUpperCase() in BY_COUNTRY;
}

/** The local method capabilities an account in this country may request. */
export function localMethodCapabilities(country: string | undefined | null): string[] {
  if (!country) return [];
  const code = country.toUpperCase();
  return LOCAL_METHOD_CAPABILITIES.filter((name) => CAPABILITY_COUNTRIES[name].has(code));
}

export function amountBounds(currency: string): AmountBounds {
  return isSupportedCurrency(currency) ? AMOUNT_BOUNDS[currency] : AMOUNT_BOUNDS[DEFAULT_CURRENCY];
}

/**
 * Every supported currency is two-decimal, which is what makes this a flat
 * multiplication. See the note on SUPPORTED_CURRENCIES before adding one that
 * is not.
 */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Formats minor units as currency, falling back to a plain code for unknown
 * ISO codes. The locale is fixed rather than the host's: this runs on the
 * server, where the container's locale says nothing about the reader.
 */
export function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(minor / 100);
  } catch {
    return `${currency.toUpperCase()} ${(minor / 100).toFixed(2)}`;
  }
}
