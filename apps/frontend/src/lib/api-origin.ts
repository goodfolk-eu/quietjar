/**
 * Frontend origin as the API base. In local dev the Astro server proxies
 * /api -> the backend, so auth cookies stay same-origin. In production set
 * PUBLIC_FRONTEND_URL / BACKEND_URL appropriately (see .env).
 *
 * Kept apart from the API clients so a public page can reach the API without
 * bundling them.
 */
export const API_ORIGIN =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ??
  (import.meta.env.PUBLIC_FRONTEND_URL as string | undefined) ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:4321");
