import { libsqlClient } from "../db";
import { handleVariant, suggestHandle } from "./handle";

export interface HostedPage {
  siteId: string;
  handle: string;
  displayName: string;
  title: string | null;
  description: string | null;
  avatarKey: string | null;
  coverKey: string | null;
  /** Null means the page uses the default accent colour. */
  color: string | null;
  goalId: string | null;
}

interface Row {
  site_id: string;
  handle: string;
  display_name: string;
  title: string | null;
  description: string | null;
  avatar_key: string | null;
  cover_key: string | null;
  color: string | null;
  goal_id: string | null;
}

function toHostedPage(row: Row): HostedPage {
  return {
    siteId: row.site_id,
    handle: row.handle,
    displayName: row.display_name,
    title: row.title,
    description: row.description,
    avatarKey: row.avatar_key,
    coverKey: row.cover_key,
    color: row.color,
    goalId: row.goal_id,
  };
}

export async function getHostedPageBySiteId(siteId: string): Promise<HostedPage | null> {
  const result = await libsqlClient.execute({
    sql: "SELECT * FROM hosted_pages WHERE site_id = ?",
    args: [siteId],
  });
  return result.rows.length > 0 ? toHostedPage(result.rows[0] as unknown as Row) : null;
}

export async function getHostedPageByHandle(handle: string): Promise<HostedPage | null> {
  const result = await libsqlClient.execute({
    sql: "SELECT * FROM hosted_pages WHERE handle = ?",
    args: [handle],
  });
  return result.rows.length > 0 ? toHostedPage(result.rows[0] as unknown as Row) : null;
}

/**
 * Email OTP sign-up names the account after the email's local part, so that
 * is also the fallback when a session carries no name at all.
 */
export function defaultDisplayName(user: { name?: string | null; email: string }): string {
  const name = user.name?.trim();
  if (name) return name;
  return user.email.split("@")[0] ?? user.email;
}

/** Tries each variant of the suggestion until one is free. */
const MAX_HANDLE_ATTEMPTS = 50;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}

/**
 * Every site gets a page without the creator doing anything, so the badge has
 * somewhere to point from the first visit. The handle is suggested from the
 * account name and bumped with a numeric suffix until the insert stops
 * colliding; letting the unique index decide keeps two concurrent signups from
 * both claiming the same free handle.
 */
export async function ensureHostedPage(siteId: string, displayName: string): Promise<HostedPage> {
  const existing = await getHostedPageBySiteId(siteId);
  if (existing) return existing;

  const suggestion = suggestHandle(displayName);
  const now = Date.now();
  for (let attempt = 0; attempt < MAX_HANDLE_ATTEMPTS; attempt += 1) {
    const handle = attempt === 0 ? suggestion : handleVariant(suggestion, attempt);
    try {
      await libsqlClient.execute({
        sql: `INSERT INTO hosted_pages (site_id, handle, display_name, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [siteId, handle, displayName, now, now],
      });
      return {
        siteId,
        handle,
        displayName,
        title: null,
        description: null,
        avatarKey: null,
        coverKey: null,
        color: null,
        goalId: null,
      };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // The site itself may have won a race with another request.
      const raced = await getHostedPageBySiteId(siteId);
      if (raced) return raced;
    }
  }
  throw new Error("could not find a free handle");
}

export interface HostedPageUpdate {
  handle: string;
  displayName: string;
  title: string | null;
  description: string | null;
  color: string | null;
  goalId: string | null;
}

/** False when the handle was taken by someone else in the meantime. */
export async function updateHostedPage(siteId: string, input: HostedPageUpdate): Promise<boolean> {
  try {
    await libsqlClient.execute({
      sql: `UPDATE hosted_pages
              SET handle = ?, display_name = ?, title = ?, description = ?, color = ?, goal_id = ?,
                  updated_at = ?
            WHERE site_id = ?`,
      args: [
        input.handle,
        input.displayName,
        input.title,
        input.description,
        input.color,
        input.goalId,
        Date.now(),
        siteId,
      ],
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

export type ImageKind = "avatar" | "cover";

export async function setHostedPageImage(
  siteId: string,
  kind: ImageKind,
  key: string | null,
): Promise<void> {
  const column = kind === "avatar" ? "avatar_key" : "cover_key";
  await libsqlClient.execute({
    sql: `UPDATE hosted_pages SET ${column} = ?, updated_at = ? WHERE site_id = ?`,
    args: [key, Date.now(), siteId],
  });
}
