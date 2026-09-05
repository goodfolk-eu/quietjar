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
    application_fee INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
];

export async function ensureSchema(): Promise<void> {
  for (const statement of MIGRATIONS) {
    await libsqlClient.execute(statement);
  }
}
