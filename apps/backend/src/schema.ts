import { libsqlClient } from "./db";

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS stripe_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    account_id TEXT NOT NULL UNIQUE,
    onboarding TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL UNIQUE,
    currency TEXT NOT NULL,
    site_url TEXT,
    country TEXT,
    entity_type TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    payment_intent_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    application_fee INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target INTEGER NOT NULL,
    period TEXT NOT NULL,
    archived_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS donation_details (
    session_id TEXT PRIMARY KEY,
    name TEXT,
    message TEXT,
    created_at INTEGER NOT NULL
  )`,
];

/**
 * SQLite has no ADD COLUMN IF NOT EXISTS, so the "duplicate column name"
 * failure is what a re-run looks like and is treated as success.
 */
const COLUMN_MIGRATIONS = [
  { table: "donations", name: "email", type: "TEXT" },
  { table: "donations", name: "net", type: "INTEGER" },
  { table: "donations", name: "goal_id", type: "TEXT" },
  { table: "donations", name: "notified_at", type: "INTEGER" },
] as const;

/**
 * better-auth 1.7.0 through 1.7.2 created `account.issuer` as NOT NULL behind a
 * unique index, and 1.7.3 stopped writing it: accounts are matched on
 * `providerId` and `accountId` again, so any insert would now fail the
 * constraint. The upgrade guide's fix is to drop the index and then the
 * column, in that order. Both statements are no-ops once applied.
 *
 * https://www.better-auth.com/docs/guides/1-7-upgrade-guide
 */
async function dropBetterAuthIssuer(): Promise<void> {
  await libsqlClient.execute("DROP INDEX IF EXISTS account_issuer_accountId_uidx");
  try {
    await libsqlClient.execute("ALTER TABLE account DROP COLUMN issuer");
  } catch (err) {
    if (!(err instanceof Error && /no such (column|table)/i.test(err.message))) throw err;
  }
}

export async function ensureSchema(): Promise<void> {
  for (const statement of MIGRATIONS) {
    await libsqlClient.execute(statement);
  }
  for (const { table, name, type } of COLUMN_MIGRATIONS) {
    try {
      await libsqlClient.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    } catch (err) {
      if (!(err instanceof Error && /duplicate column name/i.test(err.message))) throw err;
    }
  }
  await dropBetterAuthIssuer();
}
