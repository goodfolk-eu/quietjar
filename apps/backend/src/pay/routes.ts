import { Elysia, t } from "elysia";
import { activeGoalForSite } from "../goals/store";
import { toMinorUnits } from "../sites/currency";
import { getSiteByPublicKey } from "../sites/store";
import {
  createDonationSession,
  isMissingAccount,
  isTestMode,
  publishableKeyFromEnv,
  retrieveDonationSession,
  stripeConfigFromEnv,
} from "../stripe/client";
import { getConnectionByUserId } from "../stripe/store";
import {
  detailsPerIp,
  isValidAmount,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  sessionsPerIp,
  sessionsPerSite,
  statusPerIp,
} from "./limits";
import { isAllowedOrigin, isAllowedReturnUrl, type OriginPolicy } from "./origin";
import { getDonationBySessionId, saveDonationDetails } from "./store";

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

      // A stale or archived goal id in a snippet must never cost a supporter
      // their payment, so the attribution is dropped and the session goes on.
      // The ownership check is also what stops one site pointing its widget at
      // another site's goal.
      const goal = body.goal ? await activeGoalForSite(body.goal, site.id) : null;

      try {
        const session = await createDonationSession(config, {
          accountId: connection.accountId,
          amount: toMinorUnits(body.amount),
          currency: site.currency,
          returnUrl: body.returnUrl,
          siteKey: site.publicKey,
          goalId: goal?.id ?? null,
          productName: `Support for ${siteHost(site.siteUrl)}`,
        });
        return {
          sessionId: session.id,
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
        goal: t.Optional(t.String({ maxLength: 64 })),
      }),
    },
  )
  // The widget calls this after a redirect payment method returns the supporter
  // to the page. Our own record is written by the webhook, which can trail the
  // redirect or never arrive, so with the site key in hand the answer is also
  // asked straight from Stripe. Paid is only ever reported once the money is
  // certain; a failed or cancelled attempt stays quiet.
  .get(
    "/status",
    async ({ query, request, set }) => {
      const donation = await getDonationBySessionId(query.session);
      if (donation) {
        return {
          status: "paid" as const,
          amount: donation.amount,
          currency: donation.currency,
        };
      }
      if (!query.site) return { status: "pending" as const };
      if (!statusPerIp.take(callerIp(request))) {
        set.status = 429;
        return { error: "rate_limited" };
      }
      const site = await getSiteByPublicKey(query.site);
      if (!site) return { status: "pending" as const };
      const connection = await getConnectionByUserId(site.userId);
      const config = stripeConfigFromEnv();
      if (!connection || !config) return { status: "pending" as const };
      const session = await retrieveDonationSession(config, connection.accountId, query.session);
      if (session?.payment_status !== "paid") return { status: "pending" as const };
      return {
        status: "paid" as const,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? site.currency,
      };
    },
    {
      query: t.Object({
        session: t.String({ minLength: 1, maxLength: 128 }),
        site: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
      }),
    },
  )
  // The thank-you step's optional name and message. Keyed by the checkout
  // session the supporter's own payment just created; the webhook may still
  // be on its way, so existence is not checked and the first submit wins.
  .post(
    "/details",
    async ({ request, set, body }) => {
      if (!detailsPerIp.take(callerIp(request))) {
        set.status = 429;
        return { error: "rate_limited" };
      }
      const name = (body.name ?? "").trim();
      const message = (body.message ?? "").trim();
      await saveDonationDetails({
        sessionId: body.session,
        name: name === "" ? null : name,
        message: message === "" ? null : message,
      });
      return { ok: true };
    },
    {
      body: t.Object({
        session: t.String({ minLength: 1, maxLength: 512 }),
        name: t.Optional(t.String({ maxLength: MAX_NAME_LENGTH })),
        message: t.Optional(t.String({ maxLength: MAX_MESSAGE_LENGTH })),
      }),
    },
  );
