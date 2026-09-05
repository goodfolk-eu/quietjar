import { describe, expect, test } from "bun:test";
import { applicationFee } from "../src/stripe/client";
import { isValidAmount, RateLimiter } from "../src/pay/limits";
import { isAllowedOrigin, isAllowedReturnUrl } from "../src/pay/origin";
import { normalizeSiteUrl } from "../src/sites/url";

const live = { allowLocalhost: false };
const testMode = { allowLocalhost: true };

describe("isAllowedOrigin", () => {
  test("accepts the registered origin and its www twin", () => {
    expect(isAllowedOrigin("https://example.com", "https://example.com", live)).toBe(true);
    expect(isAllowedOrigin("https://www.example.com", "https://example.com", live)).toBe(true);
    expect(isAllowedOrigin("https://example.com", "https://www.example.com", live)).toBe(true);
  });

  test("refuses another site, a subdomain, and plain http", () => {
    expect(isAllowedOrigin("https://evil.com", "https://example.com", live)).toBe(false);
    expect(isAllowedOrigin("https://app.example.com", "https://example.com", live)).toBe(false);
    expect(isAllowedOrigin("http://example.com", "https://example.com", live)).toBe(false);
  });

  test("refuses everything while no site URL is registered", () => {
    expect(isAllowedOrigin("https://example.com", null, live)).toBe(false);
    expect(isAllowedOrigin(null, "https://example.com", live)).toBe(false);
  });

  test("allows localhost only in test mode", () => {
    expect(isAllowedOrigin("http://localhost:5175", null, testMode)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:4321", null, testMode)).toBe(true);
    expect(isAllowedOrigin("http://localhost:5175", null, live)).toBe(false);
  });
});

describe("isAllowedReturnUrl", () => {
  test("accepts any page of the registered site", () => {
    expect(isAllowedReturnUrl("https://example.com/post/1?a=b", "https://example.com", live)).toBe(
      true,
    );
  });

  test("refuses a redirect to somewhere else", () => {
    expect(isAllowedReturnUrl("https://evil.com/", "https://example.com", live)).toBe(false);
    expect(isAllowedReturnUrl("javascript:alert(1)", "https://example.com", live)).toBe(false);
  });
});

describe("isValidAmount", () => {
  test("accepts amounts within bounds, down to the cent", () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(7.5)).toBe(true);
    expect(isValidAmount(500)).toBe(true);
  });

  test("refuses amounts outside the bounds or finer than a cent", () => {
    expect(isValidAmount(0.5)).toBe(false);
    expect(isValidAmount(501)).toBe(false);
    expect(isValidAmount(5.555)).toBe(false);
    expect(isValidAmount(Number.NaN)).toBe(false);
    expect(isValidAmount(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("RateLimiter", () => {
  test("allows up to the limit and refuses the next call", () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("a", 100)).toBe(true);
    expect(limiter.take("a", 200)).toBe(false);
  });

  test("counts each key separately and starts fresh after the window", () => {
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("b", 0)).toBe(true);
    expect(limiter.take("a", 500)).toBe(false);
    expect(limiter.take("a", 1001)).toBe(true);
  });
});

describe("applicationFee", () => {
  test("takes 5 percent, rounded down to the minor unit", () => {
    expect(applicationFee(500)).toBe(25);
    expect(applicationFee(199)).toBe(9);
    expect(applicationFee(100)).toBe(5);
  });
});

describe("normalizeSiteUrl", () => {
  test("keeps the origin and drops everything else", () => {
    expect(normalizeSiteUrl("https://example.com/blog?x=1")).toBe("https://example.com");
    expect(normalizeSiteUrl("  https://www.example.com  ")).toBe("https://www.example.com");
  });

  test("assumes https when the creator leaves the scheme off", () => {
    expect(normalizeSiteUrl("example.com")).toBe("https://example.com");
  });

  test("refuses input that is not a site", () => {
    expect(normalizeSiteUrl("")).toBeNull();
    expect(normalizeSiteUrl(null)).toBeNull();
    expect(normalizeSiteUrl("localhost")).toBeNull();
    expect(normalizeSiteUrl("ftp://example.com")).toBeNull();
  });
});
