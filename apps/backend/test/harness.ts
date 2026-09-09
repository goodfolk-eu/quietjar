import { mock } from "bun:test";

/**
 * Route tests need three things the real modules cannot give them: a database
 * that is not the deployed one, a session without a login, and a Stripe that
 * does not make network calls.
 *
 * The database is real rather than mocked -- libsql runs in memory, so the
 * routes exercise the actual SQL. Auth and the Stripe client are replaced,
 * since better-auth wants cookies and Stripe wants a network.
 *
 * Import this module before anything under `src/`.
 */

// db.ts throws at import time without a URL, so this has to be set first.
process.env.BUNNY_DATABASE_URL = ":memory:";
process.env.STRIPE_SECRET_KEY ??= "sk_test_harness";
process.env.PUBLIC_FRONTEND_URL ??= "http://localhost:4321";

/** The user the next request is authenticated as. Null means signed out. */
export const session: { user: { id: string; email: string } | null } = {
  user: { id: "user_1", email: "creator@example.com" },
};

mock.module("../src/auth", () => ({
  auth: {
    api: {
      getSession: async () => (session.user ? { user: session.user } : null),
    },
  },
}));

export interface StripeCall {
  name: string;
  args: unknown;
}

/** Every call the routes made into the Stripe client, in order. */
export const stripeCalls: StripeCall[] = [];

/**
 * What the fake Stripe returns next. Tests overwrite the pieces they care
 * about; `reset` puts them back so one test cannot leak into another.
 */
export const stripeState = {
  account: { id: "acct_test", capabilities: {} as Record<string, string> },
  onboardingUrl: "https://connect.stripe.test/onboarding",
  loginUrl: "https://connect.stripe.test/login",
  throwOnCreate: null as Error | null,
  throwOnLink: null as Error | null,
  missingAccount: false,
  /** What the fake charge's balance transaction nets down to. Null = unknown. */
  chargeNet: null as number | null,
  /** The event constructWebhookEvent hands to the webhook route. */
  webhookEvent: null as Record<string, unknown> | null,
  /** The checkout session Stripe answers with on a status lookup. */
  donationSession: null as Record<string, unknown> | null,
};

function account() {
  const capabilities: Record<string, unknown> = {};
  for (const [key, status] of Object.entries(stripeState.account.capabilities)) {
    if (key === "payouts") capabilities.stripe_balance = { payouts: { status } };
    else capabilities[key] = { status };
  }
  return {
    id: stripeState.account.id,
    configuration: { merchant: { capabilities } },
    requirements: { entries: [] },
  };
}

function record(name: string, args: unknown) {
  stripeCalls.push({ name, args });
}

mock.module("../src/stripe/client", () => ({
  stripeConfigFromEnv: () => ({ secretKey: process.env.STRIPE_SECRET_KEY }),
  webhookSecretFromEnv: () => "whsec_test",
  isTestMode: () => true,
  publishableKeyFromEnv: () => "pk_test_harness",
  createDonationSession: async (_config: unknown, input: unknown) => {
    record("createDonationSession", input);
    return { id: "cs_test_harness", clientSecret: "cs_test_harness_secret" };
  },
  isMissingAccount: () => stripeState.missingAccount,
  // Pure and network-free, so it mirrors the real implementation rather than
  // faking it -- mock.module is global and pay.test.ts asserts on the real one.
  applicationFee: (amountInMinorUnits: number) => Math.floor((amountInMinorUnits * 500) / 10_000),
  createConnectedAccount: async (_config: unknown, input: unknown) => {
    record("createConnectedAccount", input);
    if (stripeState.throwOnCreate) throw stripeState.throwOnCreate;
    return account();
  },
  retrieveAccount: async (_config: unknown, accountId: string) => {
    record("retrieveAccount", { accountId });
    return account();
  },
  requestIdealCapability: async (_config: unknown, accountId: string) => {
    record("requestIdealCapability", { accountId });
    return account();
  },
  createOnboardingLink: async (_config: unknown, input: unknown) => {
    record("createOnboardingLink", input);
    if (stripeState.throwOnLink) throw stripeState.throwOnLink;
    return stripeState.onboardingUrl;
  },
  createLoginLink: async (_config: unknown, accountId: string) => {
    record("createLoginLink", { accountId });
    return stripeState.loginUrl;
  },
  chargeNet: async (_config: unknown, accountId: string, paymentIntentId: string) => {
    record("chargeNet", { accountId, paymentIntentId });
    return stripeState.chargeNet;
  },
  constructWebhookEvent: async () => {
    if (stripeState.webhookEvent === null) throw new Error("not used");
    return stripeState.webhookEvent;
  },
  retrieveDonationSession: async (_config: unknown, accountId: string, sessionId: string) => {
    record("retrieveDonationSession", { accountId, sessionId });
    return stripeState.donationSession;
  },
}));

export function resetStripe(): void {
  stripeCalls.length = 0;
  stripeState.account = { id: "acct_test", capabilities: {} };
  stripeState.onboardingUrl = "https://connect.stripe.test/onboarding";
  stripeState.loginUrl = "https://connect.stripe.test/login";
  stripeState.throwOnCreate = null;
  stripeState.throwOnLink = null;
  stripeState.missingAccount = false;
  stripeState.chargeNet = null;
  stripeState.webhookEvent = null;
  stripeState.donationSession = null;
}

export function calledWith(name: string): unknown | undefined {
  return stripeCalls.find((call) => call.name === name)?.args;
}

type Body = Record<string, unknown>;

/** Elysia handles a plain Request, so no server needs to listen. */
export function request(method: string, path: string, body?: Body): Request {
  return new Request(`http://localhost${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
}

export async function json(response: Response): Promise<{ status: number; body: Body }> {
  return { status: response.status, body: (await response.json()) as Body };
}
