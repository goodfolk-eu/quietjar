/**
 * The site key travels in public HTML, so the origin the request comes from is
 * the only thing tying a session back to the creator who owns the account.
 */
export interface OriginPolicy {
  /** Allow localhost callers, so the widget dev server can take payments. */
  allowLocalhost: boolean;
  /**
   * Dashboard origin, allowed for every site so a creator can try the widget
   * out from the editor's preview. Safe to trust for any site key: a browser
   * sets Origin itself, so this only lets in pages the dashboard serves.
   */
  dashboardOrigin?: string | null;
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** The registered origin plus its www/apex twin, which visitors reach interchangeably. */
export function allowedOrigins(siteUrl: string | null): string[] {
  if (!siteUrl) return [];
  const url = parseOrigin(siteUrl);
  if (!url) return [];

  const twin = url.hostname.startsWith("www.") ? url.hostname.slice(4) : `www.${url.hostname}`;
  const port = url.port === "" ? "" : `:${url.port}`;
  return [`${url.protocol}//${url.hostname}${port}`, `${url.protocol}//${twin}${port}`];
}

export function isAllowedOrigin(
  origin: string | null,
  siteUrl: string | null,
  policy: OriginPolicy,
): boolean {
  if (!origin) return false;
  const url = parseOrigin(origin);
  if (!url) return false;
  if (policy.allowLocalhost && LOCAL_HOSTNAMES.has(url.hostname)) return true;
  if (policy.dashboardOrigin) {
    const dashboard = parseOrigin(policy.dashboardOrigin);
    if (dashboard && dashboard.origin === url.origin) return true;
  }
  return allowedOrigins(siteUrl).includes(url.origin);
}

/**
 * Where Stripe sends the supporter after a redirect payment method. It has to
 * be the page the widget is on, and that page has to belong to the site.
 */
export function isAllowedReturnUrl(
  returnUrl: string,
  siteUrl: string | null,
  policy: OriginPolicy,
): boolean {
  const url = parseOrigin(returnUrl);
  if (!url) return false;
  return isAllowedOrigin(url.origin, siteUrl, policy);
}
