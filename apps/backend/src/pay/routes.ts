import { Elysia, t } from "elysia";
import { toMinorUnits } from "../sites/currency";
import { getSiteByPublicKey } from "../sites/store";
import {
  createDonationSession,
  isMissingAccount,
  isTestMode,
  publishableKeyFromEnv,
  stripeConfigFromEnv,
} from "../stripe/client";
import { getConnectionByUserId } from "../stripe/store";
import { isValidAmount, sessionsPerIp, sessionsPerSite } from "./limits";
import { isAllowedOrigin, isAllowedReturnUrl, type OriginPolicy } from "./origin";
import { getDonationBySessionId } from "./store";

/** The dashboard serves the widget editor, whose preview is a real widget. */
function dashboardOrigin(): string {
  return process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";
}

function callerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function siteHost(siteUrl: string | null): string {
  if (!siteUrl) return "a website";
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return "a website";
  }
}

/**
 * Public routes: called by the widget from any creator's website, with no
 * session and no credentials. See the CORS origin function in `index.ts`.
 */
export const payRoutes = new Elysia({ prefix: "/api/pay" })
  .post(
    "/session",
    async ({ request, set, body }) => {
      const config = stripeConfigFromEnv();
      const publishableKey = publishableKeyFromEnv();
      if (!config || !publishableKey) {
        set.status = 503;
        return { error: "stripe_not_configured" };
      }

      const site = await getSiteByPublicKey(body.site);
      if (!site) {
        set.status = 404;
        return { error: "unknown_site" };
      }

      const policy: OriginPolicy = {
        allowLocalhost: isTestMode(config),
        dashboardOrigin: dashboardOrigin(),
      };
      if (!isAllowedOrigin(request.headers.get("origin"), site.siteUrl, policy)) {
        set.status = 403;
        return { error: "origin_not_allowed" };
      }
      if (!isAllowedReturnUrl(body.returnUrl, site.siteUrl, policy)) {
        set.status = 400;
        return { error: "invalid_return_url" };
      }
      if (!isValidAmount(body.amount, site.currency)) {
        set.status = 400;
        return { error: "invalid_amount" };
      }

      const now = Date.now();
      if (!sessionsPerIp.take(callerIp(request), now) || !sessionsPerSite.take(site.id, now)) {
        set.status = 429;
        return { error: "rate_limited" };
      }

      const connection = await getConnectionByUserId(site.userId);
      if (!connection) {
        set.status = 409;
        return { error: "not_connected" };
      }
      if (connection.onboarding?.identity !== "done") {
        set.status = 409;
        return { error: "payments_not_enabled" };
      }

      try {
        const session = await createDonationSession(config, {
          accountId: connection.accountId,
          amount: toMinorUnits(body.amount),
          currency: site.currency,
          returnUrl: body.returnUrl,
          siteKey: site.publicKey,
          productName: `Support for ${siteHost(site.siteUrl)}`,
        });
        return {
          clientSecret: session.clientSecret,
          publishableKey,
          account: connection.accountId,
          currency: site.currency,
        };
      } catch (err) {
        if (isMissingAccount(err)) {
          set.status = 409;
          return { error: "not_connected" };
        }
        console.error("[pay/session] session creation failed:", err);
        set.status = 502;
        return { error: "stripe_request_failed" };
      }
    },
    {
      body: t.Object({
        site: t.String({ minLength: 1, maxLength: 64 }),
        amount: t.Number(),
        returnUrl: t.String({ minLength: 1, maxLength: 2048 }),
      }),
    },
  )
  // The widget calls this after a redirect payment method returns the supporter
  // to the page. It reports our own record, written by the webhook.
  .get(
    "/status",
    async ({ query }) => {
      const donation = await getDonationBySessionId(query.session);
      if (!donation) return { status: "pending" as const };
      return {
        status: "paid" as const,
        amount: donation.amount,
        currency: donation.currency,
      };
    },
    { query: t.Object({ session: t.String({ minLength: 1, maxLength: 128 }) }) },
  );
