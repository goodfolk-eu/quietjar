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
