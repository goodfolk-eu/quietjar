import { randomUUID } from "node:crypto";
import { libsqlClient } from "../db";

export interface Donation {
  id: string;
  siteId: string;
  accountId: string;
  sessionId: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  applicationFee: number;
  createdAt: number;
}

interface Row {
  id: string;
  site_id: string;
  account_id: string;
  session_id: string;
  payment_intent_id: string | null;
  amount: number;
  currency: string;
  application_fee: number;
  created_at: number;
}

function toDonation(row: Row): Donation {
  return {
    id: row.id,
    siteId: row.site_id,
    accountId: row.account_id,
    sessionId: row.session_id,
    paymentIntentId: row.payment_intent_id,
    amount: row.amount,
    currency: row.currency,
    applicationFee: row.application_fee,
    createdAt: row.created_at,
  };
}

export async function getDonationBySessionId(sessionId: string): Promise<Donation | null> {
  const result = await libsqlClient.execute({
    sql: "SELECT * FROM donations WHERE session_id = ?",
    args: [sessionId],
  });
  return result.rows.length > 0 ? toDonation(result.rows[0] as unknown as Row) : null;
}

/**
 * Stripe redelivers webhooks, so the session id carries a unique constraint and
 * a repeat delivery is a no-op rather than a second donation.
 */
export async function recordDonation(input: {
  siteId: string;
  accountId: string;
  sessionId: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  applicationFee: number;
}): Promise<void> {
  await libsqlClient.execute({
    sql: `INSERT INTO donations
            (id, site_id, account_id, session_id, payment_intent_id,
             amount, currency, application_fee, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (session_id) DO NOTHING`,
    args: [
      randomUUID(),
      input.siteId,
      input.accountId,
      input.sessionId,
      input.paymentIntentId,
      input.amount,
      input.currency,
      input.applicationFee,
      Date.now(),
    ],
  });
}
