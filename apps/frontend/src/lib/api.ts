import { treaty } from "@elysiajs/eden";
import type { App } from "@quietjar/backend/eden";
import { createAuthClient } from "better-auth/client";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";
import { API_ORIGIN } from "./api-origin";

export { API_ORIGIN };

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
  plugins: [
    emailOTPClient(),
    // Declared as a schema rather than inferred from the backend's auth
    // instance, so the frontend types do not pull in the server config.
    inferAdditionalFields({
      user: {
        notifyOnDonation: { type: "boolean" },
      },
    }),
  ],
});
