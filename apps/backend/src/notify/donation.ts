import { auth } from "../auth";
import { sendEmail } from "../email";
import { claimDonationNotice, listPendingNotifications } from "../pay/store";
import { formatMoney } from "../sites/currency";

/**
 * How long a donation is left alone before it is announced. The supporter's
 * name and message arrive from the thank-you step after the payment, so a
 * shorter wait would buy the creator a faster email with less in it.
 */
const GRACE_MS = 5 * 60 * 1000;

/** Enough that a quiet outage drains in one pass, small enough to stay cheap. */
const BATCH_SIZE = 200;

/** A long name would push everything useful out of an inbox's subject column. */
const SUBJECT_NAME_LIMIT = 40;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** The name and message are supporter-supplied, so nothing reaches the body raw. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function frontendOrigin(): string {
  return process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";
}

/** Empty and whitespace-only both mean the supporter left this out. */
function present(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Supporters type their own name, so it is tidied once here and used
 * everywhere. Only the first letter is raised: a name is not ours to restyle
 * beyond making "dan wrote:" not read as a typo. Flattening the whitespace
 * also keeps newlines out of the mail subject, where they would be a header
 * injection.
 */
function normalizeName(name: string | null): string | null {
  const clean = present(name)?.replace(/\s+/g, " ") ?? null;
  if (clean === null) return null;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** A long name would push everything useful out of an inbox's subject column. */
function subjectName(name: string): string {
  if (name.length <= SUBJECT_NAME_LIMIT) return name;
  return `${name.slice(0, SUBJECT_NAME_LIMIT).trimEnd()}…`;
}

export interface DonationEmailInput {
  amount: number;
  currency: string;
  name: string | null;
  message: string | null;
}

/**
 * The creator's notification for a single donation. Plain, quiet, and legible
 * with images blocked: the wordmark carries alt text because most mail clients
 * do not load remote images until asked.
 */
export function donationEmail(input: DonationEmailInput): { subject: string; html: string } {
  const name = normalizeName(input.name);
  const message = present(input.message);
  const amount = formatMoney(input.amount, input.currency);

  const origin = frontendOrigin();
  // The backend has no notion of a user's locale, so the dashboard links are
  // pinned to "en" the same way the Stripe onboarding returns are.
  const dashboardUrl = `${origin}/en/dashboard/`;
  const profileUrl = `${origin}/en/dashboard/profile/`;

  const lines: string[] = [
    `<img src="${origin}/brand/lockup-blue-green-2x.png" alt="quietjar" width="197" height="63" style="display:block;border:0;margin:0 0 32px" />`,
    `<p style="margin:0;font-size:24px;font-weight:600;color:#003399">${escapeHtml(amount)} received</p>`,
  ];

  if (name && message) {
    lines.push(
      `<p style="margin:24px 0 8px;font-size:15px;color:#374151">${escapeHtml(name)} wrote:</p>`,
      `<blockquote style="margin:0;padding:0 0 0 16px;border-left:3px solid #7FD9B3;font-size:15px;color:#111827">${escapeHtml(message)}</blockquote>`,
    );
  } else if (name) {
    lines.push(
      `<p style="margin:24px 0 0;font-size:15px;color:#374151">From ${escapeHtml(name)}.</p>`,
    );
  } else if (message) {
    lines.push(
      `<p style="margin:24px 0 8px;font-size:15px;color:#374151">Your supporter wrote:</p>`,
      `<blockquote style="margin:0;padding:0 0 0 16px;border-left:3px solid #7FD9B3;font-size:15px;color:#111827">${escapeHtml(message)}</blockquote>`,
    );
  }

  lines.push(
    `<p style="margin:32px 0 0;font-size:15px"><a href="${dashboardUrl}" style="color:#003399">See it in your dashboard</a></p>`,
    `<p style="margin:40px 0 0;font-size:13px;color:#6B7280">You get this because donation emails are on. <a href="${profileUrl}" style="color:#6B7280">Turn them off in your profile</a>.</p>`,
  );

  return {
    subject: name ? `${subjectName(name)} became a supporter` : "Someone became a supporter",
    html: `<div style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.5;color:#111827">${lines.join("")}</div>`,
  };
}

interface Creator {
  email: string;
  notifyOnDonation: boolean;
}

/**
 * Accounts created before the setting existed read back null, and the feature
 * is on by default, so anything other than an explicit false is on.
 */
async function creator(userId: string): Promise<Creator | null> {
  const context = await auth.$context;
  const user = (await context.internalAdapter.findUserById(userId)) as {
    email?: unknown;
    notifyOnDonation?: unknown;
  } | null;
  if (typeof user?.email !== "string" || user.email === "") return null;
  return { email: user.email, notifyOnDonation: user.notifyOnDonation !== false };
}

/** A busy creator holds several donations in one batch, and one account. */
function creatorCache(): (userId: string) => Promise<Creator | null> {
  const known = new Map<string, Creator | null>();
  return async (userId) => {
    const cached = known.get(userId);
    if (cached !== undefined) return cached;
    const found = await creator(userId);
    known.set(userId, found);
    return found;
  };
}

/**
 * Emails every creator whose donations have not been announced yet. Runs on a
 * schedule rather than off the payment webhook: a mail failure must never
 * reach the payment, and the supporter's message is not written yet when the
 * webhook arrives.
 *
 * Each donation is claimed before it is sent, and stays claimed either way.
 * A donation therefore produces one email or none, never two, and a creator
 * who switches the setting back on is not sent a backlog of old donations.
 */
export async function sendPendingDonationEmails(now = Date.now()): Promise<void> {
  const pending = await listPendingNotifications({
    before: now - GRACE_MS,
    limit: BATCH_SIZE,
  });

  const creatorOf = creatorCache();

  for (const donation of pending) {
    if (!(await claimDonationNotice(donation.sessionId, now))) continue;
    try {
      const owner = await creatorOf(donation.userId);
      if (!owner?.notifyOnDonation) continue;
      const { subject, html } = donationEmail(donation);
      await sendEmail(owner.email, subject, html);
    } catch (err) {
      // Claimed and failed is the end of it: a retry risks a second email for
      // a send that landed but could not be confirmed.
      console.error(`[notify/donation] send failed for ${donation.sessionId}:`, err);
    }
  }
}
