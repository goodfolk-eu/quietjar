import { describe, expect, test } from "bun:test";
import type { V2Account } from "../src/stripe/client";
import { deriveOnboarding } from "../src/stripe/status";

type Status = "active" | "pending" | "restricted" | "unsupported";

function account(
  capabilities: { card?: Status; ideal?: Status; payouts?: Status },
  entries: Array<{ code: string; restricts: string[] }> = [],
): V2Account {
  return {
    id: "acct_test",
    requirements: {
      entries: entries.map((entry) => ({
        errors: [{ code: entry.code, description: entry.code }],
        impact: { restricts_capabilities: entry.restricts.map((c) => ({ capability: c })) },
      })),
    },
    configuration: {
      merchant: {
        capabilities: {
          ...(capabilities.card ? { card_payments: { status: capabilities.card } } : {}),
          ...(capabilities.ideal ? { ideal_payments: { status: capabilities.ideal } } : {}),
          ...(capabilities.payouts
            ? { stripe_balance: { payouts: { status: capabilities.payouts } } }
            : {}),
        },
      },
    },
  } as unknown as V2Account;
}

describe("deriveOnboarding", () => {
  test("a freshly created account has everything to do", () => {
    expect(deriveOnboarding(account({}))).toEqual({
      identity: "todo",
      ideal: "todo",
      payouts: "todo",
      issues: {},
    });
  });

  test("a restricted capability is still to do", () => {
    expect(deriveOnboarding(account({ card: "restricted" })).identity).toBe("todo");
  });

  test("a pending capability is in review", () => {
    expect(deriveOnboarding(account({ card: "pending" })).identity).toBe("pending");
  });

  test("iDEAL is unavailable when the account's country cannot use it", () => {
    expect(deriveOnboarding(account({ ideal: "unsupported" })).ideal).toBe("unavailable");
  });

  test("payouts read from the stripe_balance capability", () => {
    expect(deriveOnboarding(account({ payouts: "active" })).payouts).toBe("done");
    expect(deriveOnboarding(account({ payouts: "restricted" })).payouts).toBe("todo");
  });

  test("steps advance independently", () => {
    expect(deriveOnboarding(account({ card: "active", payouts: "restricted" }))).toEqual({
      identity: "done",
      ideal: "todo",
      payouts: "todo",
      issues: {},
    });
  });

  test("a fully onboarded account has every step done", () => {
    expect(
      deriveOnboarding(account({ card: "active", ideal: "active", payouts: "active" })),
    ).toEqual({ identity: "done", ideal: "done", payouts: "done", issues: {} });
  });

  test("a missing merchant configuration does not throw", () => {
    expect(deriveOnboarding({ id: "acct_test" } as unknown as V2Account).identity).toBe("todo");
  });

  test("a rejected submission reports why, without leaving to do", () => {
    const result = deriveOnboarding(
      account({ card: "restricted" }, [
        {
          code: "verification_failed_keyed_identity",
          restricts: ["card_payments", "stripe_balance.payouts"],
        },
      ]),
    );
    expect(result.identity).toBe("todo");
    expect(result.issues).toEqual({
      identity: "verificationFailed",
      payouts: "verificationFailed",
    });
  });

  test("issue codes collapse into what a creator can act on", () => {
    const invalid = deriveOnboarding(
      account({ card: "restricted" }, [
        { code: "invalid_street_address", restricts: ["card_payments"] },
      ]),
    );
    expect(invalid.issues.identity).toBe("invalidInformation");

    const other = deriveOnboarding(
      account({ card: "restricted" }, [{ code: "rejected_other", restricts: ["card_payments"] }]),
    );
    expect(other.issues.identity).toBe("needsAttention");
  });

  test("requirements without errors are not issues", () => {
    const result = deriveOnboarding(account({ card: "restricted" }));
    expect(result.issues).toEqual({});
  });
});
