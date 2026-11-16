import { describe, expect, test } from "bun:test";
import { localizedPath } from "../src/lib/links";

describe("localizedPath", () => {
  test("prefixes site paths with the locale", () => {
    expect(localizedPath("/developers", "en")).toBe("/en/developers/");
    expect(localizedPath("/", "en")).toBe("/");
    expect(localizedPath("/#pricing", "en")).toBe("/#pricing");
  });

  test("leaves absolute URLs untouched", () => {
    const repo = "https://codefloe.com/Goodfolk.eu/quietjar";
    expect(localizedPath(repo, "en")).toBe(repo);
    expect(localizedPath("mailto:hello@quietjar.com", "en")).toBe("mailto:hello@quietjar.com");
  });
});
