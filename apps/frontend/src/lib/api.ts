import { treaty } from "@elysiajs/eden";
import type { App } from "@quietjar/backend/eden";
import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

/**
 * Frontend origin as the API base. In local dev the Astro server proxies
 * /api -> the backend, so auth cookies stay same-origin. In production set
 * PUBLIC_FRONTEND_URL / BACKEND_URL appropriately (see .env).
 */
export const API_ORIGIN =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ??
  (import.meta.env.PUBLIC_FRONTEND_URL as string | undefined) ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:4321");

/**
 * Typed Elysia API client (Eden treaty). Wraps fetch to send cookies
 * cross-origin; the auth session lives on api.quietjar.com.
 */
export const api = treaty<App>(API_ORIGIN, {
  // Send cookies cross-origin; the auth session lives on api.quietjar.com.
  fetcher: ((input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, credentials: "include" })) as typeof fetch,
});

/** Typed BetterAuth client for the passwordless email-OTP flow. */
export const authClient = createAuthClient({
  baseURL: API_ORIGIN,
  plugins: [emailOTPClient()],
});
