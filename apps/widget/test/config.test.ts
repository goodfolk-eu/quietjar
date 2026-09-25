import { describe, expect, test } from "bun:test";
import "./setup";
import {
  DEFAULT_ACTION_LABEL,
  amountScale,
  DEFAULT_API,
  DEFAULT_CLOSE_AFTER,
  DEFAULT_CLOSE_DAYS,
  DEFAULT_DONATION_HIDE_DAYS,
  DEFAULT_CLOSE_ENABLED,
  DEFAULT_CLOSE_LABEL,
  DEFAULT_COLOR,
  DEFAULT_CORNER,
  DEFAULT_CURRENCY,
  DEFAULT_FONT,
  DEFAULT_GOAL_REACHED,
  DEFAULT_ICON,
  DEFAULT_MINIMIZE_LABEL,
  DEFAULT_OTHER_LABEL,
  DEFAULT_THANKS_LABEL,
  FONT_PRESETS,
  ICON_LIBRARY,
  ICON_PRESETS,
  resolveConfig,
  type CloseAfterMode,
  type GoalReachedMode,
  type QuietJarConfig,
} from "../src/config";

describe("resolveConfig", () => {
  test("returns defaults for empty config", () => {
    expect(resolveConfig(undefined)).toEqual({
      site: "",
      api: DEFAULT_API,
      currency: DEFAULT_CURRENCY,
      goal: "",
      goalReached: DEFAULT_GOAL_REACHED,
      amounts: amountScale(DEFAULT_CURRENCY).presets,
      thanksLabel: DEFAULT_THANKS_LABEL,
      otherLabel: DEFAULT_OTHER_LABEL,
      minimizeLabel: DEFAULT_MINIMIZE_LABEL,
      headline: "",
      body: "",
      actionLabel: DEFAULT_ACTION_LABEL,
      icon: DEFAULT_ICON,
      closeLabel: DEFAULT_CLOSE_LABEL,
      closeEnabled: DEFAULT_CLOSE_ENABLED,
      closeAfter: DEFAULT_CLOSE_AFTER,
      closeDays: DEFAULT_CLOSE_DAYS,
      donationHideDays: DEFAULT_DONATION_HIDE_DAYS,
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
        site: "qj_abc",
        api: "https://api.example.com/ignored/path",
        currency: "GBP",
        amounts: [10, 2, 2, 5],
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
      site: "qj_abc",
      api: "https://api.example.com",
      currency: "gbp",
      goal: "",
      goalReached: DEFAULT_GOAL_REACHED,
      amounts: [2, 5, 10],
      thanksLabel: DEFAULT_THANKS_LABEL,
      otherLabel: DEFAULT_OTHER_LABEL,
      minimizeLabel: DEFAULT_MINIMIZE_LABEL,
      headline: "Leave a tip",
      body: "Every coffee helps",
      actionLabel: "Chip in",
      icon: "☕",
      closeLabel: "No thanks",
      closeEnabled: false,
      closeAfter: DEFAULT_CLOSE_AFTER,
      closeDays: DEFAULT_CLOSE_DAYS,
      donationHideDays: DEFAULT_DONATION_HIDE_DAYS,
      color: "#123abc",
      font: "serif",
      css: ".quietjar-widget { border-radius: 12px; }",
      corner: "top-left",
      target: "#widget",
    });
  });

  test("a reached goal hides the widget unless the owner asked otherwise", () => {
    expect(resolveConfig(undefined).goalReached).toBe(DEFAULT_GOAL_REACHED);
    expect(resolveConfig({ goal: "qg_1", goalReached: "show" }).goalReached).toBe("show");
    expect(resolveConfig({ goal: "qg_1", goalReached: "show-with-bar" }).goalReached).toBe(
      "show-with-bar",
    );
    expect(resolveConfig({ goalReached: "keep" as GoalReachedMode }).goalReached).toBe(
      DEFAULT_GOAL_REACHED,
    );
  });

  test("day counts accept a whole number of one or more and fall back otherwise", () => {
    expect(resolveConfig({ donation: { hideDays: 14 } }).donationHideDays).toBe(14);
    expect(resolveConfig({ donation: { hideDays: 2.5 } }).donationHideDays).toBe(2);
    expect(resolveConfig({ donation: { hideDays: 0 } }).donationHideDays).toBe(
      DEFAULT_DONATION_HIDE_DAYS,
    );
    expect(resolveConfig({ donation: { hideDays: -3 } }).donationHideDays).toBe(
      DEFAULT_DONATION_HIDE_DAYS,
    );
    expect(resolveConfig({ donation: { hideDays: Number.NaN } }).donationHideDays).toBe(
      DEFAULT_DONATION_HIDE_DAYS,
    );
  });

  test("close behavior falls back to session mode and a default day count", () => {
    expect(resolveConfig(undefined).closeAfter).toBe(DEFAULT_CLOSE_AFTER);
    expect(resolveConfig({ close: { after: "forever" } }).closeAfter).toBe("forever");
    expect(resolveConfig({ close: { after: "never", days: 3 } }).closeDays).toBe(3);
    expect(
      resolveConfig({ close: { after: "whenever" as CloseAfterMode } }).closeAfter,
    ).toBe(DEFAULT_CLOSE_AFTER);
    expect(resolveConfig({ close: { after: "days", days: 0 } }).closeDays).toBe(DEFAULT_CLOSE_DAYS);
    expect(resolveConfig(undefined).closeDays).toBe(DEFAULT_CLOSE_DAYS);
    expect(resolveConfig(undefined).donationHideDays).toBe(DEFAULT_DONATION_HIDE_DAYS);
  });

  test("treats blank as no icon and falls back to the default for oversized values", () => {
    expect(resolveConfig({ labels: { icon: "  " } }).icon).toBe("");
    expect(resolveConfig({ labels: { icon: "way too long" } }).icon).toBe(DEFAULT_ICON);
    expect(resolveConfig(undefined).icon).toBe(DEFAULT_ICON);
  });

  test("keeps the amount list usable whatever the config says", () => {
    const eur = amountScale("eur").presets;
    expect(resolveConfig({ amounts: [] }).amounts).toEqual(eur);
    expect(resolveConfig({ amounts: [0, 900, Number.NaN] }).amounts).toEqual(eur);
    expect(resolveConfig({ amounts: [5, 5, 3] }).amounts).toEqual([3, 5]);
    expect(resolveConfig({ amounts: [1, 2, 3, 4, 5, 6] }).amounts).toEqual([1, 2, 3, 4]);
    expect(resolveConfig({ amounts: [2.005] }).amounts).toEqual([2.01]);
  });

  test("scales amounts to the configured currency", () => {
    expect(resolveConfig({ currency: "inr" }).amounts).toEqual(amountScale("inr").presets);
    // 5 is a fine euro donation but under the rupee floor, so it is dropped and
    // the rupee presets stand in rather than an empty list.
    expect(resolveConfig({ currency: "inr", amounts: [5] }).amounts).toEqual(
      amountScale("inr").presets,
    );
    expect(resolveConfig({ currency: "inr", amounts: [250, 900] }).amounts).toEqual([250, 900]);
  });

  test("falls back to the default scale for an unknown currency", () => {
    expect(amountScale("xyz")).toEqual(amountScale(DEFAULT_CURRENCY));
  });

  test("falls back to the hosted API for an unusable override", () => {
    expect(resolveConfig({ api: "not a url" }).api).toBe(DEFAULT_API);
    expect(resolveConfig({ api: "  " }).api).toBe(DEFAULT_API);
    expect(resolveConfig({ api: "http://localhost:3000/api" }).api).toBe("http://localhost:3000");
  });

  test("only accepts a three-letter currency code", () => {
    expect(resolveConfig({ currency: "euro" }).currency).toBe(DEFAULT_CURRENCY);
    expect(resolveConfig({ currency: "SEK" }).currency).toBe("sek");
  });

  test("every offered icon survives validation", () => {
    for (const icon of [...ICON_PRESETS, ...ICON_LIBRARY]) {
      expect(resolveConfig({ labels: { icon } }).icon).toBe(icon);
    }
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
    expect(resolveConfig(undefined).color).toBe("#0369a1");
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
    expect(resolveConfig(undefined).actionLabel).toBe("Support");
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
