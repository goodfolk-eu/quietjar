/**
 * Records a donation that Stripe never delivered a webhook for.
 *
 * Stripe's retry API only knows about events queued for an endpoint that
 * already existed, so a donation taken while the Connect webhook was missing
 * cannot be replayed from the dashboard. This reads the session straight from
 * the connected account and runs it through the same recording path the
 * webhook uses; the unique constraint on the session id makes a repeat run a
 * no-op.
 *
 * Usage: bun backfill-donation.ts <account_id> <checkout_session_id>
 */
import { recordCompletedDonation } from "./src/pay/record";
import { getDonationBySessionId } from "./src/pay/store";
import { retrieveDonationSession, stripeConfigFromEnv } from "./src/stripe/client";

const [accountId, sessionId] = process.argv.slice(2);
if (!accountId || !sessionId) {
  console.error("Usage: bun backfill-donation.ts <account_id> <checkout_session_id>");
  process.exit(1);
}

const config = stripeConfigFromEnv();
if (!config) {
  console.error("STRIPE_SECRET_KEY is not set. Add it to .env in the backend folder.");
  process.exit(1);
}

const existing = await getDonationBySessionId(sessionId);
if (existing) {
  console.log(`Already recorded: ${existing.amount} ${existing.currency} on ${existing.createdAt}`);
  process.exit(0);
}

const session = await retrieveDonationSession(config, accountId, sessionId);
if (!session) {
  console.error(`Could not read ${sessionId} on ${accountId}.`);
  process.exit(1);
}
if (session.payment_status !== "paid") {
  console.error(`Refusing to record ${sessionId}: payment_status is ${session.payment_status}.`);
  process.exit(1);
}

await recordCompletedDonation(session, accountId);

const recorded = await getDonationBySessionId(sessionId);
if (!recorded) {
  console.error("Nothing was written. The session metadata may not name a known site.");
  process.exit(1);
}
console.log(
  `Recorded ${recorded.amount} ${recorded.currency} for site ${recorded.siteId}` +
    ` (net ${recorded.net ?? "unknown"}, goal ${recorded.goalId ?? "none"}).`,
);
