import type { SendMailOptions } from "nodemailer";
import { createTransport } from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * Build an SMTP config from environment variables. See ".env.example".
 * Returns undefined when SMTP is not configured — callers can then fall
 * back to logging the OTP (handy for local development without a mail server).
 */
export function smtpFromEnv(): SmtpConfig | undefined {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return undefined;
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: (process.env.SMTP_SECURE ?? "false") === "true",
    user: user ?? "",
    pass: pass ?? "",
    from,
  };
}

const config = smtpFromEnv();

const transport = config
  ? createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    })
  : null;

/** Send an email. Async-returns once nodemailer has accepted delivery. */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!transport || !config) {
    // No SMTP configured — surface the email so local testing still works.
    console.warn(
      `[email:SMTP-not-configured] To: ${to} | Subject: ${subject} | Body: ${html.replace(/<[^>]*>/g, " ")}`,
    );
    return;
  }
  const mail: SendMailOptions = {
    from: config.from,
    to,
    subject,
    html,
  };
  await transport.sendMail(mail);
}
