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
