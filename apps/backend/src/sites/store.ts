import { randomBytes, randomUUID } from "node:crypto";
import { libsqlClient } from "../db";
import type { Country, Currency } from "./currency";

export type EntityType = "individual" | "company";

export interface Site {
  id: string;
  userId: string;
  publicKey: string;
  currency: Currency;
  siteUrl: string | null;
  /** Null until the creator picks one; frozen on the Stripe account after that. */
  country: Country | null;
  entityType: EntityType | null;
}

interface Row {
  id: string;
  user_id: string;
  public_key: string;
  currency: string;
  site_url: string | null;
  country: string | null;
  entity_type: string | null;
}

function toSite(row: Row): Site {
  return {
    id: row.id,
    userId: row.user_id,
    publicKey: row.public_key,
    currency: row.currency as Currency,
    siteUrl: row.site_url,
    country: (row.country as Country | null) ?? null,
    entityType: (row.entity_type as EntityType | null) ?? null,
  };
}

/**
 * The key is pasted into public HTML, so it carries no meaning: it only has to
 * be unguessable and recognisable in a support conversation.
 */
function newPublicKey(): string {
  return `qj_${randomBytes(12).toString("hex")}`;
}

export async function getSiteByUserId(userId: string): Promise<Site | null> {
  const result = await libsqlClient.execute({
    sql: "SELECT * FROM sites WHERE user_id = ?",
    args: [userId],
  });
  return result.rows.length > 0 ? toSite(result.rows[0] as unknown as Row) : null;
}

export async function getSiteByPublicKey(publicKey: string): Promise<Site | null> {
  const result = await libsqlClient.execute({
    sql: "SELECT * FROM sites WHERE public_key = ?",
    args: [publicKey],
  });
  return result.rows.length > 0 ? toSite(result.rows[0] as unknown as Row) : null;
}

export async function createSite(input: { userId: string; currency: Currency }): Promise<Site> {
  const now = Date.now();
  const site: Site = {
    id: randomUUID(),
    userId: input.userId,
    publicKey: newPublicKey(),
    currency: input.currency,
    siteUrl: null,
    country: null,
    entityType: null,
  };
  await libsqlClient.execute({
    sql: `INSERT INTO sites
            (id, user_id, public_key, currency, site_url, country, entity_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
    args: [site.id, site.userId, site.publicKey, site.currency, now, now],
  });
  return site;
}

export interface SiteUpdate {
  currency: Currency;
  siteUrl: string | null;
  country: Country | null;
  entityType: EntityType | null;
}

export async function updateSite(userId: string, input: SiteUpdate): Promise<void> {
  await libsqlClient.execute({
    sql: `UPDATE sites
            SET currency = ?, site_url = ?, country = ?, entity_type = ?, updated_at = ?
          WHERE user_id = ?`,
    args: [input.currency, input.siteUrl, input.country, input.entityType, Date.now(), userId],
  });
}
