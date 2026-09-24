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
  /** What Stripe told us it took. Null when the charge could not be read. */
  applicationFee: number | null;
  /** Comes from the payment, so the supporter is never asked for it again. */
  email: string | null;
  /** What the creator kept. Null on rows written before it was captured. */
  net: number | null;
  /** Goal the donation counts toward, or null when the widget named none. */
  goalId: string | null;
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
  application_fee: number | null;
  email: string | null;
  net: number | null;
  goal_id: string | null;
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
    goalId: row.goal_id,
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
  applicationFee: number | null;
  email: string | null;
  net: number | null;
  goalId: string | null;
}): Promise<void> {
  await libsqlClient.execute({
    sql: `INSERT INTO donations
            (id, site_id, account_id, session_id, payment_intent_id,
             amount, currency, application_fee, email, net, goal_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      input.goalId,
      Date.now(),
    ],
  });
}

/** A donation still waiting on its settled figures from Stripe. */
export interface UnsettledDonation {
  sessionId: string;
  accountId: string;
  paymentIntentId: string;
}

/**
 * Donations recorded before Stripe could say what they settled to. Only ones
 * with a payment intent qualify, since that is what the figures are read from.
 * Oldest first, so a backlog drains in arrival order.
 */
export async function listUnsettledDonations(input: {
  since: number;
  limit: number;
}): Promise<UnsettledDonation[]> {
  const result = await libsqlClient.execute({
    sql: `SELECT session_id, account_id, payment_intent_id
          FROM donations
          WHERE net IS NULL AND payment_intent_id IS NOT NULL AND created_at >= ?
          ORDER BY created_at, id
          LIMIT ?`,
    args: [input.since, input.limit],
  });
  return result.rows.map((raw) => {
    const row = raw as unknown as {
      session_id: string;
      account_id: string;
      payment_intent_id: string;
    };
    return {
      sessionId: row.session_id,
      accountId: row.account_id,
      paymentIntentId: row.payment_intent_id,
    };
  });
}

/** Only fills a gap: settled figures already on the row are never rewritten. */
export async function settleDonation(input: {
  sessionId: string;
  net: number;
  applicationFee: number | null;
}): Promise<void> {
  await libsqlClient.execute({
    sql: `UPDATE donations
            SET net = ?, application_fee = COALESCE(application_fee, ?)
          WHERE session_id = ? AND net IS NULL`,
    args: [input.net, input.applicationFee, input.sessionId],
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

/**
 * A donation that has not had its notification email sent yet, with
 * everything the email needs: the creator it belongs to, and the supporter's
 * own words when they left any.
 */
export interface PendingNotification {
  sessionId: string;
  userId: string;
  amount: number;
  currency: string;
  name: string | null;
  message: string | null;
}

/**
 * Donations still waiting for their notification email. `before` holds back
 * the ones just made: the supporter's name and message are typed on the
 * thank-you step after the payment, so a donation read too early would be
 * announced without the words the creator most wants to see.
 *
 * Oldest first, so a backlog drains in the order the donations arrived.
 */
export async function listPendingNotifications(input: {
  before: number;
  limit: number;
}): Promise<PendingNotification[]> {
  const result = await libsqlClient.execute({
    sql: `SELECT d.session_id, s.user_id, d.amount, d.currency,
                 det.name, det.message
          FROM donations d
          JOIN sites s ON s.id = d.site_id
          LEFT JOIN donation_details det ON det.session_id = d.session_id
          WHERE d.notified_at IS NULL AND d.created_at < ?
          ORDER BY d.created_at, d.id
          LIMIT ?`,
    args: [input.before, input.limit],
  });
  return result.rows.map((raw) => {
    const row = raw as unknown as {
      session_id: string;
      user_id: string;
      amount: number;
      currency: string;
      name: string | null;
      message: string | null;
    };
    return {
      sessionId: row.session_id,
      userId: row.user_id,
      amount: row.amount,
      currency: row.currency,
      name: row.name,
      message: row.message,
    };
  });
}

/**
 * Takes ownership of a donation's notification, returning false when someone
 * else already has it. This is what keeps one donation to one email: two
 * overlapping sweeps, or two containers, race on this single statement and
 * only one of them wins.
 */
export async function claimDonationNotice(sessionId: string, at: number): Promise<boolean> {
  const result = await libsqlClient.execute({
    sql: "UPDATE donations SET notified_at = ? WHERE session_id = ? AND notified_at IS NULL",
    args: [at, sessionId],
  });
  return result.rowsAffected === 1;
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
 * net existed fall back to the gross minus the fee. A row Stripe never told us
 * about has neither, and contributes nothing until `backfill-donation.ts` fills
 * it in. All time is `since: 0`.
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

/**
 * Gross donations attributed to a goal since a point in time, in minor units.
 * Gross rather than net: the meter promises supporters what they gave, not
 * what survived the fees.
 */
export async function goalRaised(goalId: string, since: number): Promise<number> {
  const result = await libsqlClient.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) AS total
          FROM donations
          WHERE goal_id = ? AND created_at >= ?`,
    args: [goalId, since],
  });
  const row = result.rows[0] as unknown as { total: number } | undefined;
  return typeof row?.total === "number" ? row.total : 0;
}

/** Both window totals a goal can need, so a list of goals costs one query. */
export interface GoalTotals {
  lifetime: number;
  month: number;
}

export async function raisedByGoal(
  goalIds: string[],
  monthStart: number,
): Promise<Map<string, GoalTotals>> {
  if (goalIds.length === 0) return new Map();
  const placeholders = goalIds.map(() => "?").join(", ");
  const result = await libsqlClient.execute({
    sql: `SELECT goal_id,
                 COALESCE(SUM(amount), 0) AS lifetime,
                 COALESCE(SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END), 0) AS month
          FROM donations
          WHERE goal_id IN (${placeholders})
          GROUP BY goal_id`,
    args: [monthStart, ...goalIds],
  });
  const totals = new Map<string, GoalTotals>();
  for (const raw of result.rows) {
    const row = raw as unknown as { goal_id: string; lifetime: number; month: number };
    totals.set(row.goal_id, { lifetime: row.lifetime, month: row.month });
  }
  return totals;
}
