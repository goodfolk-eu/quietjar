import { escapeHtml } from "./html";

/** Where dashboard feedback lands. */
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@quietjar.com";

/** The form's visible limit; the modal shows the same number. */
export const MAX_FEEDBACK_LENGTH = 4000;

export interface FeedbackEmailInput {
  message: string;
  senderEmail: string;
  senderName: string | null;
  page: string | null;
}

/** A long message would push everything useful out of an inbox's subject column. */
const SUBJECT_LIMIT = 60;

function subjectLine(message: string): string {
  const single = message.replace(/\s+/g, " ").trim();
  if (single.length <= SUBJECT_LIMIT) return single;
  return `${single.slice(0, SUBJECT_LIMIT).trimEnd()}…`;
}

/**
 * The support notification for one piece of dashboard feedback. Reply-to is
 * not a TEM field we set, so the sender's address is in the body where
 * whoever picks it up can see and copy it.
 */
export function feedbackEmail(input: FeedbackEmailInput): { subject: string; html: string } {
  const sender = input.senderName
    ? `${input.senderName} <${input.senderEmail}>`
    : input.senderEmail;

  const lines: string[] = [
    `<p style="margin:0;font-size:20px;font-weight:600;color:#003399">Dashboard feedback</p>`,
    `<p style="margin:16px 0 0;font-size:15px;color:#374151">From <a href="mailto:${encodeURI(input.senderEmail)}" style="color:#003399">${escapeHtml(sender)}</a></p>`,
  ];

  if (input.page) {
    lines.push(
      `<p style="margin:4px 0 0;font-size:13px;color:#6B7280">Sent from ${escapeHtml(input.page)}</p>`,
    );
  }

  lines.push(
    `<blockquote style="margin:24px 0 0;padding:0 0 0 16px;border-left:3px solid #7FD9B3;font-size:15px;color:#111827;white-space:pre-wrap">${escapeHtml(input.message)}</blockquote>`,
  );

  return {
    subject: `Feedback: ${subjectLine(input.message)}`,
    html: `<div style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.5;color:#111827">${lines.join("")}</div>`,
  };
}
