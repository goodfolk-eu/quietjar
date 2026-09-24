import { describe, expect, test } from "bun:test";
import { IMAGE_TARGETS, planResize } from "../src/lib/resize-image";

describe("planResize", () => {
  test("crops an avatar to a centered square and caps its size", () => {
    expect(planResize(4000, 3000, IMAGE_TARGETS.avatar)).toEqual({
      sx: 500,
      sy: 0,
      sw: 3000,
      sh: 3000,
      width: 400,
      height: 400,
    });
  });

  test("scales a cover down to the width cap, keeping its shape", () => {
    expect(planResize(4800, 1600, IMAGE_TARGETS.cover)).toMatchObject({
      sw: 4800,
      sh: 1600,
      width: 1600,
      height: 533,
    });
  });

  test("respects the height cap for a tall cover", () => {
    expect(planResize(1600, 3200, IMAGE_TARGETS.cover)).toMatchObject({ width: 400, height: 800 });
  });

  test("never scales a small image up", () => {
    expect(planResize(300, 200, IMAGE_TARGETS.cover)).toMatchObject({ width: 300, height: 200 });
    expect(planResize(120, 80, IMAGE_TARGETS.avatar)).toMatchObject({ width: 80, height: 80 });
  });
});
