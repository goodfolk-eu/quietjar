import { describe, expect, test } from "bun:test";
import { breakdown, clampAmount, MAX_AMOUNT, MIN_AMOUNT } from "../src/lib/fees";

describe("breakdown", () => {
  test("charges the floor while 5% is worth less than it", () => {
    expect(breakdown(1)).toMatchObject({ quietjar: 0.5, net: 0.5, atMinimum: true });
    expect(breakdown(5)).toMatchObject({ quietjar: 0.5, net: 4.5, atMinimum: true });
    expect(breakdown(9.99)).toMatchObject({ quietjar: 0.5, net: 9.49, atMinimum: true });
  });

  test("hands over to the percentage at ten euro", () => {
    // The two are equal here, and the page says 5% from this point up.
    expect(breakdown(10)).toMatchObject({ quietjar: 0.5, net: 9.5, atMinimum: false });
    expect(breakdown(10.01)).toMatchObject({ quietjar: 0.5, net: 9.51, atMinimum: false });
    expect(breakdown(10.2)).toMatchObject({ quietjar: 0.51, net: 9.69, atMinimum: false });
  });

  test("keeps taking 5% with no ceiling", () => {
    expect(breakdown(25)).toMatchObject({ quietjar: 1.25, net: 23.75, atMinimum: false });
    expect(breakdown(100)).toMatchObject({ quietjar: 5, net: 95, atMinimum: false });
    expect(breakdown(500)).toMatchObject({ quietjar: 25, net: 475, atMinimum: false });
  });

  test("clamps an amount outside the donation bounds before charging it", () => {
    expect(breakdown(0.2).amount).toBe(MIN_AMOUNT);
    expect(breakdown(9000).amount).toBe(MAX_AMOUNT);
    expect(breakdown(Number.NaN).amount).toBe(MIN_AMOUNT);
  });
});

describe("clampAmount", () => {
  test("rounds to whole cents", () => {
    expect(clampAmount(12.345)).toBe(12.35);
  });
});
