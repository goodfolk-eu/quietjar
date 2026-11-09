import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import nodemailer from "nodemailer";
import { parseCsv, type Row, toCsv } from "./csv";

const FROM = "Marcel Panse <marcel@quietjar.com>";
const REPLY_TO = "marcel@quietjar.com";
const UNSUBSCRIBE = "<mailto:marcel@quietjar.com?subject=unsubscribe>";
const TEMPLATES_DIR = join(import.meta.dir, "templates");

// Soverin allows 10 emails per 5 minutes, so keep --count at 10 or below per run.
const MIN_DELAY_MS = 2_000;
const MAX_DELAY_MS = 5_000;
const BATCH_COOLDOWN_MS = 6 * 60_000;

type Email = { subject: string; text: string };

function usage(): never {
  console.error(
    "Usage: bun scripts/outreach/send-batch.ts <leads.csv> [--count 10] [--dry-run] [--test you@example.com] [--where column=value] [--daily-limit 80] [--check]",
  );
  process.exit(1);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Set it in .env or the environment.`);
    process.exit(1);
  }
  return value;
}

function displayName(lead: Row): string {
  return lead.kind === "github" ? (lead.name.split("/")[1] ?? lead.name) : lead.name;
}

function templateName(lead: Row): string {
  return lead.kind === "github" ? `${lead.platform}-github` : lead.platform;
}

function render(lead: Row): Email {
  const name = templateName(lead);
  const template = readFileSync(join(TEMPLATES_DIR, `${name}.txt`), "utf-8");
  const filled = template.replaceAll("{{name}}", displayName(lead));
  const [subjectLine, ...body] = filled.split("\n");
  if (!subjectLine.startsWith("Subject: ")) {
    throw new Error(`Template ${name}.txt must start with "Subject: "`);
  }
  return { subject: subjectLine.slice("Subject: ".length), text: body.join("\n").trim() };
}

function matchesWhere(lead: Row, where: string | undefined): boolean {
  if (!where) return true;
  const [column, value] = where.split("=");
  return lead[column]?.toLowerCase() === value?.toLowerCase();
}

function sentTimes(leads: Row[]): Date[] {
  return leads
    .map((lead) => new Date(lead.sent_at))
    .filter((sentAt) => !Number.isNaN(sentAt.getTime()));
}

function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      count: { type: "string", default: "10" },
      "dry-run": { type: "boolean", default: false },
      test: { type: "string" },
      where: { type: "string" },
      "daily-limit": { type: "string" },
      check: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const [csvPath] = positionals;
  const count = Number(values.count);
  const dailyLimit = values["daily-limit"]
    ? Number(values["daily-limit"])
    : Number.POSITIVE_INFINITY;
  if (!csvPath || !Number.isInteger(count) || count < 1 || count > 10) usage();
  if (Number.isNaN(dailyLimit) || dailyLimit < 1) usage();

  const leads = parseCsv(readFileSync(csvPath, "utf-8")).map((lead) => ({
    ...lead,
    sent_at: lead.sent_at ?? "",
    template: lead.template ?? "",
  }));
  const pending = leads.filter((lead) => !lead.sent_at && matchesWhere(lead, values.where));
  const sent = sentTimes(leads);
  const today = new Date().toDateString();
  const remainingToday = Math.max(
    0,
    dailyLimit - sent.filter((sentAt) => sentAt.toDateString() === today).length,
  );
  const lastSentAt = Math.max(0, ...sent.map((sentAt) => sentAt.getTime()));
  const coolingDown = Date.now() - lastSentAt < BATCH_COOLDOWN_MS;
  const allowed = coolingDown ? 0 : Math.min(count, remainingToday);
  const batch = pending.slice(0, values.test ? 1 : allowed);

  if (values.check) {
    console.log(
      `${pending.length} pending leads, ${remainingToday} left in today's limit${coolingDown ? ", last batch under 6 minutes ago" : ""}.`,
    );
    process.exit(batch.length > 0 ? 0 : 1);
  }

  if (batch.length === 0) {
    if (pending.length === 0) console.log("No leads left to email.");
    else if (coolingDown) console.log("Last batch was under 6 minutes ago, nothing sent.");
    else console.log("Daily limit reached, nothing sent.");
    return;
  }

  if (values["dry-run"]) {
    for (const lead of batch) {
      const { subject, text } = render(lead);
      console.log(`To: ${lead.email}\nSubject: ${subject}\n\n${text}\n\n${"-".repeat(60)}`);
    }
    console.log(`Dry run: ${batch.length} of ${pending.length} pending leads, nothing sent.`);
    return;
  }

  const port = Number(process.env.OUTREACH_SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: requireEnv("OUTREACH_SMTP_HOST"),
    port,
    secure: port === 465,
    auth: { user: requireEnv("OUTREACH_SMTP_USER"), pass: requireEnv("OUTREACH_SMTP_PASS") },
  });
  await transport.verify();

  for (const [index, lead] of batch.entries()) {
    if (index > 0) await Bun.sleep(randomDelay());

    const { subject, text } = render(lead);
    const to = values.test ?? lead.email;
    try {
      await transport.sendMail({
        from: FROM,
        replyTo: REPLY_TO,
        to,
        subject,
        text,
        headers: { "List-Unsubscribe": UNSUBSCRIBE },
      });
    } catch (error) {
      console.error(`Failed to send to ${to}, stopping: ${error}`);
      process.exit(1);
    }

    if (values.test) {
      console.log(`Test email for ${lead.email} sent to ${to}. CSV not changed.`);
      return;
    }

    lead.sent_at = new Date().toISOString();
    lead.template = templateName(lead);
    writeFileSync(csvPath, toCsv(leads));
    console.log(`[${index + 1}/${batch.length}] Sent to ${lead.email} (${lead.name})`);
  }

  console.log(`Done. ${pending.length - batch.length} pending leads left.`);
}

await main();
