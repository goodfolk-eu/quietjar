import Stripe from "stripe";

export interface StripeConfig {
  secretKey: string;
}

export function stripeConfigFromEnv(): StripeConfig | undefined {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return undefined;
  return { secretKey };
}

export function webhookSecretFromEnv(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

let client: Stripe | undefined;

export function stripeClient(config: StripeConfig): Stripe {
  if (!client) {
    // Bun ships fetch but not every node:http edge case the default client uses.
    client = new Stripe(config.secretKey, { httpClient: Stripe.createFetchHttpClient() });
  }
  return client;
}

/**
 * v2 accounts return a narrow projection by default; anything else has to be
 * asked for explicitly. Every read here drives the onboarding steps, so it
 * needs the merchant configuration for capability statuses and the
 * requirements for the errors behind them.
 */
const INCLUDE = ["configuration.merchant", "requirements"] as const;

export type V2Account = Stripe.V2.Core.Account;

export interface CreateAccountInput {
  country: string;
  email: string;
  entityType: "individual" | "company";
  currency: string;
  businessUrl: string;
}

/**
 * Create an Express connected account controlled by this platform.
 *
 * The Express dashboard requires the platform to collect both fees and losses;
 * Stripe rejects any other combination.
 */
export async function createConnectedAccount(
  config: StripeConfig,
  input: CreateAccountInput,
): Promise<V2Account> {
  return stripeClient(config).v2.core.accounts.create({
    contact_email: input.email,
    dashboard: "express",
    // Without an entity type Stripe opens onboarding by asking the creator to
    // pick one (BV, eenmanszaak, ...). We ask a plainer question up front and
    // pass the answer through, so that screen never appears.
    identity: { country: input.country.toLowerCase(), entity_type: input.entityType },
    configuration: {
      // Payouts are not requestable: the merchant configuration carries them,
      // and the account reports their status under stripe_balance.payouts.
      merchant: {
        // Prefilled so Stripe stops asking each creator to pick an industry.
        // Card network classification only; it has no bearing on tax.
        mcc: "5815",
        capabilities: { card_payments: { requested: true } },
      },
      recipient: {
        capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
      },
    },
    defaults: {
      // The creator already told us both of these on the payments page, so
      // onboarding opens with them settled rather than asking again.
      currency: input.currency,
      responsibilities: { fees_collector: "application", losses_collector: "application" },
      profile: {
        business_url: input.businessUrl,
        product_description: "Tips from supporters, collected with QuietJar.",
      },
    },
    include: [...INCLUDE],
  });
}

export function retrieveAccount(config: StripeConfig, accountId: string): Promise<V2Account> {
  return stripeClient(config).v2.core.accounts.retrieve(accountId, { include: [...INCLUDE] });
}

/**
 * Ask Stripe to enable iDEAL. This adds requirements (identity number, liveness
 * check) that the next onboarding link collects.
 */
export function requestIdealCapability(
  config: StripeConfig,
  accountId: string,
): Promise<V2Account> {
  return stripeClient(config).v2.core.accounts.update(accountId, {
    configuration: { merchant: { capabilities: { ideal_payments: { requested: true } } } },
    include: [...INCLUDE],
  });
}

/**
 * True when the stored account no longer exists or is no longer ours. Stripe
 * answers 403 rather than 404 for an account deleted from the dashboard.
 */
export function isMissingAccount(err: unknown): boolean {
  if (!(err instanceof Stripe.errors.StripeError)) return false;
  return err.statusCode === 403 || err.statusCode === 404;
}

export interface OnboardingLinkInput {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
  /**
   * `currently_due` keeps the form as short as Stripe allows. `eventually_due`
   * pulls in requirements that are not blocking yet, which is the only way to
   * make Stripe ask for a bank account before payouts are actually due.
   */
  fields: "currently_due" | "eventually_due";
}

export async function createOnboardingLink(
  config: StripeConfig,
  input: OnboardingLinkInput,
): Promise<string> {
  const link = await stripeClient(config).v2.core.accountLinks.create({
    account: input.accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant", "recipient"],
        collection_options: { fields: input.fields },
        refresh_url: input.refreshUrl,
        return_url: input.returnUrl,
      },
    },
  });
  return link.url;
}

/**
 * A single-use link into the creator's Express dashboard. Login links have no
 * v2 equivalent yet, and v1 endpoints accept a v2 account id.
 */
export async function createLoginLink(config: StripeConfig, accountId: string): Promise<string> {
  const link = await stripeClient(config).accounts.createLoginLink(accountId);
  return link.url;
}

/**
 * What the creator keeps from a direct charge. The connected account's balance
 * transaction nets the gross amount down by our application fee and Stripe's
 * own processing cost, which is the only place that cost is stated.
 */
export async function chargeNet(
  config: StripeConfig,
  accountId: string,
  paymentIntentId: string,
): Promise<number | null> {
  const intent = await stripeClient(config).paymentIntents.retrieve(
    paymentIntentId,
    { expand: ["latest_charge.balance_transaction"] },
    { stripeAccount: accountId },
  );
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const transaction =
    charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
  return transaction?.net ?? null;
}

/**
 * Live payment status for a redirect return. The session was created on the
 * connected account, so the retrieval needs its id; a session we cannot read
 * (wrong account, unknown id) reads as unresolved.
 */
export async function retrieveDonationSession(
  config: StripeConfig,
  accountId: string,
  sessionId: string,
): Promise<Stripe.Checkout.Session | null> {
  try {
    return await stripeClient(config).checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: accountId },
    );
  } catch {
    return null;
  }
}

export async function constructWebhookEvent(
  config: StripeConfig,
  payload: string,
  signature: string,
  secret: string,
): Promise<Stripe.Event> {
  return stripeClient(config).webhooks.constructEventAsync(payload, signature, secret);
}

export function publishableKeyFromEnv(): string | undefined {
  return process.env.STRIPE_PUBLISHABLE_KEY;
}

/** True when the platform is running against test keys. */
export function isTestMode(config: StripeConfig): boolean {
  return config.secretKey.startsWith("sk_test_") || config.secretKey.startsWith("rk_test_");
}

/** QuietJar's share of a donation, in basis points. */
export const FEE_BPS = 500;

export function applicationFee(amountInMinorUnits: number): number {
  return Math.floor((amountInMinorUnits * FEE_BPS) / 10_000);
}

export interface DonationSessionInput {
  accountId: string;
  /** Amount in the currency's minor units. */
  amount: number;
  currency: string;
  /** The page the supporter is on; Stripe returns them here after a redirect. */
  returnUrl: string;
  siteKey: string;
  /** Goal the donation counts toward, when the widget named a usable one. */
  goalId: string | null;
  productName: string;
}

/**
 * A Checkout Session in `elements` mode: Stripe owns the totals and the payment
 * method logic, the widget mounts the Payment Element against the client
 * secret. Created on the connected account so the creator is the merchant of
 * record and the funds land in their balance.
 */
export async function createDonationSession(
  config: StripeConfig,
  input: DonationSessionInput,
): Promise<{ id: string; clientSecret: string }> {
  const metadata = {
    quietjar_site: input.siteKey,
    ...(input.goalId === null ? {} : { quietjar_goal: input.goalId }),
  };
  const session = await stripeClient(config).checkout.sessions.create(
    {
      ui_mode: "elements",
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: input.amount,
            product_data: { name: input.productName },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee(input.amount),
        metadata,
      },
      metadata,
      return_url: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}qj_donation={CHECKOUT_SESSION_ID}`,
    },
    { stripeAccount: input.accountId },
  );

  if (!session.client_secret) {
    throw new Error("Checkout Session was created without a client secret");
  }
  return { id: session.id, clientSecret: session.client_secret };
}

/**
 * The country the creator onboarded with. `identity` is outside the default
 * projection, so it has to be asked for explicitly.
 */
export async function retrieveAccountCountry(
  config: StripeConfig,
  accountId: string,
): Promise<string | undefined> {
  const account = await stripeClient(config).v2.core.accounts.retrieve(accountId, {
    include: ["identity"],
  });
  return account.identity?.country ?? undefined;
}
