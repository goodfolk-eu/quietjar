import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { recordCompletedDonation } from "../pay/record";
import { supportsIdeal } from "../sites/currency";
import { getSiteByUserId } from "../sites/store";
import {
  constructWebhookEvent,
  createConnectedAccount,
  createLoginLink,
  createOnboardingLink,
  isMissingAccount,
  registerWalletDomains,
  requestIdealCapability,
  retrieveAccount,
  stripeConfigFromEnv,
  webhookSecretFromEnv,
} from "./client";
import { deriveOnboarding, type OnboardingStatus } from "./status";
import {
  createConnection,
  deleteConnection,
  getConnectionByAccountId,
  getConnectionByUserId,
  saveOnboarding,
} from "./store";

type Step = "identity" | "ideal" | "payouts";

function frontendOrigin(): string {
  return process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";
}

/**
 * Every Stripe redirect lands on the frontend, never here. The backend origin
 * differs from the origin that owns the session cookie in development, so a
 * top-level redirect back to the API would arrive unauthenticated.
 */
function stepUrls(step: Step): { refreshUrl: string; returnUrl: string } {
  // Hardcoded to the "en" locale prefix: the backend has no notion of a
  // user's locale today. Revisit once a second locale actually exists.
  const base = `${frontendOrigin()}/en/dashboard/payments`;
  return {
    refreshUrl: `${base}?stripe=refresh&step=${step}`,
    returnUrl: `${base}?stripe=return`,
  };
}

async function sessionUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

async function sessionUser(request: Request): Promise<{ id: string; email: string } | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user.email) return null;
  return { id: session.user.id, email: session.user.email };
}

const CONNECTION_RESET = { status: 409, body: { error: "connection_reset" } } as const;

async function syncOnboarding(accountId: string, userId: string) {
  const config = stripeConfigFromEnv();
  if (!config) return null;
  const site = await getSiteByUserId(userId);
  const onboarding = deriveOnboarding(await retrieveAccount(config, accountId), {
    idealEligible: supportsIdeal(site?.country),
  });
  await saveOnboarding(accountId, onboarding);
  // The usual order is site URL first, account second, so this is where most
  // creators get their domain registered for wallets.
  await registerWalletDomains(config, accountId, site?.siteUrl ?? null);
  return onboarding;
}

export const stripeRoutes = new Elysia({ prefix: "/api/stripe" })
  .get("/connection", async ({ request, set }) => {
    const userId = await sessionUserId(request);
    if (!userId) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const connection = await getConnectionByUserId(userId);
    if (!connection) return { connection: null };
    return { connection: { onboarding: connection.onboarding } };
  })
  .post("/connect", async ({ request, set }) => {
    const user = await sessionUser(request);
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const userId = user.id;
    const config = stripeConfigFromEnv();
    if (!config) {
      set.status = 503;
      return { error: "stripe_not_configured" };
    }

    // Everything the account is created with comes from the site row, so
    // there is nothing to create until the creator has filled step one.
    const site = await getSiteByUserId(userId);
    if (!site?.siteUrl || !site.country || !site.entityType) {
      set.status = 400;
      return { error: "site_not_configured" };
    }

    const existing = await getConnectionByUserId(userId);
    let accountId = existing?.accountId;
    if (!accountId) {
      try {
        const account = await createConnectedAccount(config, {
          country: site.country,
          email: user.email,
          entityType: site.entityType,
          currency: site.currency,
          businessUrl: site.siteUrl,
        });
        accountId = account.id;
        await createConnection({ userId, accountId });
        await saveOnboarding(
          accountId,
          deriveOnboarding(account, { idealEligible: supportsIdeal(site.country) }),
        );
        // The site URL is known to exist by now, so the wallets are ready
        // before the creator takes their first payment rather than after
        // whichever status refresh happens to come first.
        await registerWalletDomains(config, accountId, site.siteUrl);
      } catch (err) {
        console.error("[stripe/connect] account creation failed:", err);
        set.status = 502;
        return { error: "stripe_request_failed" };
      }
    }

    const { refreshUrl, returnUrl } = stepUrls("identity");
    try {
      const url = await createOnboardingLink(config, {
        accountId,
        refreshUrl,
        returnUrl,
        fields: "currently_due",
      });
      return { url };
    } catch (err) {
      if (isMissingAccount(err)) {
        await deleteConnection(userId);
        set.status = CONNECTION_RESET.status;
        return CONNECTION_RESET.body;
      }
      console.error("[stripe/connect] account link failed:", err);
      set.status = 502;
      return { error: "stripe_request_failed" };
    }
  })
  .post(
    "/onboarding-link",
    async ({ request, set, body }) => {
      const userId = await sessionUserId(request);
      if (!userId) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const config = stripeConfigFromEnv();
      if (!config) {
        set.status = 503;
        return { error: "stripe_not_configured" };
      }
      const connection = await getConnectionByUserId(userId);
      if (!connection) {
        set.status = 400;
        return { error: "not_connected" };
      }

      const site = await getSiteByUserId(userId);

      const step = body.step as Step;
      if (step === "ideal") {
        // Requesting the capability is what makes Stripe answer, and the answer
        // costs the creator extra requirements. If the country cannot have it,
        // say so without asking.
        if (!supportsIdeal(site?.country)) {
          set.status = 409;
          return { error: "ideal_unavailable" };
        }
        try {
          const account = await requestIdealCapability(config, connection.accountId);
          const onboarding = deriveOnboarding(account, { idealEligible: true });
          await saveOnboarding(connection.accountId, onboarding);
          if (onboarding.ideal === "unavailable") {
            set.status = 409;
            return { error: "ideal_unavailable" };
          }
        } catch (err) {
          if (isMissingAccount(err)) {
            await deleteConnection(userId);
            set.status = CONNECTION_RESET.status;
            return CONNECTION_RESET.body;
          }
          console.error("[stripe/onboarding-link] capability request failed:", err);
          set.status = 502;
          return { error: "stripe_request_failed" };
        }
      }

      const { refreshUrl, returnUrl } = stepUrls(step);
      try {
        const url = await createOnboardingLink(config, {
          accountId: connection.accountId,
          refreshUrl,
          returnUrl,
          fields: step === "payouts" ? "eventually_due" : "currently_due",
        });
        return { url };
      } catch (err) {
        if (isMissingAccount(err)) {
          await deleteConnection(userId);
          set.status = CONNECTION_RESET.status;
          return CONNECTION_RESET.body;
        }
        console.error("[stripe/onboarding-link] account link failed:", err);
        set.status = 502;
        return { error: "stripe_request_failed" };
      }
    },
    {
      body: t.Object({
        step: t.Union([t.Literal("identity"), t.Literal("ideal"), t.Literal("payouts")]),
      }),
    },
  )
  .post("/refresh-status", async ({ request, set }) => {
    const userId = await sessionUserId(request);
    if (!userId) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const connection = await getConnectionByUserId(userId);
    if (!connection) {
      set.status = 400;
      return { error: "not_connected" };
    }
    try {
      const onboarding = await syncOnboarding(connection.accountId, userId);
      if (!onboarding) {
        set.status = 503;
        return { error: "stripe_not_configured" };
      }
      return { connection: { onboarding } satisfies { onboarding: OnboardingStatus } };
    } catch (err) {
      if (isMissingAccount(err)) {
        await deleteConnection(userId);
        set.status = CONNECTION_RESET.status;
        return CONNECTION_RESET.body;
      }
      console.error("[stripe/refresh-status] account retrieval failed:", err);
      set.status = 502;
      return { error: "stripe_request_failed" };
    }
  })
  .post("/login-link", async ({ request, set }) => {
    const userId = await sessionUserId(request);
    if (!userId) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const config = stripeConfigFromEnv();
    if (!config) {
      set.status = 503;
      return { error: "stripe_not_configured" };
    }
    const connection = await getConnectionByUserId(userId);
    if (!connection) {
      set.status = 400;
      return { error: "not_connected" };
    }
    try {
      return { url: await createLoginLink(config, connection.accountId) };
    } catch (err) {
      if (isMissingAccount(err)) {
        await deleteConnection(userId);
        set.status = CONNECTION_RESET.status;
        return CONNECTION_RESET.body;
      }
      console.error("[stripe/login-link] login link failed:", err);
      set.status = 502;
      return { error: "stripe_request_failed" };
    }
  })
  // Stripe verifies accounts asynchronously, so the steps only stay truthful if
  // account.updated is applied as it arrives.
  .post(
    "/webhook",
    async ({ request, set }) => {
      const config = stripeConfigFromEnv();
      const secret = webhookSecretFromEnv();
      if (!config || !secret) {
        set.status = 503;
        return { error: "stripe_not_configured" };
      }
      const signature = request.headers.get("stripe-signature");
      if (!signature) {
        set.status = 400;
        return { error: "missing_signature" };
      }

      let event: Awaited<ReturnType<typeof constructWebhookEvent>>;
      try {
        event = await constructWebhookEvent(config, await request.text(), signature, secret);
      } catch (err) {
        console.error("[stripe/webhook] signature verification failed:", err);
        set.status = 400;
        return { error: "invalid_signature" };
      }

      if (event.type === "account.updated") {
        const accountId = event.data.object.id;
        const connection = await getConnectionByAccountId(accountId);
        if (connection) {
          try {
            await syncOnboarding(accountId, connection.userId);
          } catch (err) {
            console.error("[stripe/webhook] onboarding sync failed:", err);
            set.status = 502;
            return { error: "stripe_request_failed" };
          }
        }
      }

      // Direct charges bill the connected account, so donation events arrive as
      // Connect events carrying the account they belong to.
      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        await recordCompletedDonation(event.data.object, event.account);
      }

      return { received: true };
    },
    // Signature verification needs the exact bytes Stripe signed.
    { parse: "none" },
  );
