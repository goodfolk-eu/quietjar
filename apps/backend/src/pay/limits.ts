import { amountBounds } from "../sites/currency";

/**
 * Bounds on a single donation, in the site's currency, in major units. They
 * differ per currency: a flat 1-500 would be a few cents to a few dollars in
 * the low-value ones. See AMOUNT_BOUNDS for how the numbers were chosen.
 */
export function isValidAmount(amount: number, currency: string): boolean {
  if (!Number.isFinite(amount)) return false;
  const { min, max } = amountBounds(currency);
  if (amount < min || amount > max) return false;
  // Anything finer than a cent is a client bug, not a donation.
  const minor = amount * 100;
  return Math.abs(minor - Math.round(minor)) < 1e-6;
}

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window counter, held in memory. The backend runs as a single container,
 * so a shared store would buy nothing; a restart resetting the counters is an
 * acceptable trade for having no dependency.
 */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** True when the call is within budget; false when it should be refused. */
  take(key: string, now = Date.now()): boolean {
    const existing = this.windows.get(key);
    if (!existing || existing.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      this.sweep(now);
      return true;
    }
    if (existing.count >= this.limit) return false;
    existing.count += 1;
    return true;
  }

  private sweep(now: number): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}

export const sessionsPerIp = new RateLimiter(10, 60_000);
export const sessionsPerSite = new RateLimiter(60, 60_000);
