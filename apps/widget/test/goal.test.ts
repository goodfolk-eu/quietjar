import { afterEach, describe, expect, test } from "bun:test";
import "./setup";
import { fetchGoalProgress, isGoalMet, meterLabel, meterRatio } from "../src/goal";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function respondWith(body: unknown, status = 200): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("meterLabel", () => {
  test("reads as progress toward the target", () => {
    expect(meterLabel({ raised: 4500, target: 10_000, currency: "eur" })).toBe("€45 of €100 raised");
  });

  test("keeps the cents when a total has them", () => {
    expect(meterLabel({ raised: 4550, target: 10_000, currency: "eur" })).toBe(
      "€45.50 of €100 raised",
    );
  });

  test("reports what came in once the goal is met", () => {
    expect(meterLabel({ raised: 10_000, target: 10_000, currency: "eur" })).toBe(
      "Goal reached, €100 raised",
    );
  });

  test("an overshoot reports the real total rather than the target", () => {
    expect(meterLabel({ raised: 12_000, target: 10_000, currency: "eur" })).toBe(
      "Goal reached, €120 raised",
    );
  });
});

describe("meterRatio", () => {
  test("is the share of the target raised", () => {
    expect(meterRatio({ raised: 2500, target: 10_000, currency: "eur" })).toBe(0.25);
  });

  test("an overshoot fills the bar exactly", () => {
    expect(meterRatio({ raised: 30_000, target: 10_000, currency: "eur" })).toBe(1);
  });

  test("nothing raised is an empty bar", () => {
    expect(meterRatio({ raised: 0, target: 10_000, currency: "eur" })).toBe(0);
  });

  test("a target of nothing cannot be divided into, and is not met", () => {
    expect(meterRatio({ raised: 500, target: 0, currency: "eur" })).toBe(0);
    expect(isGoalMet({ raised: 500, target: 0, currency: "eur" })).toBe(false);
  });
});

// Lookups are memoised for the life of the page, so every case needs its own
// goal id rather than reusing one across tests.
describe("fetchGoalProgress", () => {
  test("asks the goal's progress endpoint and returns the amounts", async () => {
    const seen: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      seen.push(String(input));
      return new Response(JSON.stringify({ raised: 4500, target: 10_000, currency: "eur" }));
    }) as unknown as typeof fetch;

    expect(await fetchGoalProgress("https://api.test", "qg_amounts")).toEqual({
      raised: 4500,
      target: 10_000,
      currency: "eur",
    });
    expect(seen).toEqual(["https://api.test/api/widget/goal/qg_amounts/progress"]);
  });

  test("asks once however many widgets share the goal", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ raised: 100, target: 1000, currency: "eur" }));
    }) as unknown as typeof fetch;

    const both = await Promise.all([
      fetchGoalProgress("https://api.test", "qg_shared"),
      fetchGoalProgress("https://api.test", "qg_shared"),
    ]);
    await fetchGoalProgress("https://api.test", "qg_shared");

    expect(calls).toBe(1);
    expect(both[0]).toEqual(both[1]);
  });

  test("returns nothing for an archived or unknown goal", async () => {
    respondWith({ error: "unknown_goal" }, 404);
    expect(await fetchGoalProgress("https://api.test", "qg_gone")).toBeNull();
  });

  test("returns nothing when the response is not a progress shape", async () => {
    respondWith({ raised: "lots", target: 10_000, currency: "eur" });
    expect(await fetchGoalProgress("https://api.test", "qg_shape")).toBeNull();
  });

  test("a network failure drops the meter rather than throwing", async () => {
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await fetchGoalProgress("https://api.test", "qg_offline")).toBeNull();
  });
});
