import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { parseCsv, toCsv } from "./csv";
import { loadDisposableDomains } from "./disposable";

type Reachability =
  | "ok"
  | "invalid-syntax"
  | "disposable"
  | "no-domain"
  | "no-mail-server"
  | "null-mx"
  | "dns-error";

const UNREACHABLE = new Set<Reachability>([
  "invalid-syntax",
  "disposable",
  "no-domain",
  "no-mail-server",
  "null-mx",
]);

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function errorCode(error: unknown): string {
  return (error as { code?: string }).code ?? "";
}

async function hasAddressRecord(domain: string): Promise<boolean> {
  const results = await Promise.allSettled([resolve4(domain), resolve6(domain)]);
  return results.some((result) => result.status === "fulfilled" && result.value.length > 0);
}

async function checkDomain(domain: string, attempt = 1): Promise<Reachability> {
  try {
    const records = await resolveMx(domain);
    // RFC 7505: a single MX of "." means the domain explicitly accepts no mail.
    if (records.length === 1 && records[0].exchange === "") return "null-mx";
    if (records.length > 0) return "ok";
  } catch (error) {
    const code = errorCode(error);
    if (code === "ENOTFOUND") return "no-domain";
    if (code !== "ENODATA") {
      if (attempt < 3) return checkDomain(domain, attempt + 1);
      return "dns-error";
    }
  }
  // RFC 5321: with no MX record, mail is delivered to the domain's A/AAAA record.
  return (await hasAddressRecord(domain)) ? "ok" : "no-mail-server";
}

async function checkDomains(domains: string[], concurrency = 50) {
  const results = new Map<string, Reachability>();
  let next = 0;
  const worker = async () => {
    while (next < domains.length) {
      const domain = domains[next++];
      results.set(domain, await checkDomain(domain));
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: bun scripts/outreach/check-reachability.ts <leads.csv> [more.csv ...]");
    process.exit(1);
  }

  const disposable = await loadDisposableDomains();
  const sheets = files.map((file) => ({ file, rows: parseCsv(readFileSync(file, "utf-8")) }));

  const domains = new Set<string>();
  for (const { rows } of sheets) {
    for (const row of rows) {
      const email = row.email.trim().toLowerCase();
      if (EMAIL.test(email)) domains.add(email.split("@")[1]);
    }
  }
  console.log(`Checking DNS for ${domains.size} domains...`);
  const domainResults = await checkDomains([...domains]);

  for (const { file, rows } of sheets) {
    const counts = new Map<Reachability, number>();
    const updated = rows.map((row) => {
      const email = row.email.trim().toLowerCase();
      const domain = email.split("@")[1];
      let reachability: Reachability;
      if (!EMAIL.test(email)) reachability = "invalid-syntax";
      else if (disposable.has(domain)) reachability = "disposable";
      else reachability = domainResults.get(domain) ?? "dns-error";
      counts.set(reachability, (counts.get(reachability) ?? 0) + 1);
      return { ...row, reachability };
    });
    writeFileSync(file, toCsv(updated));

    const unreachable = [...counts].reduce(
      (sum, [status, count]) => (UNREACHABLE.has(status) ? sum + count : sum),
      0,
    );
    console.log(`\n${file}: ${rows.length} rows, ${unreachable} unreachable`);
    for (const [status, count] of [...counts].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${status}: ${count}`);
    }
  }
}

await main();
