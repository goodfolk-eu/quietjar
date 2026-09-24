import { chargeAmounts, stripeConfigFromEnv } from "../stripe/client";
import { listUnsettledDonations, settleDonation } from "./store";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How far back the sweep keeps asking. A charge that still reports nothing
 * after a week is not going to, and `backfill-donation.ts` covers anything
 * older by hand.
 */
const LOOKBACK_MS = 7 * DAY_MS;

/** Enough to drain a quiet outage in one pass, small enough to stay cheap. */
const BATCH_SIZE = 100;

/**
 * Fills in what donations settled to when Stripe could not say at webhook
 * time. The webhook often lands before the charge's balance transaction
 * exists, and a donation recorded without its net counts as nothing in the
 * earnings, so without this the chart would miss it for good.
 */
export async function settlePendingDonations(now = Date.now()): Promise<number> {
  const config = stripeConfigFromEnv();
  if (!config) return 0;
  const pending = await listUnsettledDonations({ since: now - LOOKBACK_MS, limit: BATCH_SIZE });
  let settled = 0;
  for (const donation of pending) {
    try {
      const amounts = await chargeAmounts(config, donation.accountId, donation.paymentIntentId);
      if (amounts.net === null) continue;
      await settleDonation({
        sessionId: donation.sessionId,
        net: amounts.net,
        applicationFee: amounts.applicationFee,
      });
      settled += 1;
    } catch (err) {
      // One unreadable charge must not hold up the rest; it is retried next pass.
      console.error(`[pay/settle] could not settle ${donation.sessionId}:`, err);
    }
  }
  return settled;
}
