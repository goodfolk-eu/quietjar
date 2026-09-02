import { afterEach, describe, expect, test } from "bun:test";
import "./setup";
import { isDismissed, persistDismissal } from "../src/dismiss";

afterEach(() => {
  sessionStorage.clear();
});

describe("dismissal storage", () => {
  test("is not dismissed in a fresh session", () => {
    expect(isDismissed()).toBe(false);
  });

  test("persists the dismissal for the session", () => {
    persistDismissal();

    expect(isDismissed()).toBe(true);
  });
});
