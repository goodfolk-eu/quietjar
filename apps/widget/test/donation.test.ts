import { beforeEach, describe, expect, test } from "bun:test";
import "./setup";
import { persistDonation, readDonation } from "../src/donation";

describe("donation storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("has nothing to report before a donation", () => {
    expect(readDonation()).toBeNull();
  });

  test("stores the date and the site it was given to", () => {
    const date = new Date("2026-09-04T09:12:33.021Z");
    persistDonation("qj_abc", date);

    expect(readDonation()).toEqual({ date: "2026-09-04T09:12:33.021Z", site: "qj_abc" });
  });

  test("ignores a value written by an older or broken format", () => {
    localStorage.setItem("quietjar-donated", "2026-09-04");
    expect(readDonation()).toBeNull();

    localStorage.setItem("quietjar-donated", JSON.stringify({ date: 12 }));
    expect(readDonation()).toBeNull();
  });

  test("survives storage being unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });

    expect(() => persistDonation("qj_abc")).not.toThrow();
    expect(readDonation()).toBeNull();

    if (original) Object.defineProperty(globalThis, "localStorage", original);
  });
});
