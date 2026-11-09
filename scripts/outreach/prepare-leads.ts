import { resolveMx } from "node:dns/promises";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, type Row, toCsv } from "./csv";
import { loadDisposableDomains } from "./disposable";

type Lead = {
  email: string;
  tier: number;
  platform: "bmac" | "kofi";
  kind: "page" | "github";
  name: string;
  url: string;
  description: string;
  stars: number;
  lastPush: string;
  country: string;
  language: string;
  eu: boolean;
};

type RawLead = Omit<Lead, "email"> & { candidates: string[] };

const TIER_LABELS: Record<number, string> = {
  1: "page, business address",
  2: "github, pushed in the last 12 months",
  3: "page, free mail address",
  4: "github, inactive",
};

const VERIFY_TIERS = new Set([1, 2, 3]);

const EU = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

const FREE_MAIL =
  /^(gmail|googlemail|outlook|hotmail|live|msn|yahoo|ymail|icloud|me|mac|aol|proton|protonmail|pm|passmail|duck|gmx|web|t-online|posteo|mail|email|yandex|qq|163|126|foxmail|naver|daum|seznam|wp|o2|onet|interia|libero|virgilio|free|orange|laposte|sfr|wanadoo|btinternet|zoho|tutanota|tuta|hey|fastmail|rocketmail|inbox)\.[a-z.]+$/;

const PLACEHOLDER_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "domain.com",
  "email.com",
  "yourdomain.com",
  "mydomain.com",
  "test.com",
  "sentry.io",
  "wixpress.com",
  "sentry.wixpress.com",
  "sentry-next.wixpress.com",
  "users.noreply.github.com",
  "correo.com",
]);

const PLACEHOLDER_LOCAL_PARTS =
  /^(you|your|yourname|youremail|your\.?email|tu|tuemail|name|username|firstname|lastname|john\.?doe|jane\.?doe)$/;

const BLOCKED_LOCAL_PARTS =
  /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|abuse|security|privacy|legal|dmca|bounce[s]?|root)$/;

const FILE_EXTENSION_TLD = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js)$/;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function extractEmails(...values: string[]): string[] {
  return values.flatMap((value) => value.match(EMAIL) ?? []).map((email) => email.toLowerCase());
}

function isUsable(email: string, disposable: Set<string>): boolean {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return false;
  if (BLOCKED_LOCAL_PARTS.test(localPart) || PLACEHOLDER_LOCAL_PARTS.test(localPart)) return false;
  if (FILE_EXTENSION_TLD.test(domain)) return false;
  if (PLACEHOLDER_DOMAINS.has(domain) || domain.endsWith(".noreply.github.com")) return false;
  return !disposable.has(domain);
}

function domainOf(email: string): string {
  return email.split("@")[1];
}

function leadsFromGithub(rows: Row[], platform: Lead["platform"], activeSince: string): RawLead[] {
  return rows.flatMap((row): RawLead[] => {
    const candidates = extractEmails(row.owner_public_email, row.readme_emails);
    if (candidates.length === 0 || row.archived === "True") return [];
    const active = row.last_push >= activeSince;
    return [
      {
        candidates,
        tier: active ? 2 : 4,
        platform,
        kind: "github",
        name: row.repo,
        url: `https://github.com/${row.repo}`,
        description: row.description,
        stars: Number(row.stars) || 0,
        lastPush: row.last_push,
        country: row.country,
        language: row.human_language,
        eu: EU.has(row.country),
      },
    ];
  });
}

function leadsFromPages(rows: Row[], platform: Lead["platform"]): RawLead[] {
  return rows.flatMap((row): RawLead[] => {
    const candidates = extractEmails(row.email);
    if (candidates.length === 0) return [];
    return [
      {
        candidates,
        tier: 0,
        platform,
        kind: "page",
        name: new URL(row.page).hostname.replace(/^www\./, ""),
        url: row.page,
        description: "",
        stars: 0,
        lastPush: "",
        country: row.country,
        language: row.language,
        eu: EU.has(row.country),
      },
    ];
  });
}

function tierFor(lead: RawLead, email: string): number {
  if (lead.kind === "github") return lead.tier;
  return FREE_MAIL.test(domainOf(email)) ? 3 : 1;
}

function compareLeads(a: Lead, b: Lead): number {
  return a.tier - b.tier || Number(b.eu) - Number(a.eu) || b.stars - a.stars;
}

async function domainsWithMx(domains: string[], concurrency = 50): Promise<Set<string>> {
  const valid = new Set<string>();
  let next = 0;
  const worker = async () => {
    while (next < domains.length) {
      const domain = domains[next++];
      try {
        const records = await resolveMx(domain);
        if (records.length > 0) valid.add(domain);
      } catch {
        // NXDOMAIN or no MX record: the address cannot receive mail.
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return valid;
}

async function main() {
  const [inputDir, outputDir] = process.argv.slice(2);
  if (!inputDir || !outputDir) {
    console.error("Usage: bun scripts/outreach/prepare-leads.ts <input-dir> <output-dir>");
    process.exit(1);
  }

  const existing = ["leads-to-verify.csv", "leads-backlog.csv"].filter((file) =>
    existsSync(join(outputDir, file)),
  );
  if (existing.length > 0) {
    console.error(`Refusing to overwrite ${existing.join(", ")}: they may contain sent_at marks.`);
    process.exit(1);
  }

  const disposable = await loadDisposableDomains();
  const activeSince = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const raw: RawLead[] = readdirSync(inputDir)
    .filter((file) => file.endsWith(".csv"))
    .flatMap((file) => {
      const rows = parseCsv(readFileSync(join(inputDir, file), "utf-8"));
      const platform = file.startsWith("kofi") ? "kofi" : "bmac";
      return file.includes("github")
        ? leadsFromGithub(rows, platform, activeSince)
        : leadsFromPages(rows, platform);
    });

  const byEmail = new Map<string, Lead>();
  for (const { candidates, ...lead } of raw) {
    const email = candidates.find((candidate) => isUsable(candidate, disposable));
    if (!email) continue;
    const candidate: Lead = { ...lead, email, tier: tierFor(lead, email) };
    const existing = byEmail.get(email);
    if (!existing || compareLeads(candidate, existing) < 0) byEmail.set(email, candidate);
  }

  const domains = [...new Set([...byEmail.keys()].map(domainOf))];
  console.log(`Checking MX records for ${domains.length} domains...`);
  const mailDomains = await domainsWithMx(domains);

  const leads = [...byEmail.values()]
    .filter((lead) => mailDomains.has(domainOf(lead.email)))
    .sort(compareLeads);

  const toRow = (lead: Lead) => ({
    email: lead.email,
    tier: lead.tier,
    platform: lead.platform,
    kind: lead.kind,
    name: lead.name,
    url: lead.url,
    description: lead.description,
    stars: lead.stars,
    last_push: lead.lastPush,
    country: lead.country,
    language: lead.language,
    eu: lead.eu ? "yes" : "",
  });

  const toVerify = leads.filter((lead) => VERIFY_TIERS.has(lead.tier));
  const backlog = leads.filter((lead) => !VERIFY_TIERS.has(lead.tier));
  writeFileSync(join(outputDir, "leads-to-verify.csv"), toCsv(toVerify.map(toRow)));
  writeFileSync(join(outputDir, "leads-backlog.csv"), toCsv(backlog.map(toRow)));

  console.log(`\nUnique usable emails: ${byEmail.size}`);
  console.log(`Dropped for missing MX record: ${byEmail.size - leads.length}`);
  for (const [tier, label] of Object.entries(TIER_LABELS)) {
    const inTier = leads.filter((lead) => lead.tier === Number(tier));
    const eu = inTier.filter((lead) => lead.eu).length;
    console.log(`Tier ${tier} (${label}): ${inTier.length} (EU: ${eu})`);
  }
  console.log(`\nleads-to-verify.csv: ${toVerify.length}`);
  console.log(`leads-backlog.csv: ${backlog.length}`);
}

await main();
