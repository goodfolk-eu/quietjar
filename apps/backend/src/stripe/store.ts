import { randomUUID } from "node:crypto";
import { libsqlClient } from "../db";
import type { OnboardingStatus } from "./status";

export interface StripeConnection {
  id: string;
  userId: string;
  accountId: string;
  onboarding: OnboardingStatus | null;
}

interface Row {
  id: string;
  user_id: string;
  account_id: string;
  onboarding: string | null;
}

function toConnection(row: Row): StripeConnection {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    onboarding: row.onboarding ? (JSON.parse(row.onboarding) as OnboardingStatus) : null,
  };
}

export async function getConnectionByUserId(userId: string): Promise<StripeConnection | null> {
  const result = await libsqlClient.execute({
    sql: "SELECT * FROM stripe_connections WHERE user_id = ?",
    args: [userId],
  });
  return result.rows.length > 0 ? toConnection(result.rows[0] as unknown as Row) : null;
}

export async function getConnectionByAccountId(
  accountId: string,
): Promise<StripeConnection | null> {
  const result = await libsqlClient.execute({
    sql: "SELECT * FROM stripe_connections WHERE account_id = ?",
    args: [accountId],
  });
  return result.rows.length > 0 ? toConnection(result.rows[0] as unknown as Row) : null;
}

export async function createConnection(input: {
  userId: string;
  accountId: string;
}): Promise<void> {
  const now = Date.now();
  await libsqlClient.execute({
    sql: `INSERT INTO stripe_connections
            (id, user_id, account_id, onboarding, created_at, updated_at)
          VALUES (?, ?, ?, NULL, ?, ?)`,
    args: [randomUUID(), input.userId, input.accountId, now, now],
  });
}

export async function saveOnboarding(
  accountId: string,
  onboarding: OnboardingStatus,
): Promise<void> {
  await libsqlClient.execute({
    sql: "UPDATE stripe_connections SET onboarding = ?, updated_at = ? WHERE account_id = ?",
    args: [JSON.stringify(onboarding), Date.now(), accountId],
  });
}

export async function deleteConnection(userId: string): Promise<void> {
  await libsqlClient.execute({
    sql: "DELETE FROM stripe_connections WHERE user_id = ?",
    args: [userId],
  });
}
