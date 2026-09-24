export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;

const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Used when nothing usable can be derived from the account's name. */
const FALLBACK_HANDLE = "creator";

/**
 * Words a creator could use to pass their page off as ours, plus the names of
 * routes that exist or plausibly will. The page lives under `/@`, so none of
 * these can shadow a route today; the list keeps that true if the prefix ever
 * goes away.
 */
const RESERVED_HANDLES = new Set([
  "about",
  "account",
  "admin",
  "administrator",
  "api",
  "app",
  "billing",
  "blog",
  "compare",
  "contact",
  "dashboard",
  "developers",
  "docs",
  "en",
  "features",
  "goals",
  "help",
  "hosted",
  "js",
  "legal",
  "login",
  "logout",
  "mail",
  "official",
  "payout",
  "pricing",
  "privacy",
  "profile",
  "quietjar",
  "root",
  "security",
  "settings",
  "signin",
  "signup",
  "staff",
  "status",
  "stripe",
  "support",
  "system",
  "team",
  "terms",
  "widget",
  "www",
]);

export type HandleProblem = "invalid" | "reserved";

/** Null when the handle can be used, as far as its spelling goes. */
export function handleProblem(handle: string): HandleProblem | null {
  if (handle.length < HANDLE_MIN_LENGTH || handle.length > HANDLE_MAX_LENGTH) return "invalid";
  if (!HANDLE_PATTERN.test(handle)) return "invalid";
  if (RESERVED_HANDLES.has(handle)) return "reserved";
  return null;
}

export function normalizeHandle(value: string): string {
  return value.trim().toLowerCase();
}

/** A valid, unreserved handle derived from free text such as an account name. */
export function suggestHandle(source: string): string {
  const slug = source
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/-+$/, "");
  return handleProblem(slug) === null ? slug : FALLBACK_HANDLE;
}

/** The nth alternative for a taken handle, still inside the length limit. */
export function handleVariant(handle: string, attempt: number): string {
  const suffix = `-${attempt + 1}`;
  const base = handle.slice(0, HANDLE_MAX_LENGTH - suffix.length).replace(/-+$/, "");
  return `${base}${suffix}`;
}
