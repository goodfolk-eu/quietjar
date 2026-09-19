import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { keilaFromEnv, pushSubscriber, submitSubscriber } from "../src/keila";

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

const fetchCalls: FetchCall[] = [];
const realFetch = globalThis.fetch;

function ok(): Response {
  return new Response(JSON.stringify({ data: { id: "c_1" } }), { status: 200 });
}

function mockFetch(handler: (input: string, init?: RequestInit) => Response): void {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) =>
    handler(input.toString(), init)) as typeof fetch;
}

beforeEach(() => {
  delete process.env.KEILA_BASE_URL;
  delete process.env.KEILA_API_KEY;
  delete process.env.KEILA_FORM_ID;
  fetchCalls.length = 0;
  mockFetch(() => ok());
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const user = { id: "user_1", email: "jane@example.com" };

function configure(base = "https://keila.example.com"): void {
  process.env.KEILA_BASE_URL = base;
  process.env.KEILA_API_KEY = "test-key";
  process.env.KEILA_FORM_ID = "form_1";
}

describe("keilaFromEnv", () => {
  test("returns undefined when any variable is missing", () => {
    process.env.KEILA_BASE_URL = "https://keila.example.com";
    process.env.KEILA_API_KEY = "test-key";
    expect(keilaFromEnv()).toBeUndefined();
  });

  test("returns the config and strips a trailing slash from the base url", () => {
    configure("https://keila.example.com/");
    expect(keilaFromEnv()).toEqual({
      baseUrl: "https://keila.example.com",
      apiKey: "test-key",
      formId: "form_1",
    });
  });
});

describe("pushSubscriber", () => {
  test("skips when Keila is not configured", () => {
    pushSubscriber(user);
    expect(fetchCalls).toHaveLength(0);
  });

  test("submits the email with the user id and bearer auth", async () => {
    const { promise: submitted, resolve: markSubmitted } = Promise.withResolvers<void>();
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: input.toString(), init });
      markSubmitted();
      return ok();
    }) as typeof fetch;
    configure();
    pushSubscriber(user);
    await submitted;
    expect(fetchCalls).toHaveLength(1);
    const call = fetchCalls[0];
    expect(call.url).toBe("https://keila.example.com/api/v1/forms/form_1/actions/submit");
    expect(call.init?.method).toBe("POST");
    expect(call.init?.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer test-key",
    });
    expect(JSON.parse(call.init?.body as string)).toEqual({
      data: {
        email: "jane@example.com",
        external_id: "user_1",
        data: { productQuietJar: "true" },
      },
    });
  });

  test("does not throw when the fetch fails", async () => {
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
      pushSubscriber(user);
      await logged;
      expect(errors).toHaveLength(1);
      expect(String(errors[0])).toContain("connection refused");
    } finally {
      console.error = realError;
    }
  });
});

describe("submitSubscriber", () => {
  const config = {
    baseUrl: "https://keila.example.com",
    apiKey: "test-key",
    formId: "form_1",
  };

  test("throws on a non-ok response", async () => {
    mockFetch(() => new Response("nope", { status: 422 }));
    await expect(submitSubscriber(config, user)).rejects.toThrow("HTTP 422");
  });

  test("accepts the double-opt-in 202 response as success", async () => {
    mockFetch(() => new Response("{}", { status: 202 }));
    await expect(submitSubscriber(config, user)).resolves.toBeUndefined();
  });
});
