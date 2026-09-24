import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { libsqlDialect } from "./db";
import { sendEmail } from "./email";
import { pushSubscriber } from "./keila";
import { trackEvent } from "./umami";

/**
 * Non-httpOnly marker cookie used by the static homepage to decide whether to
 * show "Log in" or "Dashboard" without a backend call. The real httpOnly
 * session token stays invisible to JS; this is a UI hint only, validated
 * server-side on the dashboard.
 *
 * The cookie must be scoped to the FRONTEND origin (the parent domain of the
 * API) so the homepage can read it. The API lives on api.quietjar.com while
 * the homepage is served from quietjar.com; without an explicit Domain the
 * cookie would be host-only to api.quietjar.com and invisible to the page.
 */
const AUTH_MARKER = "qj_auth_marker";

/**
 * Cookie attributes for the auth marker. On a real https host the cookie is
 * scoped to the frontend's parent domain (first-party for the homepage) and
 * marked Secure. Local dev runs everything same-origin via the Astro proxy,
 * so no Domain is set.
 */
function markerCookieAttrs(): { domain?: string; secure: boolean; sameSite: "lax"; path: "/" } {
  const frontendUrl = process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";
  const host = new URL(frontendUrl).host;
  const isHttps = new URL(frontendUrl).protocol === "https:";
  if (!isHttps) {
    return { secure: false, sameSite: "lax", path: "/" };
  }
  return { domain: host, secure: true, sameSite: "lax", path: "/" };
}

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
  appName: "QuietJar",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-change-me-in-production",
  baseURL: resolveBaseUrl(),
  trustedOrigins: resolveTrustedOrigins(),

  // BunnyDB — a libsql database reached over HTTP.
  database: {
    dialect: libsqlDialect,
    type: "sqlite",
    debugLogs: process.env.NODE_ENV === "development",
  },

  // PUBLIC_BACKEND_URL can point at an https tunnel while the browser talks to
  // us over http://localhost through the Astro proxy. Browsers refuse
  // __Secure- prefixed / Secure cookies over plain http, so the flag must
  // follow the origin the BROWSER uses (the frontend), not the backend base
  // URL. NODE_ENV is unset under `bun --watch`, so it cannot be used here.
  advanced: {
    useSecureCookies: markerCookieAttrs().secure,
  },

  // Passwordless, email-only: a numeric one-time code is emailed to the user.
  emailAndPassword: {
    enabled: false,
  },

  user: {
    additionalFields: {
      newsletterOptIn: { type: "boolean", defaultValue: false, input: true },
      // On for everyone, including accounts created before the column existed:
      // those rows read back null, which `notifiesOnDonation` treats as on.
      notifyOnDonation: { type: "boolean", defaultValue: true, input: true },
    },
  },
  plugins: [
    emailOTP({
      // Numeric code, emailed via SMTP (see email.ts).
      async sendVerificationOTP({ email, otp, type }) {
        const subjects: Record<string, string> = {
          "sign-in": "Your QuietJar sign-in code",
          "email-verification": "Verify your email",
          "forget-password": "Reset your password",
        };
        const subject = subjects[type] ?? "Change your email";

        await sendEmail(
          email,
          subject,
          `<p>Your QuietJar one-time code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>It expires in 5 minutes.</p>`,
        );
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      allowedAttempts: 3,
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        after: async () => {
          trackEvent("signup");
        },
      },
    },
  },

  // Toggle the readable marker cookie so the static homepage can show the right
  // button without a backend call. Validated server-side on the dashboard.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email-otp") {
        ctx.setCookie(AUTH_MARKER, "1", markerCookieAttrs());
        const body = ctx.body as { email?: unknown; newsletterOptIn?: unknown } | undefined;
        const email = typeof body?.email === "string" ? body.email.toLowerCase() : undefined;
        if (email && body?.newsletterOptIn === true) {
          const found = await ctx.context.internalAdapter.findUserByEmail(email);
          if (!found) return;
          const user = found.user as { id: string; email: string; newsletterOptIn?: boolean };
          if (!user.newsletterOptIn) {
            await ctx.context.internalAdapter.updateUser(user.id, { newsletterOptIn: true });
          }
          pushSubscriber(user);
        }
      }
      if (ctx.path === "/sign-out") {
        ctx.setCookie(AUTH_MARKER, "", { ...markerCookieAttrs(), maxAge: 0 });
      }
    }),
  },
});
