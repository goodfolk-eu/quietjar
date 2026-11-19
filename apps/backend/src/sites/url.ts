import { listedSiteFor } from "../pay/origin";

/**
 * Stored as a bare origin: the widget can sit on any path of the site, and the
 * origin is all the payment routes compare against.
 */
export function normalizeSiteUrl(value: string | null): string | null {
  if (value === null || value.trim() === "") return null;
  const raw = value.trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.hostname === "" || !url.hostname.includes(".")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export const MAX_SITE_URLS = 10;

export type SiteUrlsResult = { ok: true; siteUrls: string[] } | { ok: false; invalidIndex: number };

/** Normalises each entry, skipping blanks and keeping the first of a www/apex pair. */
export function normalizeSiteUrls(values: string[]): SiteUrlsResult {
  const siteUrls: string[] = [];
  for (const [index, value] of values.entries()) {
    if (value.trim() === "") continue;
    const siteUrl = normalizeSiteUrl(value);
    if (siteUrl === null) return { ok: false, invalidIndex: index };
    if (listedSiteFor(siteUrl, siteUrls) === null) siteUrls.push(siteUrl);
  }
  return { ok: true, siteUrls };
}
