import { LOCAL_METHOD_CAPABILITIES } from "../sites/currency";
import type { V2Account } from "./client";

/**
 * Where a creator stands on one onboarding step.
 *
 * `pending` matters: Stripe verifies asynchronously, so a step can be complete
 * from the creator's side while the capability is still inactive. Without it, a
 * finished step looks unstarted for as long as review takes.
 */
export type StepState = "todo" | "pending" | "done" | "unavailable";

/**
 * Why a step still needs the creator. Stripe reports dozens of specific error
 * codes; they collapse to the handful of things a creator can actually act on.
 */
export type StepIssue = "verificationFailed" | "invalidInformation" | "needsAttention";

export type StepKey = "identity" | "localMethods" | "payouts";

export interface OnboardingStatus {
  identity: StepState;
  localMethods: StepState;
  payouts: StepState;
  issues: Partial<Record<StepKey, StepIssue>>;
}

interface Capability {
  status?: "active" | "pending" | "restricted" | "unsupported";
}

type MerchantCapabilities = Record<string, Capability | undefined> & {
  stripe_balance?: { payouts?: Capability };
};

/**
 * Stripe returns null for a capability it has never been asked about, which
 * means the same thing to a creator as `restricted`: still to do.
 */
function toStepState(capability: Capability | null | undefined): StepState {
  switch (capability?.status) {
    case "active":
      return "done";
    case "pending":
      return "pending";
    case "unsupported":
      return "unavailable";
    default:
      return "todo";
  }
}

function toIssue(code: string): StepIssue {
  if (code.startsWith("verification_")) return "verificationFailed";
  if (code.startsWith("invalid_")) return "invalidInformation";
  return "needsAttention";
}

function stepForCapability(capability: string): StepKey | null {
  if (capability === "card_payments") return "identity";
  if (capability === "stripe_balance.payouts") return "payouts";
  if ((LOCAL_METHOD_CAPABILITIES as readonly string[]).includes(capability)) return "localMethods";
  return null;
}

/**
 * A submitted step that Stripe rejected still reads as `todo`, which on its own
 * looks like the creator never started it. Surfacing the reason is what tells
 * them to go back in.
 */
function collectIssues(account: V2Account): Partial<Record<StepKey, StepIssue>> {
  const issues: Partial<Record<StepKey, StepIssue>> = {};
  for (const entry of account.requirements?.entries ?? []) {
    const [error] = entry.errors ?? [];
    if (!error) continue;
    for (const restriction of entry.impact?.restricts_capabilities ?? []) {
      const step = stepForCapability(restriction.capability);
      if (step && !issues[step]) issues[step] = toIssue(error.code);
    }
  }
  return issues;
}

export interface DeriveOptions {
  /**
   * The local methods the account's country can request at all. Stripe only
   * reports that once a capability has been asked for, and asking for iDEAL
   * adds verification requirements to the account, so the answer is predicted
   * from the country instead of bought with a request.
   */
  eligibleCapabilities: readonly string[];
}

/**
 * One step for the whole group, reporting the least finished member. These
 * methods are best-effort: taking donations needs card payments and payouts,
 * so a single method stuck in review must never read as unfinished onboarding.
 */
function localMethodsState(
  capabilities: MerchantCapabilities | undefined,
  eligible: readonly string[],
): StepState {
  if (eligible.length === 0) return "unavailable";
  const states = eligible.map((name) => toStepState(capabilities?.[name]));
  // Our country table can be staler than Stripe's own answer, so a country we
  // thought eligible can still come back unsupported across the board.
  if (states.every((state) => state === "unavailable")) return "unavailable";
  if (states.every((state) => state === "done" || state === "unavailable")) return "done";
  if (states.some((state) => state === "pending")) return "pending";
  return "todo";
}

export function deriveOnboarding(
  account: V2Account,
  options: DeriveOptions = { eligibleCapabilities: LOCAL_METHOD_CAPABILITIES },
): OnboardingStatus {
  const capabilities = account.configuration?.merchant?.capabilities as
    | MerchantCapabilities
    | undefined;
  return {
    identity: toStepState(capabilities?.card_payments),
    localMethods: localMethodsState(capabilities, options.eligibleCapabilities),
    payouts: toStepState(capabilities?.stripe_balance?.payouts),
    issues: collectIssues(account),
  };
}
