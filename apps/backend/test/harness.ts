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

export interface StoredUser {
  id: string;
  email: string;
  notifyOnDonation?: boolean | null;
}

/**
 * The BetterAuth user table, by id. Code that reads a creator's account goes
 * through the internal adapter rather than our own SQL, so the rows it would
 * find live here.
 */
export const users: Record<string, StoredUser> = {};

mock.module("../src/auth", () => ({
  auth: {
    api: {
      getSession: async () => (session.user ? { user: session.user } : null),
    },
    $context: Promise.resolve({
      internalAdapter: {
        findUserById: async (userId: string) => users[userId] ?? null,
      },
    }),
  },
}));

/** Every email the code under test asked to send, in order. */
export const sentEmails: { to: string; subject: string; html: string }[] = [];

/** Set to make the next send throw, standing in for a rejected mail API call. */
export const emailState = { failNextSend: false };

mock.module("../src/email", () => ({
  sendEmail: async (to: string, subject: string, html: string) => {
    if (emailState.failNextSend) {
      emailState.failNextSend = false;
      throw new Error("send failed");
    }
    sentEmails.push({ to, subject, html });
  },
}));

export function resetEmail(): void {
  sentEmails.length = 0;
  emailState.failNextSend = false;
  for (const id of Object.keys(users)) delete users[id];
}

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
  chargeAmounts: null as { net: number | null; applicationFee: number | null } | null,
  /** The event constructWebhookEvent hands to the webhook route. */
  webhookEvent: null as Record<string, unknown> | null,
  /** The checkout session Stripe answers with on a status lookup. */
  donationSession: null as Record<string, unknown> | null,
  /** The connected account's balance, in minor units. */
  balance: { available: 0, pending: 0, currency: "eur" },
  throwOnPayout: null as Error | null,
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
  createConnectedAccount: async (_config: unknown, input: unknown) => {
    record("createConnectedAccount", input);
    if (stripeState.throwOnCreate) throw stripeState.throwOnCreate;
    return account();
  },
  retrieveAccount: async (_config: unknown, accountId: string) => {
    record("retrieveAccount", { accountId });
    return account();
  },
  registerWalletDomains: async (_config: unknown, accountId: string, siteUrl: string | null) => {
    record("registerWalletDomains", { accountId, siteUrl });
  },
  updateBusinessUrl: async (_config: unknown, accountId: string, businessUrl: string) => {
    record("updateBusinessUrl", { accountId, businessUrl });
  },
  requestLocalPaymentCapabilities: async (
    _config: unknown,
    accountId: string,
    capabilities: readonly string[],
  ) => {
    record("requestLocalPaymentCapabilities", { accountId, capabilities });
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
  chargeAmounts: async (_config: unknown, accountId: string, paymentIntentId: string) => {
    record("chargeAmounts", { accountId, paymentIntentId });
    return stripeState.chargeAmounts ?? { net: null, applicationFee: null };
  },
  constructWebhookEvent: async () => {
    if (stripeState.webhookEvent === null) throw new Error("not used");
    return stripeState.webhookEvent;
  },
  setManualPayouts: async (_config: unknown, accountId: string) => {
    record("setManualPayouts", { accountId });
  },
  retrieveBalance: async (_config: unknown, accountId: string, currency: string) => {
    record("retrieveBalance", { accountId, currency });
    if (stripeState.missingAccount) throw new Error("missing account");
    return { ...stripeState.balance };
  },
  createPayout: async (_config: unknown, accountId: string, amount: number, currency: string) => {
    record("createPayout", { accountId, amount, currency });
    if (stripeState.throwOnPayout) throw stripeState.throwOnPayout;
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
  stripeState.chargeAmounts = null;
  stripeState.webhookEvent = null;
  stripeState.donationSession = null;
  stripeState.balance = { available: 0, pending: 0, currency: "eur" };
  stripeState.throwOnPayout = null;
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
