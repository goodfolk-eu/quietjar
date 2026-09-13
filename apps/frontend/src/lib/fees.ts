/**
 * Fee model behind the pricing page's worked example.
 *
 * QuietJar takes a flat 5% of each payment. Stripe's processing cost is passed
 * through on top, at cost, and depends on the payment method. The supporter
 * never pays more than the amount they chose; both deductions come out of what
 * the site owner receives.
 *
 * Rates are Stripe's published Netherlands prices, checked on the date below.
 * Update the table when Stripe changes them; the layout does not need to
 * change.
 *
 * These rates are also what the Stripe platform pricing scheme charges, as our
 * 5% plus the rate below in one blended application fee. Change one and the
 * other has to follow, or the page stops describing what the creator is
 * actually charged. Nothing can catch that drift for you.
 */

export const QUIETJAR_RATE = 0.05;

export const RATES_CHECKED = "2026-09-13";

export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 500;

/**
 * Only the methods the connected accounts actually request, which is cards and
 * iDEAL. Wallets are not their own tier: Apple Pay and Google Pay are billed
 * as the card behind them, so a UK card in Apple Pay costs the UK rate. What
 * changes the price is where the card was issued.
 */
export type MethodKey = "card" | "cardUk" | "cardInternational" | "ideal";

export interface MethodRate {
  key: MethodKey;
  /** Percentage of the amount, as a fraction. */
  percent: number;
  /** Fixed part in euro. */
  fixed: number;
  /** Rate formatted for display, for example "1.5% + €0.25". */
  display: string;
}

export const METHOD_RATES: readonly MethodRate[] = [
  // stripe.com/nl/pricing: standard EEA cards, 1,5% + € 0,25.
  { key: "card", percent: 0.015, fixed: 0.25, display: "1.5% + €0.25" },
  // stripe.com/nl/pricing: UK cards, 2,5% + € 0,25.
  { key: "cardUk", percent: 0.025, fixed: 0.25, display: "2.5% + €0.25" },
  // stripe.com/nl/pricing: international cards, 3,15% + € 0,25. The further
  // 2% for currency conversion is not included: a donation is charged in the
  // site's own currency, which is also the currency the account settles in, so
  // the conversion is the supporter's bank's problem rather than a cost here.
  { key: "cardInternational", percent: 0.0315, fixed: 0.25, display: "3.15% + €0.25" },
  // stripe.com/nl/pricing: iDEAL, € 0,29 per payment.
  { key: "ideal", percent: 0, fixed: 0.29, display: "€0.29" },
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
  const processing = roundCents(amount * method.percent + method.fixed);
  const quietjar = roundCents(amount * QUIETJAR_RATE);
  const net = roundCents(amount - processing - quietjar);
  return { amount, processing, quietjar, net };
}

export function formatEuro(value: number): string {
  return `€${value.toFixed(2)}`;
}
