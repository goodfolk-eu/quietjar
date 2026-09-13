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
