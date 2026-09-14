import { describe, expect, test } from "bun:test";
import { session } from "./harness";

// The harness sets the database URL and registers mock.module replacements
// before any src module loads; static imports would hoist past that setup.
const { app } = await import("../src/index");

function get(path: string, origin?: string): Request {
  return new Request(`http://localhost${path}`, {
    method: "GET",
    headers: origin ? { origin } : {},
  });
}

describe("GET /health", () => {
  test("is never cached, at the edge or anywhere else", async () => {
    const response = await app.handle(get("/health"));

    expect(response.status).toBe(200);
    // A missing header is the bug: the CDN fills the gap with a 30 day default.
    expect(response.headers.get("cache-control")).toBe("no-cache");
  });
});

describe("CORS on the public widget routes", () => {
  // A credentialed, Origin-varying response is one a CDN treats as belonging
  // to a single caller, so these headers are what decides whether the goal
  // meter's five minute cache survives the edge.
  const publicPaths = ["/api/widget/goal/qg_missing/progress", "/api/widget/image/nonsense.png"];

  for (const path of publicPaths) {
    test(`${path} answers every origin without credentials`, async () => {
      const response = await app.handle(get(path, "https://someone-elses-site.example"));

      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(response.headers.get("access-control-allow-credentials")).toBeNull();
      expect(response.headers.get("vary")).toBeNull();
      expect(response.headers.get("access-control-expose-headers")).toBeNull();
    });
  }

  test("the dashboard routes still get their credentialed headers", async () => {
    session.user = { id: "user_1", email: "creator@example.com" };
    const response = await app.handle(get("/api/me", "http://localhost:4321"));

    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:4321");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
