/**
 * Fee model behind the pricing page's worked example.
 *
 * QuietJar takes a flat 5% of each payment. Stripe's processing cost is passed
 * through on top, at cost, and depends on the payment method. The supporter
 * never pays more than the amount they chose; both deductions come out of what
 * the site owner receives.
 *
 * Rates are Stripe's published Netherlands prices for EEA payments, checked on
 * the date below. Update the table when Stripe changes them; the layout does
 * not need to change.
 */

export const QUIETJAR_RATE = 0.05;

export const RATES_CHECKED = "2026-09-11";

export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 500;

export type MethodKey = "card" | "ideal" | "wallet" | "sepa";

export interface MethodRate {
  key: MethodKey;
  /** Percentage of the amount, as a fraction. */
  percent: number;
  /** Fixed part in euro. */
  fixed: number;
  /** Optional ceiling in euro for the whole processing fee. */
  cap?: number;
  /** Rate formatted for display, for example "1.5% + €0.25". */
  display: string;
}

export const METHOD_RATES: readonly MethodRate[] = [
  // stripe.com/nl/pricing: standard EEA cards, 1,5% + € 0,25.
  { key: "card", percent: 0.015, fixed: 0.25, display: "1.5% + €0.25" },
  // stripe.com/nl/pricing: iDEAL, € 0,29 per payment.
  { key: "ideal", percent: 0, fixed: 0.29, display: "€0.29" },
  // Apple Pay and Google Pay are billed as the underlying card.
  { key: "wallet", percent: 0.015, fixed: 0.25, display: "1.5% + €0.25" },
  // SEPA Direct Debit: 0.35% capped at €5. Not shown on Stripe's NL pricing
  // page at the time of checking; taken from our competitor reference. Verify
  // before relying on it in copy.
  { key: "sepa", percent: 0.0035, fixed: 0, cap: 5, display: "0.35%, max €5" },
] as const;

export const PRESET_AMOUNTS = [3, 5, 10, 25, 100] as const;

export interface FeeBreakdown {
  amount: number;
  processing: number;
  quietjar: number;
  net: number;
}

const roundCents = (value: number): number => Math.round(value * 100) / 100;

export function clampAmount(value: number): number {
  if (!Number.isFinite(value)) return MIN_AMOUNT;
  return Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, roundCents(value)));
}

export function rateFor(key: string): MethodRate {
  return METHOD_RATES.find((rate) => rate.key === key) ?? METHOD_RATES[0];
}

export function breakdown(rawAmount: number, method: MethodRate): FeeBreakdown {
  const amount = clampAmount(rawAmount);
  let processing = roundCents(amount * method.percent + method.fixed);
  if (method.cap !== undefined) processing = Math.min(processing, method.cap);
  const quietjar = roundCents(amount * QUIETJAR_RATE);
  const net = roundCents(amount - processing - quietjar);
  return { amount, processing, quietjar, net };
}

export function formatEuro(value: number): string {
  return `€${value.toFixed(2)}`;
}
