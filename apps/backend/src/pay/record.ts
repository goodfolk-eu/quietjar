import type Stripe from "stripe";
import { goalForSite } from "../goals/store";
import { getSiteByPublicKey } from "../sites/store";
import { applicationFee, chargeNet, stripeConfigFromEnv } from "../stripe/client";
import { recordDonation } from "./store";

/**
 * The site key rides on the session metadata because the connected account on
 * its own does not say which of the creator's sites the donation came from.
 *
 * Shared by the webhook and the backfill command, so a donation recovered by
 * hand is stored exactly like one that arrived on its own.
 */
export async function recordCompletedDonation(
  session: Stripe.Checkout.Session,
  accountId: string | undefined,
): Promise<void> {
  if (session.payment_status !== "paid") return;
  const siteKey = session.metadata?.quietjar_site;
  if (!siteKey || !accountId || session.amount_total === null || session.currency === null) return;

  const site = await getSiteByPublicKey(siteKey);
  if (!site) return;

  // Ownership is re-checked rather than trusted from the metadata, but an
  // archived goal is still recorded: the donation was made toward it, and
  // archiving hides a goal rather than rewriting what it raised.
  const goalId = session.metadata?.quietjar_goal;
  const goal = goalId ? await goalForSite(goalId, site.id) : null;

  // When Stripe is slow or the net cannot be read, the row still records and
  // the dashboard falls back to gross minus our fee for it.
  const config = stripeConfigFromEnv();
  const net =
    config && typeof session.payment_intent === "string"
      ? await chargeNet(config, accountId, session.payment_intent).catch(() => null)
      : null;

  await recordDonation({
    siteId: site.id,
    accountId,
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    amount: session.amount_total,
    currency: session.currency,
    applicationFee: applicationFee(session.amount_total),
    email: session.customer_details?.email ?? null,
    net,
    goalId: goal?.id ?? null,
  });
}
