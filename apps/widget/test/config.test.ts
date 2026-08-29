import { describe, expect, test } from "bun:test";
import "./setup";
import {
  DEFAULT_COLOR,
  DEFAULT_CORNER,
  DEFAULT_HEADLINE,
  resolveConfig,
  type QuietJarConfig,
} from "../src/config";

describe("resolveConfig", () => {
  test("returns defaults for empty config", () => {
    expect(resolveConfig(undefined)).toEqual({
      headline: DEFAULT_HEADLINE,
      color: DEFAULT_COLOR,
      corner: DEFAULT_CORNER,
      target: null,
    });
  });

  test("uses provided values", () => {
    expect(
      resolveConfig({
        labels: { headline: "Leave a tip" },
        style: { color: "#123abc" },
        position: { corner: "top-left" },
        mount: { target: "#widget" },
      }),
    ).toEqual({
      headline: "Leave a tip",
      color: "#123abc",
      corner: "top-left",
      target: "#widget",
    });
  });

  test("falls back to default corner for unknown corner", () => {
    const config = { position: { corner: "middle" } } as unknown as QuietJarConfig;
    expect(resolveConfig(config).corner).toBe(DEFAULT_CORNER);
  });

  test("falls back to default color for invalid color", () => {
    expect(resolveConfig({ style: { color: "red" } }).color).toBe(DEFAULT_COLOR);
  });

  test("accepts shorthand and long hex colors", () => {
    expect(resolveConfig({ style: { color: "#abc" } }).color).toBe("#abc");
    expect(resolveConfig({ style: { color: "#abcd" } }).color).toBe("#abcd");
    expect(resolveConfig({ style: { color: "#a1b2c3" } }).color).toBe("#a1b2c3");
  });

  test("falls back to default color for a 5-digit hex color", () => {
    expect(resolveConfig({ style: { color: "#abcff" } }).color).toBe(DEFAULT_COLOR);
  });

  test("falls back to default headline for empty string", () => {
    expect(resolveConfig({ labels: { headline: "" } }).headline).toBe(DEFAULT_HEADLINE);
  });

  test("accepts an element target", () => {
    const el = document.createElement("div");
    expect(resolveConfig({ mount: { target: el } }).target).toBe(el);
  });

  test("returns null for a non-string, non-element target", () => {
    const config = { mount: { target: 42 } } as unknown as QuietJarConfig;
    expect(resolveConfig(config).target).toBeNull();
  });
});
