/**
 * Currencies creators can collect in. Every one is a two-decimal currency, so
 * minor units are always the major amount times 100; adding a zero-decimal
 * currency (JPY, KRW) means teaching `toMinorUnits` about exponents.
 */
export const SUPPORTED_CURRENCIES = ["eur", "gbp", "chf", "dkk", "nok", "pln", "sek"] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "eur";

const BY_COUNTRY: Record<string, Currency> = {
  AT: "eur",
  BE: "eur",
  CH: "chf",
  DE: "eur",
  DK: "dkk",
  ES: "eur",
  FI: "eur",
  FR: "eur",
  GB: "gbp",
  IE: "eur",
  IT: "eur",
  LU: "eur",
  NL: "eur",
  NO: "nok",
  PL: "pln",
  PT: "eur",
  SE: "sek",
};

export function currencyForCountry(country: string | undefined): Currency {
  if (!country) return DEFAULT_CURRENCY;
  return BY_COUNTRY[country.toUpperCase()] ?? DEFAULT_CURRENCY;
}

export function isSupportedCurrency(value: unknown): value is Currency {
  return typeof value === "string" && SUPPORTED_CURRENCIES.includes(value as Currency);
}

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}
