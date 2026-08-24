import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import type { Dialect } from "kysely";
import { libsqlDialect } from "./db";
import { sendEmail } from "./email";

/**
 * Non-httpOnly marker cookie used by the static homepage to decide whether to
 * show "Log in" or "Dashboard" without a backend call. The real httpOnly
 * session token stays invisible to JS; this is a UI hint only, validated
 * server-side on the dashboard.
 */
const AUTH_MARKER = "qj_auth_marker";

/**
 * The public origin of the BACKEND. In production this is the Bunny
 * "Magic Container" URL. Set via PUBLIC_BACKEND_URL or PUBLIC_APP_URL.
 */
function resolveBaseUrl(): string {
  return process.env.PUBLIC_BACKEND_URL ?? process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Origins the front-end is allowed to authenticate from. The Astro dev
 * server proxies /api to us, and in production the front-end is served
 * separately, so both must be trusted.
 */
function resolveTrustedOrigins(): string[] {
  const frontend = process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";
  const list = [resolveBaseUrl(), frontend];
  if (process.env.TRUSTED_ORIGINS) {
    for (const o of process.env.TRUSTED_ORIGINS.split(",")) {
      const t = o.trim();
      if (t) list.push(t);
    }
  }
  return list;
}

export const auth = betterAuth({
  appName: "Quietjar",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-change-me-in-production",
  baseURL: resolveBaseUrl(),
  trustedOrigins: resolveTrustedOrigins(),

  // BunnyDB — a libsql database reached over HTTP.
  database: {
    dialect: libsqlDialect as Dialect,
    type: "sqlite",
    debugLogs: process.env.NODE_ENV === "development",
  },

  // Passwordless, email-only: a numeric one-time code is emailed to the user.
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    emailOTP({
      // Numeric code, emailed via SMTP (see email.ts).
      async sendVerificationOTP({ email, otp, type }) {
        const subjects: Record<string, string> = {
          "sign-in": "Your Quietjar sign-in code",
          "email-verification": "Verify your email",
          "forget-password": "Reset your password",
        };
        const subject = subjects[type] ?? "Change your email";

        await sendEmail(
          email,
          subject,
          `<p>Your Quietjar one-time code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>It expires in 5 minutes.</p>`,
        );
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      allowedAttempts: 3,
    }),
  ],

  // Toggle the readable marker cookie so the static homepage can show the right
  // button without a backend call. Validated server-side on the dashboard.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email-otp") {
        ctx.setCookie(AUTH_MARKER, "1", { maxAge: 31536000, path: "/", sameSite: "lax" });
      }
      if (ctx.path === "/sign-out") {
        ctx.setCookie(AUTH_MARKER, "", { maxAge: 0, path: "/", sameSite: "lax" });
      }
    }),
  },
});
