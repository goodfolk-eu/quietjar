import { describe, expect, test } from "bun:test";
import { bucketEarnings } from "../src/donations/series";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 2025-06-02 was a Monday, so week starts are easy to read off. */
const MONDAY = Date.UTC(2025, 5, 2);
const day = (at: number) => Math.floor(at / DAY_MS);

describe("bucketEarnings", () => {
  test("gives every day in the window a bucket, zero or not", () => {
    const points = bucketEarnings({
      daily: [{ day: day(MONDAY + DAY_MS), net: 900 }],
      bucket: "day",
      from: MONDAY,
      to: MONDAY + 3 * DAY_MS,
    });

    expect(points.map((point) => point.net)).toEqual([0, 900, 0, 0]);
    expect(points[0].at).toBe(MONDAY);
    expect(points[3].at).toBe(MONDAY + 3 * DAY_MS);
  });

  test("weeks start on Monday and gather the days inside them", () => {
    const points = bucketEarnings({
      daily: [
        { day: day(MONDAY), net: 100 },
        { day: day(MONDAY + 6 * DAY_MS), net: 200 },
        { day: day(MONDAY + 7 * DAY_MS), net: 400 },
      ],
      bucket: "week",
      from: MONDAY,
      to: MONDAY + 8 * DAY_MS,
    });

    expect(points).toEqual([
      { at: MONDAY, net: 300 },
      { at: MONDAY + 7 * DAY_MS, net: 400 },
    ]);
  });

  test("a window opening mid-week still starts at that week's Monday", () => {
    const wednesday = MONDAY + 2 * DAY_MS;
    const points = bucketEarnings({
      daily: [{ day: day(wednesday), net: 500 }],
      bucket: "week",
      from: wednesday,
      to: wednesday,
    });

    expect(points).toEqual([{ at: MONDAY, net: 500 }]);
  });

  test("months gather by calendar month, not by a fixed day count", () => {
    const points = bucketEarnings({
      daily: [
        { day: day(Date.UTC(2025, 0, 31)), net: 100 },
        { day: day(Date.UTC(2025, 1, 1)), net: 200 },
        { day: day(Date.UTC(2025, 1, 28)), net: 300 },
      ],
      bucket: "month",
      from: Date.UTC(2025, 0, 15),
      to: Date.UTC(2025, 2, 3),
    });

    expect(points).toEqual([
      { at: Date.UTC(2025, 0, 1), net: 100 },
      { at: Date.UTC(2025, 1, 1), net: 500 },
      { at: Date.UTC(2025, 2, 1), net: 0 },
    ]);
  });

  test("month buckets cross a year end", () => {
    const points = bucketEarnings({
      daily: [],
      bucket: "month",
      from: Date.UTC(2025, 10, 20),
      to: Date.UTC(2026, 0, 5),
    });

    expect(points.map((point) => point.at)).toEqual([
      Date.UTC(2025, 10, 1),
      Date.UTC(2025, 11, 1),
      Date.UTC(2026, 0, 1),
    ]);
  });

  test("no donations still yields the window, so the axis is never empty", () => {
    const points = bucketEarnings({ daily: [], bucket: "day", from: MONDAY, to: MONDAY });

    expect(points).toEqual([{ at: MONDAY, net: 0 }]);
  });

  test("days outside the window are dropped rather than widening it", () => {
    const points = bucketEarnings({
      daily: [
        { day: day(MONDAY - DAY_MS), net: 999 },
        { day: day(MONDAY), net: 100 },
      ],
      bucket: "day",
      from: MONDAY,
      to: MONDAY,
    });

    expect(points).toEqual([{ at: MONDAY, net: 100 }]);
  });
});
