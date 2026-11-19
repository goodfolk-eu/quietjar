import Stripe from "stripe";
import { hostedPageOrigin } from "../hosted/url";
import { returnUrlWithMarker, walletDomains } from "../pay/origin";

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

/** Every capability name the v2 merchant configuration accepts. */
export type MerchantCapability =
  keyof NonNullable<Stripe.V2.Core.AccountUpdateParams.Configuration.Merchant.Capabilities>;

export type V2Account = Stripe.V2.Core.Account;

export interface CreateAccountInput {
  country: string;
  email: string;
  entityType: "individual" | "company";
  currency: string;
  /** Null leaves Stripe to ask for a website during onboarding. */
  businessUrl: string | null;
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
        // Link needs no country gate and adds no verification requirements,
        // unlike the local methods requested later from the payout page.
        capabilities: { card_payments: { requested: true }, link_payments: { requested: true } },
      },
      recipient: {
        capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
      },
    },
    defaults: {
      // The creator already told us both of these on the payout page, so
      // onboarding opens with them settled rather than asking again.
      currency: input.currency,
      responsibilities: { fees_collector: "application", losses_collector: "application" },
      profile: {
        ...(input.businessUrl ? { business_url: input.businessUrl } : {}),
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
 * Ask Stripe to enable the local payment methods the account's country allows.
 *
 * Only iDEAL adds verification requirements of its own (a tax ID for sole
 * proprietors), which the next onboarding link collects. The rest need nothing
 * beyond what card payments already asked for, so they ride along on the same
 * request rather than each earning an onboarding step.
 */
export function requestLocalPaymentCapabilities(
  config: StripeConfig,
  accountId: string,
  capabilities: readonly MerchantCapability[],
): Promise<V2Account> {
  const requested = Object.fromEntries(capabilities.map((name) => [name, { requested: true }]));
  return stripeClient(config).v2.core.accounts.update(accountId, {
    configuration: { merchant: { capabilities: requested } },
    include: [...INCLUDE],
  });
}

/**
 * Keeps the website Stripe shows supporters in step with the creator's
 * settings: it is only sent once at account creation otherwise, and a creator
 * who starts on their hosted page and adds a site later would keep showing the
 * hosted page. Best-effort, like the wallet registration: a failure only
 * leaves the old URL in place.
 */
export async function updateBusinessUrl(
  config: StripeConfig,
  accountId: string,
  businessUrl: string,
): Promise<void> {
  try {
    await stripeClient(config).v2.core.accounts.update(accountId, {
      defaults: { profile: { business_url: businessUrl } },
    });
  } catch (err) {
    console.error(`[stripe/profile] could not update business URL for ${accountId}:`, err);
  }
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
 * Stops Stripe paying the balance out on its own schedule, so every payout
 * starts from the dashboard. Payout settings on v2 accounts live in balance
 * settings rather than on the account.
 */
export async function setManualPayouts(config: StripeConfig, accountId: string): Promise<void> {
  await stripeClient(config).balanceSettings.update(
    { payments: { payouts: { schedule: { interval: "manual" } } } },
    { stripeAccount: accountId },
  );
}

export interface PayoutBalance {
  /** Minor units that can be paid out now. */
  available: number;
  /** Minor units still settling, which become available later. */
  pending: number;
  currency: string;
}

/**
 * The balance in the creator's collecting currency. Stripe converts charges in
 * a currency the account cannot settle into its default one, so when a creator
 * has switched currency since onboarding the balance may hold only that one.
 */
export async function retrieveBalance(
  config: StripeConfig,
  accountId: string,
  currency: string,
): Promise<PayoutBalance> {
  const balance = await stripeClient(config).balance.retrieve({}, { stripeAccount: accountId });
  const settled =
    balance.available.find((entry) => entry.currency === currency)?.currency ??
    balance.available[0]?.currency ??
    currency;
  const sum = (entries: ReadonlyArray<{ amount: number; currency: string }>) =>
    entries
      .filter((entry) => entry.currency === settled)
      .reduce((total, entry) => total + entry.amount, 0);
  return { available: sum(balance.available), pending: sum(balance.pending), currency: settled };
}

export async function createPayout(
  config: StripeConfig,
  accountId: string,
  amount: number,
  currency: string,
): Promise<void> {
  await stripeClient(config).payouts.create({ amount, currency }, { stripeAccount: accountId });
}

export interface ChargeAmounts {
  /** What the creator keeps, after our fee. */
  net: number | null;
  /** The fee we actually collected, which the pricing scheme decides. */
  applicationFee: number | null;
}

/**
 * What a direct charge settled to. Both figures come from the connected
 * account's balance transaction, which is the only place they are stated:
 * the application fee is sized by the platform pricing scheme rather than by
 * us, so it cannot be recomputed from the amount.
 */
export async function chargeAmounts(
  config: StripeConfig,
  accountId: string,
  paymentIntentId: string,
): Promise<ChargeAmounts> {
  const intent = await stripeClient(config).paymentIntents.retrieve(
    paymentIntentId,
    { expand: ["latest_charge.balance_transaction"] },
    { stripeAccount: accountId },
  );
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const transaction =
    charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
  const fee = transaction?.fee_details.find((detail) => detail.type === "application_fee");
  return { net: transaction?.net ?? null, applicationFee: fee?.amount ?? null };
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

/**
 * Registers the creator's site with Stripe so wallets can appear in the
 * payment sheet. Without this Apple Pay, Google Pay and Link are hidden and
 * the supporter only ever sees cards and iDEAL. The hosted page origin is
 * registered for every account, since every creator has a hosted page.
 *
 * The registration belongs to the connected account, because a direct charge
 * makes the creator the merchant of record. Creating a domain that already
 * exists returns the existing one, so this is safe to call on every sync, and
 * a failure is only ever a missing wallet -- never a blocked payment -- so it
 * is logged rather than raised.
 */
export async function registerWalletDomains(
  config: StripeConfig,
  accountId: string,
  siteUrls: string[],
): Promise<void> {
  const client = stripeClient(config);
  const hostedOrigin = hostedPageOrigin();
  const domains = new Set(walletDomains(hostedOrigin ? [...siteUrls, hostedOrigin] : siteUrls));
  for (const domain of domains) {
    try {
      await client.paymentMethodDomains.create(
        { domain_name: domain },
        { stripeAccount: accountId },
      );
    } catch (err) {
      console.error(`[stripe/wallets] could not register ${domain}:`, err);
    }
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
      // No application_fee_amount: an explicit fee overrides the platform
      // pricing scheme, and the scheme is the only place the fee rule lives.
      payment_intent_data: { metadata },
      metadata,
      return_url: returnUrlWithMarker(input.returnUrl),
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
