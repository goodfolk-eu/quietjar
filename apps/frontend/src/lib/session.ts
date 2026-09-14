/**
 * Client-side auth state helpers. The homepage decides which button to show
 * from the presence of a readable marker cookie set by the backend on
 * sign-in. The real httpOnly session token stays invisible to JS; this is a
 * UI hint only, validated server-side on the dashboard.
 */
const AUTH_MARKER = "qj_auth_marker";

export function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${AUTH_MARKER}=`));
}

/**
 * Drops the marker so a stale one cannot keep offering a dashboard the
 * session can no longer open. The backend scopes the cookie to the frontend's
 * parent domain over https and leaves it host-only in local dev, and a cookie
 * only expires against a matching Domain, so both forms are cleared.
 */
export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  const expired = `${AUTH_MARKER}=; Max-Age=0; path=/`;
  // biome-ignore-start lint/suspicious/noDocumentCookie: the Cookie Store API it suggests is Chromium-only, and Safari is a first-class target here.
  document.cookie = expired;
  document.cookie = `${expired}; domain=${location.hostname}`;
  // biome-ignore-end lint/suspicious/noDocumentCookie: see above
}

const SITE_KEY = "qj_site_key";

/** The public site key rides in localStorage so public pages can fill it into the embed snippet without an API call. */
export function rememberSiteKey(key: string): void {
  if (typeof localStorage === "undefined" || key === "") return;
  localStorage.setItem(SITE_KEY, key);
}

export function readSiteKey(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(SITE_KEY) ?? "";
}

const listeners = new Set<(signedIn: boolean) => void>();

export function onAuthStateChange(listener: (signedIn: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitAuthStateChange(signedIn: boolean): void {
  for (const l of listeners) {
    l(signedIn);
  }
}
