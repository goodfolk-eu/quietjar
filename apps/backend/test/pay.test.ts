import { describe, expect, test } from "bun:test";
import { isValidAmount, RateLimiter } from "../src/pay/limits";
import {
  isAllowedOrigin,
  isAllowedReturnUrl,
  listedSiteFor,
  returnUrlWithMarker,
  walletDomains,
} from "../src/pay/origin";
import { normalizeSiteUrl, normalizeSiteUrls } from "../src/sites/url";

const live = { allowLocalhost: false };
const testMode = { allowLocalhost: true };

describe("isAllowedOrigin", () => {
  test("accepts the registered origin and its www twin", () => {
    expect(isAllowedOrigin("https://example.com", ["https://example.com"], live)).toBe(true);
    expect(isAllowedOrigin("https://www.example.com", ["https://example.com"], live)).toBe(true);
    expect(isAllowedOrigin("https://example.com", ["https://www.example.com"], live)).toBe(true);
  });

  test("accepts every registered site, and only those", () => {
    const sites = ["https://example.com", "https://project-b.dev"];
    expect(isAllowedOrigin("https://project-b.dev", sites, live)).toBe(true);
    expect(isAllowedOrigin("https://www.project-b.dev", sites, live)).toBe(true);
    expect(isAllowedOrigin("https://project-c.dev", sites, live)).toBe(false);
  });

  test("refuses another site, a subdomain, and plain http", () => {
    expect(isAllowedOrigin("https://evil.com", ["https://example.com"], live)).toBe(false);
    expect(isAllowedOrigin("https://app.example.com", ["https://example.com"], live)).toBe(false);
    expect(isAllowedOrigin("http://example.com", ["https://example.com"], live)).toBe(false);
  });

  test("refuses everything while no site URL is registered", () => {
    expect(isAllowedOrigin("https://example.com", [], live)).toBe(false);
    expect(isAllowedOrigin(null, ["https://example.com"], live)).toBe(false);
  });

  test("allows the dashboard origin for any site, so the preview can pay", () => {
    const dash = { allowLocalhost: false, dashboardOrigin: "https://quietjar.com" };
    expect(isAllowedOrigin("https://quietjar.com", ["https://example.com"], dash)).toBe(true);
    // Registered site unknown yet, and the dashboard still gets through.
    expect(isAllowedOrigin("https://quietjar.com", [], dash)).toBe(true);
  });

  test("the dashboard allowance is exact, not a domain suffix", () => {
    const dash = { allowLocalhost: false, dashboardOrigin: "https://quietjar.com" };
    expect(isAllowedOrigin("https://evil.quietjar.com", [], dash)).toBe(false);
    expect(isAllowedOrigin("https://quietjar.com.evil.com", [], dash)).toBe(false);
    expect(isAllowedOrigin("http://quietjar.com", [], dash)).toBe(false);
    expect(isAllowedOrigin("https://www.quietjar.com", [], dash)).toBe(false);
  });

  test("no dashboard origin configured lets nothing extra in", () => {
    expect(isAllowedOrigin("https://quietjar.com", [], { allowLocalhost: false })).toBe(false);
    expect(
      isAllowedOrigin("https://quietjar.com", [], {
        allowLocalhost: false,
        dashboardOrigin: null,
      }),
    ).toBe(false);
  });

  test("allows localhost only in test mode", () => {
    expect(isAllowedOrigin("http://localhost:5175", [], testMode)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:4321", [], testMode)).toBe(true);
    expect(isAllowedOrigin("http://localhost:5175", [], live)).toBe(false);
  });
});

describe("listedSiteFor", () => {
  const sites = ["https://example.com", "https://www.project-b.dev"];

  test("finds the registered site an origin belongs to, twin included", () => {
    expect(listedSiteFor("https://www.example.com", sites)).toBe("https://example.com");
    expect(listedSiteFor("https://project-b.dev", sites)).toBe("https://www.project-b.dev");
  });

  test("finds nothing for an unlisted, missing or malformed origin", () => {
    expect(listedSiteFor("https://quietjar.com", sites)).toBeNull();
    expect(listedSiteFor(null, sites)).toBeNull();
    expect(listedSiteFor("not a url", sites)).toBeNull();
  });
});

describe("isAllowedReturnUrl", () => {
  test("accepts any page of the registered site", () => {
    expect(isAllowedReturnUrl("https://example.com/post/1?a=b", ["https://example.com"], live)).toBe(
      true,
    );
  });

  test("accepts a return to the dashboard, where the preview lives", () => {
    expect(
      isAllowedReturnUrl("https://quietjar.com/dashboard/widget", ["https://example.com"], {
        allowLocalhost: false,
        dashboardOrigin: "https://quietjar.com",
      }),
    ).toBe(true);
  });

  test("refuses a redirect to somewhere else", () => {
    expect(isAllowedReturnUrl("https://evil.com/", ["https://example.com"], live)).toBe(false);
    expect(isAllowedReturnUrl("javascript:alert(1)", ["https://example.com"], live)).toBe(false);
  });
});

describe("isValidAmount", () => {
  test("accepts amounts within bounds, down to the cent", () => {
    expect(isValidAmount(1, "eur")).toBe(true);
    expect(isValidAmount(7.5, "eur")).toBe(true);
    expect(isValidAmount(500, "eur")).toBe(true);
  });

  test("refuses amounts outside the bounds or finer than a cent", () => {
    expect(isValidAmount(0.5, "eur")).toBe(false);
    expect(isValidAmount(501, "eur")).toBe(false);
    expect(isValidAmount(5.555, "eur")).toBe(false);
    expect(isValidAmount(Number.NaN, "eur")).toBe(false);
    expect(isValidAmount(Number.POSITIVE_INFINITY, "eur")).toBe(false);
  });

  test("scales the bounds to the currency", () => {
    // 500 is the euro ceiling but well inside a low-value currency's range,
    // and 1 is a valid euro donation but below their floor.
    expect(isValidAmount(501, "inr")).toBe(true);
    expect(isValidAmount(55_000, "inr")).toBe(true);
    expect(isValidAmount(55_001, "inr")).toBe(false);
    expect(isValidAmount(1, "inr")).toBe(false);
    expect(isValidAmount(1, "czk")).toBe(false);
    expect(isValidAmount(20, "czk")).toBe(true);
  });

  test("falls back to the default currency bounds for an unknown code", () => {
    expect(isValidAmount(500, "xyz")).toBe(true);
    expect(isValidAmount(501, "xyz")).toBe(false);
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

describe("normalizeSiteUrls", () => {
  test("normalises each entry and skips blanks, keeping the order", () => {
    expect(normalizeSiteUrls(["project-b.dev/docs", " ", "https://example.com"])).toEqual({
      ok: true,
      siteUrls: ["https://project-b.dev", "https://example.com"],
    });
  });

  test("keeps the first spelling of a site entered twice", () => {
    expect(normalizeSiteUrls(["www.example.com", "example.com", "https://www.example.com/a"])).toEqual(
      { ok: true, siteUrls: ["https://www.example.com"] },
    );
  });

  test("points at the first entry that is not a site", () => {
    expect(normalizeSiteUrls(["example.com", "nope", "localhost"])).toEqual({
      ok: false,
      invalidIndex: 1,
    });
  });

  test("an empty list is valid and stays empty", () => {
    expect(normalizeSiteUrls([])).toEqual({ ok: true, siteUrls: [] });
  });
});

describe("returnUrlWithMarker", () => {
  test("adds the marker to the query string", () => {
    expect(returnUrlWithMarker("https://example.com/blog")).toBe(
      "https://example.com/blog?qj_donation={CHECKOUT_SESSION_ID}",
    );
  });

  test("keeps the marker ahead of a hash route, where the widget can read it", () => {
    expect(returnUrlWithMarker("https://example.com/#/")).toBe(
      "https://example.com/?qj_donation={CHECKOUT_SESSION_ID}#/",
    );
    expect(returnUrlWithMarker("https://example.com/#/cards/rare")).toBe(
      "https://example.com/?qj_donation={CHECKOUT_SESSION_ID}#/cards/rare",
    );
  });

  test("keeps the page's own query and replaces a stale marker", () => {
    expect(returnUrlWithMarker("https://example.com/?page=2")).toBe(
      "https://example.com/?page=2&qj_donation={CHECKOUT_SESSION_ID}",
    );
    expect(returnUrlWithMarker("https://example.com/?qj_donation=cs_old")).toBe(
      "https://example.com/?qj_donation={CHECKOUT_SESSION_ID}",
    );
  });
});

describe("walletDomains", () => {
  test("registers both the apex and the www spelling", () => {
    expect(walletDomains(["https://example.com"])).toEqual(["example.com", "www.example.com"]);
    expect(walletDomains(["https://www.example.com"])).toEqual(["www.example.com", "example.com"]);
  });

  test("keeps a subdomain as it is, alongside its www twin", () => {
    expect(walletDomains(["https://blog.example.com"])).toEqual([
      "blog.example.com",
      "www.blog.example.com",
    ]);
  });

  test("covers every registered site", () => {
    expect(walletDomains(["https://example.com", "https://project-b.dev"])).toEqual([
      "example.com",
      "www.example.com",
      "project-b.dev",
      "www.project-b.dev",
    ]);
  });

  test("has nothing to register without a usable site URL", () => {
    expect(walletDomains([])).toEqual([]);
    expect(walletDomains(["not a url"])).toEqual([]);
  });
});
