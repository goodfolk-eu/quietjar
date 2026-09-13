import { randomUUID } from "node:crypto";
import { libsqlClient } from "../db";
import type { DailyEarnings } from "../donations/series";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Donation {
  id: string;
  siteId: string;
  accountId: string;
  sessionId: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  applicationFee: number;
  /** Comes from the payment, so the supporter is never asked for it again. */
  email: string | null;
  /** What the creator kept. Null on rows written before it was captured. */
  net: number | null;
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
  email: string | null;
  net: number | null;
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
    email: row.email,
    net: row.net,
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
  email: string | null;
  net: number | null;
}): Promise<void> {
  await libsqlClient.execute({
    sql: `INSERT INTO donations
            (id, site_id, account_id, session_id, payment_intent_id,
             amount, currency, application_fee, email, net, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      input.email,
      input.net,
      Date.now(),
    ],
  });
}

/**
 * Written by the public details endpoint, which can fire before the webhook
 * has created the donation itself; the session id ties the two together. The
 * first submit wins, so a redelivered request cannot rewrite a supporter's
 * words.
 */
export async function saveDonationDetails(input: {
  sessionId: string;
  name: string | null;
  message: string | null;
}): Promise<void> {
  await libsqlClient.execute({
    sql: `INSERT INTO donation_details (session_id, name, message, created_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT (session_id) DO NOTHING`,
    args: [input.sessionId, input.name, input.message, Date.now()],
  });
}

/** One row of the dashboard's recent list, with the supporter's details. */
export interface RecentDonation {
  amount: number;
  currency: string;
  createdAt: number;
  email: string | null;
  name: string | null;
  message: string | null;
}

/**
 * Newest first over the site's donations. The supporter's name and message
 * live in their own table and can be missing entirely, so the join is
 * optional.
 */
export async function listDonations(input: {
  siteId: string;
  limit: number;
  offset: number;
}): Promise<RecentDonation[]> {
  const result = await libsqlClient.execute({
    sql: `SELECT d.amount, d.currency, d.created_at, d.email,
                 det.name, det.message
          FROM donations d
          LEFT JOIN donation_details det ON det.session_id = d.session_id
          WHERE d.site_id = ?
          ORDER BY d.created_at DESC, d.id DESC
          LIMIT ? OFFSET ?`,
    args: [input.siteId, input.limit, input.offset],
  });
  return result.rows.map((raw) => {
    const row = raw as unknown as {
      amount: number;
      currency: string;
      created_at: number;
      email: string | null;
      name: string | null;
      message: string | null;
    };
    return {
      amount: row.amount,
      currency: row.currency,
      createdAt: row.created_at,
      email: row.email,
      name: row.name,
      message: row.message,
    };
  });
}

/**
 * What the creator kept over a period, in minor units. Rows captured before
 * net existed fall back to the gross minus our fee; Stripe's own cost is
 * missing from those. All time is `since: 0`.
 */
export async function earningsSum(siteId: string, since: number): Promise<number> {
  const result = await libsqlClient.execute({
    sql: `SELECT COALESCE(SUM(COALESCE(net, amount - application_fee)), 0) AS total
          FROM donations
          WHERE site_id = ? AND created_at >= ?`,
    args: [siteId, since],
  });
  const row = result.rows[0] as unknown as { total: number } | undefined;
  return typeof row?.total === "number" ? row.total : 0;
}

/**
 * What the creator kept per day, in minor units, oldest first, with a row only
 * for days that saw a donation. Same net fallback as `earningsSum`.
 */
export async function earningsByDay(input: {
  siteId: string;
  since: number;
  /** Exclusive, so back-to-back windows cannot both claim the same donation. */
  until?: number;
}): Promise<DailyEarnings[]> {
  const result = await libsqlClient.execute({
    sql: `SELECT CAST(created_at / ${DAY_MS} AS INTEGER) AS day,
                 COALESCE(SUM(COALESCE(net, amount - application_fee)), 0) AS net
          FROM donations
          WHERE site_id = ? AND created_at >= ? AND (? IS NULL OR created_at < ?)
          GROUP BY day
          ORDER BY day`,
    args: [input.siteId, input.since, input.until ?? null, input.until ?? null],
  });
  return result.rows.map((raw) => {
    const row = raw as unknown as { day: number; net: number };
    return { day: row.day, net: row.net };
  });
}
