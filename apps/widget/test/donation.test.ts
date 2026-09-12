import { beforeEach, describe, expect, test } from "bun:test";
import "./setup";
import { donationHideActive, persistDonation, readDonation } from "../src/donation";

describe("donation storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("has nothing to report before a donation", () => {
    expect(readDonation()).toBeNull();
  });

  test("stores the date and the site it was given to", () => {
    const date = new Date("2026-09-04T09:12:33.021Z");
    persistDonation("qj_abc", date, 30);

    expect(readDonation()).toEqual({
      date: "2026-09-04T09:12:33.021Z",
      site: "qj_abc",
      hideUntil: "2026-10-04T09:12:33.021Z",
    });
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

    expect(() => persistDonation("qj_abc", new Date(), 30)).not.toThrow();
    expect(readDonation()).toBeNull();

    if (original) Object.defineProperty(globalThis, "localStorage", original);
  });

  test("records how long the widget stays hidden", () => {
    const date = new Date("2026-09-04T09:12:33.021Z");
    persistDonation("qj_abc", date, 14);

    expect(readDonation()).toEqual({
      date: "2026-09-04T09:12:33.021Z",
      site: "qj_abc",
      hideUntil: "2026-09-18T09:12:33.021Z",
    });
  });

  test("reports an active step-back only while the hide lasts", () => {
    persistDonation("qj_abc", new Date("2026-09-04T09:12:33.021Z"), 30);

    expect(donationHideActive(new Date("2026-09-10T00:00:00.000Z"))).toBe(true);
    expect(donationHideActive(new Date("2026-10-04T09:12:33.021Z"))).toBe(false);
    expect(donationHideActive(new Date("2026-10-05T00:00:00.000Z"))).toBe(false);
  });

  test("no step-back without a recorded donation", () => {
    expect(donationHideActive()).toBe(false);
  });

  test("no step-back from a record without a hide window", () => {
    localStorage.setItem(
      "quietjar-donated",
      JSON.stringify({ date: "2026-09-04T09:12:33.021Z", site: "qj_abc" }),
    );

    expect(donationHideActive()).toBe(false);
  });
});
