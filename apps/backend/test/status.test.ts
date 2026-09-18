import { describe, expect, test } from "bun:test";
import type { V2Account } from "../src/stripe/client";
import { deriveOnboarding } from "../src/stripe/status";

const LOCAL = ["ideal_payments", "bancontact_payments"];

type Status = "active" | "pending" | "restricted" | "unsupported";

function account(
  capabilities: { card?: Status; ideal?: Status; bancontact?: Status; payouts?: Status },
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
          ...(capabilities.bancontact
            ? { bancontact_payments: { status: capabilities.bancontact } }
            : {}),
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
    expect(deriveOnboarding(account({}), { eligibleCapabilities: LOCAL })).toEqual({
      identity: "todo",
      localMethods: "todo",
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

  test("a method Stripe reports unsupported does not hold the group back", () => {
    const result = deriveOnboarding(account({ ideal: "unsupported", bancontact: "active" }), {
      eligibleCapabilities: LOCAL,
    });
    expect(result.localMethods).toBe("done");
  });

  test("every method unsupported reads as unavailable, not done", () => {
    const result = deriveOnboarding(account({ ideal: "unsupported", bancontact: "unsupported" }), {
      eligibleCapabilities: LOCAL,
    });
    expect(result.localMethods).toBe("unavailable");
  });

  test("the group reports its least finished member", () => {
    const pending = deriveOnboarding(account({ ideal: "pending", bancontact: "active" }), {
      eligibleCapabilities: LOCAL,
    });
    expect(pending.localMethods).toBe("pending");

    const todo = deriveOnboarding(account({ bancontact: "active" }), {
      eligibleCapabilities: LOCAL,
    });
    expect(todo.localMethods).toBe("todo");
  });

  test("a local method stuck in review never blocks taking donations", () => {
    const result = deriveOnboarding(
      account({ card: "active", payouts: "active", ideal: "pending" }),
      { eligibleCapabilities: LOCAL },
    );
    expect(result.identity).toBe("done");
    expect(result.payouts).toBe("done");
    expect(result.localMethods).toBe("pending");
  });

  test("payouts read from the stripe_balance capability", () => {
    expect(deriveOnboarding(account({ payouts: "active" })).payouts).toBe("done");
    expect(deriveOnboarding(account({ payouts: "restricted" })).payouts).toBe("todo");
  });

  test("steps advance independently", () => {
    expect(
      deriveOnboarding(account({ card: "active", payouts: "restricted" }), {
        eligibleCapabilities: LOCAL,
      }),
    ).toEqual({
      identity: "done",
      localMethods: "todo",
      payouts: "todo",
      issues: {},
    });
  });

  test("a fully onboarded account has every step done", () => {
    expect(
      deriveOnboarding(
        account({ card: "active", ideal: "active", bancontact: "active", payouts: "active" }),
        { eligibleCapabilities: LOCAL },
      ),
    ).toEqual({ identity: "done", localMethods: "done", payouts: "done", issues: {} });
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

  test("a country with no eligible methods reports unavailable whatever Stripe says", () => {
    const options = { eligibleCapabilities: [] };
    expect(deriveOnboarding(account({}), options).localMethods).toBe("unavailable");
    expect(deriveOnboarding(account({ ideal: "active" }), options).localMethods).toBe("unavailable");
    expect(deriveOnboarding(account({ ideal: "pending" }), options).localMethods).toBe(
      "unavailable",
    );
  });

  test("local method eligibility leaves the other steps alone", () => {
    const result = deriveOnboarding(account({ card: "active", payouts: "active" }), {
      eligibleCapabilities: [],
    });
    expect(result.identity).toBe("done");
    expect(result.payouts).toBe("done");
  });

  test("an error on any local method lands on the one group", () => {
    const result = deriveOnboarding(
      account({ card: "active" }, [
        { code: "invalid_tax_id", restricts: ["bancontact_payments"] },
      ]),
      { eligibleCapabilities: LOCAL },
    );
    expect(result.issues.localMethods).toBe("invalidInformation");
  });
});
