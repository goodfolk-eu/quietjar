import { describe, expect, test } from "bun:test";
import "./setup";
import {
  DEFAULT_COLOR,
  DEFAULT_CORNER,
  DEFAULT_ICON,
  ICON_LIBRARY,
  ICON_PRESETS,
  resolveConfig,
  type QuietJarConfig,
} from "../src/config";

describe("resolveConfig", () => {
  test("returns defaults for empty config", () => {
    expect(resolveConfig(undefined)).toEqual({
      headline: "",
      icon: DEFAULT_ICON,
      color: DEFAULT_COLOR,
      corner: DEFAULT_CORNER,
      target: null,
    });
  });

  test("uses provided values", () => {
    expect(
      resolveConfig({
        labels: { headline: "Leave a tip", icon: "☕" },
        style: { color: "#123abc" },
        position: { corner: "top-left" },
        mount: { target: "#widget" },
      }),
    ).toEqual({
      headline: "Leave a tip",
      icon: "☕",
      color: "#123abc",
      corner: "top-left",
      target: "#widget",
    });
  });

  test("falls back to the default icon for blank or oversized values", () => {
    expect(resolveConfig({ labels: { icon: "  " } }).icon).toBe(DEFAULT_ICON);
    expect(resolveConfig({ labels: { icon: "way too long" } }).icon).toBe(DEFAULT_ICON);
    expect(resolveConfig(undefined).icon).toBe(DEFAULT_ICON);
  });

  test("every offered icon survives validation", () => {
    for (const icon of [...ICON_PRESETS, ...ICON_LIBRARY]) {
      expect(resolveConfig({ labels: { icon } }).icon).toBe(icon);
    }
    expect(ICON_LIBRARY).toContain(DEFAULT_ICON);
    expect(new Set(ICON_LIBRARY).size).toBe(ICON_LIBRARY.length);
  });

  test("accepts an emoji icon", () => {
    expect(resolveConfig({ labels: { icon: "🫙" } }).icon).toBe("🫙");
  });

  test("accepts the centered corners", () => {
    expect(resolveConfig({ position: { corner: "top-center" } }).corner).toBe("top-center");
    expect(resolveConfig({ position: { corner: "bottom-center" } }).corner).toBe("bottom-center");
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

  test("keeps the headline empty when blank", () => {
    expect(resolveConfig({ labels: { headline: "" } }).headline).toBe("");
    expect(resolveConfig({ labels: { headline: "   " } }).headline).toBe("");
  });

  test("trims the headline", () => {
    expect(resolveConfig({ labels: { headline: "  Leave a tip  " } }).headline).toBe("Leave a tip");
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
