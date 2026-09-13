import { describe, expect, test } from "bun:test";
import { isGoalWindow, monthStart, windowStart } from "../src/goals/window";

describe("monthStart", () => {
  test("snaps back to midnight UTC on the first", () => {
    expect(monthStart(Date.UTC(2026, 8, 13, 14, 37, 12))).toBe(Date.UTC(2026, 8, 1));
  });

  test("is already the answer on the first", () => {
    const first = Date.UTC(2026, 8, 1);
    expect(monthStart(first)).toBe(first);
  });

  test("stays inside January rather than rolling back a year", () => {
    expect(monthStart(Date.UTC(2026, 0, 31, 23, 59, 59))).toBe(Date.UTC(2026, 0, 1));
  });

  test("a millisecond before a month starts belongs to the month before", () => {
    expect(monthStart(Date.UTC(2026, 8, 1) - 1)).toBe(Date.UTC(2026, 7, 1));
  });
});

describe("windowStart", () => {
  test("a lifetime goal counts from the beginning", () => {
    expect(windowStart("lifetime", Date.UTC(2026, 8, 13))).toBe(0);
  });

  test("a monthly goal counts from the first of the month", () => {
    expect(windowStart("monthly", Date.UTC(2026, 8, 13))).toBe(Date.UTC(2026, 8, 1));
  });
});

describe("isGoalWindow", () => {
  test("accepts the two windows and nothing else", () => {
    expect(isGoalWindow("monthly")).toBe(true);
    expect(isGoalWindow("lifetime")).toBe(true);
    expect(isGoalWindow("weekly")).toBe(false);
    expect(isGoalWindow(undefined)).toBe(false);
  });
});
