import { describe, expect, test } from "bun:test";
import "./setup";
import { pendingSessionId } from "../src/return";

describe("pendingSessionId", () => {
  test("reads the marker from the query string", () => {
    expect(pendingSessionId("?qj_donation=cs_live_abc", "")).toBe("cs_live_abc");
  });

  test("reads the marker a hash router buried in the fragment", () => {
    expect(pendingSessionId("", "#/?qj_donation=cs_live_abc")).toBe("cs_live_abc");
    expect(pendingSessionId("", "#/thanks?foo=1&qj_donation=cs_live_abc")).toBe("cs_live_abc");
  });

  test("is null without a marker, or with an empty one", () => {
    expect(pendingSessionId("", "#/")).toBeNull();
    expect(pendingSessionId("?other=1", "#/page")).toBeNull();
    expect(pendingSessionId("?qj_donation=", "")).toBeNull();
    expect(pendingSessionId("?qj_donation=%20%20", "")).toBeNull();
  });

  test("prefers the query string when both carry a marker", () => {
    expect(pendingSessionId("?qj_donation=real", "#/?qj_donation=stale")).toBe("real");
  });
});
