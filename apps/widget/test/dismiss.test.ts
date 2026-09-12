import { afterEach, describe, expect, test } from "bun:test";
import "./setup";
import { isDismissed, persistDismissal } from "../src/dismiss";

const DAY_MS = 24 * 60 * 60 * 1000;

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("dismissal storage", () => {
  test("is not dismissed in a fresh session", () => {
    expect(isDismissed()).toBe(false);
  });

  test("session mode persists the dismissal for the session", () => {
    persistDismissal("session", 7);

    expect(isDismissed()).toBe(true);
  });

  test("days mode stores an until timestamp in localStorage", () => {
    persistDismissal("days", 2);

    expect(isDismissed()).toBe(true);
    const raw = localStorage.getItem("quietjar-dismissed");
    expect(raw).not.toBeNull();
    const parsed: { until?: string } = JSON.parse(raw!);
    const untilValue = parsed.until;
    if (untilValue === undefined) throw new Error("days mode must write an until timestamp");
    const until = new Date(untilValue);
    expect(Math.abs(until.getTime() - (Date.now() + 2 * DAY_MS))).toBeLessThan(5000);
    expect(sessionStorage.getItem("quietjar-dismissed")).toBeNull();
  });

  test("stops hiding once the day count has passed", () => {
    localStorage.setItem(
      "quietjar-dismissed",
      JSON.stringify({ until: new Date(Date.now() - DAY_MS).toISOString() }),
    );

    expect(isDismissed()).toBe(false);
  });

  test("forever mode persists without an expiry", () => {
    persistDismissal("forever", 7);

    expect(isDismissed()).toBe(true);
    const parsed: { forever?: boolean } = JSON.parse(
      localStorage.getItem("quietjar-dismissed")!,
    );
    expect(parsed.forever).toBe(true);
  });

  test("never mode leaves nothing behind", () => {
    persistDismissal("never", 7);

    expect(sessionStorage.getItem("quietjar-dismissed")).toBeNull();
    expect(localStorage.getItem("quietjar-dismissed")).toBeNull();
    expect(isDismissed()).toBe(false);
  });

  test("ignores an unreadable or unusable record", () => {
    localStorage.setItem("quietjar-dismissed", "not json");
    expect(isDismissed()).toBe(false);

    localStorage.setItem("quietjar-dismissed", JSON.stringify({ until: "nope" }));
    expect(isDismissed()).toBe(false);
  });

  test("survives storage being unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });

    expect(() => persistDismissal("days", 7)).not.toThrow();
    expect(isDismissed()).toBe(false);

    if (original) Object.defineProperty(globalThis, "localStorage", original);
  });
});
