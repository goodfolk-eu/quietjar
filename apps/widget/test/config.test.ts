import { describe, expect, test } from "bun:test";
import "./setup";
import {
  DEFAULT_ACTION_LABEL,
  DEFAULT_CLOSE_ENABLED,
  DEFAULT_CLOSE_LABEL,
  DEFAULT_COLOR,
  DEFAULT_CORNER,
  DEFAULT_FONT,
  DEFAULT_ICON,
  FONT_PRESETS,
  ICON_LIBRARY,
  ICON_PRESETS,
  resolveConfig,
  type QuietJarConfig,
} from "../src/config";

describe("resolveConfig", () => {
  test("returns defaults for empty config", () => {
    expect(resolveConfig(undefined)).toEqual({
      headline: "",
      body: "",
      actionLabel: DEFAULT_ACTION_LABEL,
      icon: DEFAULT_ICON,
      closeLabel: DEFAULT_CLOSE_LABEL,
      closeEnabled: DEFAULT_CLOSE_ENABLED,
      color: DEFAULT_COLOR,
      font: DEFAULT_FONT,
      css: "",
      corner: DEFAULT_CORNER,
      target: null,
    });
  });

  test("uses provided values", () => {
    expect(
      resolveConfig({
        labels: {
          headline: "Leave a tip",
          body: "Every coffee helps",
          action: "Chip in",
          icon: "☕",
          close: "No thanks",
        },
        style: {
          color: "#123abc",
          font: "serif",
          css: ".quietjar-widget { border-radius: 12px; }",
        },
        close: { enabled: false },
        position: { corner: "top-left" },
        mount: { target: "#widget" },
      }),
    ).toEqual({
      headline: "Leave a tip",
      body: "Every coffee helps",
      actionLabel: "Chip in",
      icon: "☕",
      closeLabel: "No thanks",
      closeEnabled: false,
      color: "#123abc",
      font: "serif",
      css: ".quietjar-widget { border-radius: 12px; }",
      corner: "top-left",
      target: "#widget",
    });
  });

  test("falls back to the default icon for blank or oversized values", () => {
    expect(resolveConfig({ labels: { icon: "  " } }).icon).toBe(DEFAULT_ICON);
    expect(resolveConfig({ labels: { icon: "way too long" } }).icon).toBe(DEFAULT_ICON);
    expect(resolveConfig(undefined).icon).toBe("♡");
  });

  test("every offered icon survives validation", () => {
    for (const icon of [...ICON_PRESETS, ...ICON_LIBRARY]) {
      expect(resolveConfig({ labels: { icon } }).icon).toBe(icon);
    }
    expect(ICON_LIBRARY).toContain(DEFAULT_ICON);
    expect(ICON_PRESETS).toContain(DEFAULT_ICON);
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
    expect(resolveConfig(undefined).color).toBe("#0284c7");
  });

  test("accepts shorthand and long hex colors", () => {
    expect(resolveConfig({ style: { color: "#abc" } }).color).toBe("#abc");
    expect(resolveConfig({ style: { color: "#abcd" } }).color).toBe("#abcd");
    expect(resolveConfig({ style: { color: "#a1b2c3" } }).color).toBe("#a1b2c3");
  });

  test("trims the custom css and defaults to empty", () => {
    expect(resolveConfig({ style: { css: "  .a { color: red; }  " } }).css).toBe(
      ".a { color: red; }",
    );
    expect(resolveConfig({ style: { css: "" } }).css).toBe("");
    expect(resolveConfig(undefined).css).toBe("");
  });

  test("falls back to default color for a 5-digit hex color", () => {
    expect(resolveConfig({ style: { color: "#abcff" } }).color).toBe(DEFAULT_COLOR);
  });

  test("accepts the inherit font choice", () => {
    expect(resolveConfig({ style: { font: "inherit" } }).font).toBe("inherit");
  });

  test("falls back to default font for unknown values", () => {
    const invalid = (font: unknown) => ({ style: { font } }) as unknown as QuietJarConfig;
    expect(resolveConfig(invalid("comic sans")).font).toBe(DEFAULT_FONT);
    expect(resolveConfig(invalid("")).font).toBe(DEFAULT_FONT);
    expect(resolveConfig(undefined).font).toBe("rounded");
  });

  test("every offered font preset survives validation", () => {
    for (const font of FONT_PRESETS) {
      expect(resolveConfig({ style: { font } }).font).toBe(font);
    }
  });

  test("keeps the headline empty when blank", () => {
    expect(resolveConfig({ labels: { headline: "" } }).headline).toBe("");
    expect(resolveConfig({ labels: { headline: "   " } }).headline).toBe("");
  });

  test("keeps the body empty when blank", () => {
    expect(resolveConfig({ labels: { body: "" } }).body).toBe("");
    expect(resolveConfig({ labels: { body: "  \n  " } }).body).toBe("");
  });

  test("trims the body", () => {
    expect(resolveConfig({ labels: { body: "  Every coffee helps  " } }).body).toBe(
      "Every coffee helps",
    );
  });

  test("falls back to the default action label when blank", () => {
    expect(resolveConfig({ labels: { action: "  " } }).actionLabel).toBe(DEFAULT_ACTION_LABEL);
    expect(resolveConfig(undefined).actionLabel).toBe("Donate");
  });

  test("falls back to the default close label when blank", () => {
    expect(resolveConfig({ labels: { close: "  " } }).closeLabel).toBe(DEFAULT_CLOSE_LABEL);
    expect(resolveConfig(undefined).closeLabel).toBe("Dismiss");
  });

  test("enables the close control unless explicitly disabled", () => {
    const invalid = (close: unknown) => ({ close }) as unknown as QuietJarConfig;
    expect(resolveConfig(undefined).closeEnabled).toBe(true);
    expect(resolveConfig({ close: { enabled: false } }).closeEnabled).toBe(false);
    expect(resolveConfig({ close: {} }).closeEnabled).toBe(true);
    expect(resolveConfig(invalid({ enabled: "false" })).closeEnabled).toBe(true);
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
