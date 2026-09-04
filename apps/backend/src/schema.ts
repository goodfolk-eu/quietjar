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
];

export async function ensureSchema(): Promise<void> {
  for (const statement of MIGRATIONS) {
    await libsqlClient.execute(statement);
  }
}
