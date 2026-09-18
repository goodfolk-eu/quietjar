/**
 * Fee model behind the pricing page's worked example.
 *
 * QuietJar takes 5% of each donation, never less than EUR 0.50, and absorbs
 * every payment processing cost itself. The creator sees one deduction and the
 * supporter is never surcharged, whichever method they reach for.
 *
 * Stripe's platform pricing scheme is what actually charges the fee. This is
 * the page's own copy of the rule, for display only; nothing here decides what
 * a creator is charged.
 */

export const QUIETJAR_RATE = 0.05;

/** In euro. Below EUR 10 this is what binds, not the percentage. */
export const MINIMUM_FEE = 0.5;

export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 500;

/** Chosen to walk across the point where the percentage overtakes the floor. */
export const PRESET_AMOUNTS = [3, 10, 25, 50, 100] as const;

export interface FeeBreakdown {
  amount: number;
  quietjar: number;
  net: number;
  /** True when the floor set the fee rather than the percentage. */
  atMinimum: boolean;
}

const roundCents = (value: number): number => Math.round(value * 100) / 100;

export function clampAmount(value: number): number {
  if (!Number.isFinite(value)) return MIN_AMOUNT;
  return Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, roundCents(value)));
}

export function breakdown(rawAmount: number): FeeBreakdown {
  const amount = clampAmount(rawAmount);
  const percentage = amount * QUIETJAR_RATE;
  // Compared before rounding, or EUR 9.99 would look like it reached the floor
  // on its own. At exactly EUR 10 the two are equal, and the percentage is the
  // better story to tell: from ten euro up, the rule is simply 5%.
  const atMinimum = percentage < MINIMUM_FEE;
  const quietjar = atMinimum ? MINIMUM_FEE : roundCents(percentage);
  return { amount, quietjar, net: roundCents(amount - quietjar), atMinimum };
}

export function formatEuro(value: number): string {
  return `€${value.toFixed(2)}`;
}
