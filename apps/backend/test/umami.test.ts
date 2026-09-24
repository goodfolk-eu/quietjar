import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { sendEvent, trackEvent, umamiFromEnv } from "../src/umami";

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

const fetchCalls: FetchCall[] = [];
const realFetch = globalThis.fetch;
const realFrontendUrl = process.env.PUBLIC_FRONTEND_URL;

function mockFetch(handler: (input: string, init?: RequestInit) => Response): void {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) =>
    handler(input.toString(), init)) as typeof fetch;
}

function configure(): void {
  process.env.UMAMI_BASE_URL = "https://umami.example.com/";
  process.env.UMAMI_WEBSITE_ID = "site_1";
  process.env.PUBLIC_FRONTEND_URL = "https://quietjar.example.com";
}

beforeEach(() => {
  delete process.env.UMAMI_BASE_URL;
  delete process.env.UMAMI_WEBSITE_ID;
  fetchCalls.length = 0;
  mockFetch(() => new Response("{}", { status: 200 }));
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (realFrontendUrl === undefined) delete process.env.PUBLIC_FRONTEND_URL;
  else process.env.PUBLIC_FRONTEND_URL = realFrontendUrl;
});

describe("umamiFromEnv", () => {
  test("is undefined when the website id is missing", () => {
    process.env.UMAMI_BASE_URL = "https://umami.example.com";
    expect(umamiFromEnv()).toBeUndefined();
  });

  test("strips trailing slashes and derives the hostname from the frontend url", () => {
    configure();
    expect(umamiFromEnv()).toEqual({
      baseUrl: "https://umami.example.com",
      websiteId: "site_1",
      hostname: "quietjar.example.com",
    });
  });
});

describe("trackEvent", () => {
  test("does nothing when Umami is not configured", () => {
    mockFetch((url, init) => {
      fetchCalls.push({ url, init });
      return new Response("{}");
    });
    trackEvent("signup");
    expect(fetchCalls).toHaveLength(0);
  });

  test("sends the named event with a browser-like user agent", async () => {
    const { promise: sent, resolve: markSent } = Promise.withResolvers<void>();
    mockFetch((url, init) => {
      fetchCalls.push({ url, init });
      markSent();
      return new Response("{}");
    });
    configure();
    trackEvent("signup");
    await sent;
    expect(fetchCalls).toHaveLength(1);
    const call = fetchCalls[0];
    expect(call.url).toBe("https://umami.example.com/api/send");
    expect(call.init?.method).toBe("POST");
    const headers = call.init?.headers as Record<string, string>;
    expect(headers["User-Agent"]).toStartWith("Mozilla/5.0");
    expect(JSON.parse(call.init?.body as string)).toEqual({
      type: "event",
      payload: {
        website: "site_1",
        hostname: "quietjar.example.com",
        url: "/signup",
        name: "signup",
        language: "en",
      },
    });
  });

  test("logs instead of throwing when the fetch fails", async () => {
    const { promise: logged, resolve: markLogged } = Promise.withResolvers<void>();
    const errors: unknown[] = [];
    const realError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
      markLogged();
    };
    try {
      configure();
      globalThis.fetch = (async (): Promise<Response> => {
        throw new Error("connection refused");
      }) as unknown as typeof fetch;
      trackEvent("signup");
      await logged;
      expect(String(errors[0])).toContain("connection refused");
    } finally {
      console.error = realError;
    }
  });
});

describe("sendEvent", () => {
  test("throws on a non-ok response", async () => {
    mockFetch(() => new Response("bad", { status: 400 }));
    const config = { baseUrl: "https://umami.example.com", websiteId: "site_1", hostname: "x" };
    await expect(sendEvent(config, "signup")).rejects.toThrow("HTTP 400");
  });
});
