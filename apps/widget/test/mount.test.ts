import { afterEach, describe, expect, test } from "bun:test";
import "./setup";
import {
  DEFAULT_CLOSE_LABEL,
  DEFAULT_COLOR,
  DEFAULT_FONT,
  DEFAULT_HEADLINE,
  DEFAULT_ICON,
  FONT_STACKS,
  resolveConfig,
} from "../src/config";
import { isDismissed } from "../src/dismiss";
import { mountWidget } from "../src/mount";

afterEach(() => {
  document.body.innerHTML = "";
  sessionStorage.clear();
});

function widgetCss(host: HTMLElement): string {
  const root = host.shadowRoot;
  const adopted = root?.adoptedStyleSheets ?? [];
  if (adopted.length > 0) {
    return adopted
      .flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText))
      .join("\n");
  }
  return root?.querySelector("style")?.textContent ?? "";
}

describe("mountWidget", () => {
  test("mounts into a selector target", () => {
    const container = document.createElement("div");
    container.id = "host";
    document.body.append(container);

    const host = mountWidget(resolveConfig({ mount: { target: "#host" } }));

    expect(container.querySelector(":scope > div")).toBe(host);
    expect(host.shadowRoot?.querySelector("button")).not.toBeNull();
  });

  test("mounts into an element target", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const host = mountWidget(resolveConfig({ mount: { target: container } }));

    expect(host.parentElement).toBe(container);
  });

  test("mounts on body with fixed positioning when no target is given", () => {
    const host = mountWidget(resolveConfig(undefined));

    expect(document.body.lastElementChild).toBe(host);
    const widget = host.shadowRoot?.querySelector(".quietjar-widget");
    expect(widget?.className).toContain("quietjar-widget--bottom-right");
  });

  test("uses the configured corner class", () => {
    const host = mountWidget(resolveConfig({ position: { corner: "top-left" } }));

    const widget = host.shadowRoot?.querySelector(".quietjar-widget");
    expect(widget?.className).toContain("quietjar-widget--top-left");
  });

  test("supports the centered positions", () => {
    for (const corner of ["top-center", "bottom-center"] as const) {
      document.body.innerHTML = "";
      const host = mountWidget(resolveConfig({ position: { corner } }));

      const widget = host.shadowRoot?.querySelector(".quietjar-widget");
      expect(widget?.className).toContain(`quietjar-widget--${corner}`);
      expect(widgetCss(host)).toContain(`.quietjar-widget--${corner}`);
    }
  });

  test("applies the configured color to the stylesheet", () => {
    const host = mountWidget(resolveConfig({ style: { color: "#123abc" } }));

    expect(widgetCss(host)).toContain("#123abc");
  });

  test("uses the default color when none is configured", () => {
    const host = mountWidget(resolveConfig(undefined));

    expect(widgetCss(host)).toContain(DEFAULT_COLOR);
  });

  test("applies the configured font preset to the label", () => {
    for (const font of ["system", "serif", "rounded", "mono"] as const) {
      document.body.innerHTML = "";
      const host = mountWidget(resolveConfig({ style: { font } }));

      expect(widgetCss(host)).toContain(`font-family: ${FONT_STACKS[font]}`);
    }
  });

  test("uses the default font when none is configured", () => {
    const host = mountWidget(resolveConfig(undefined));

    expect(widgetCss(host)).toContain(`font-family: ${FONT_STACKS[DEFAULT_FONT]}`);
    expect(widgetCss(host)).toContain("font-size: 17px");
  });

  test("inherits the container font when font is inherit", () => {
    const container = document.createElement("div");
    container.style.fontFamily = '"Inter", sans-serif';
    document.body.append(container);

    const host = mountWidget(resolveConfig({ style: { font: "inherit" }, mount: { target: container } }));

    expect(widgetCss(host)).toContain("font-family: Inter, sans-serif");
  });

  test("appends custom css after the widget styles", () => {
    const host = mountWidget(
      resolveConfig({ style: { css: ".quietjar-widget__label { font-family: serif; }" } }),
    );

    const sheets = host.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets).toHaveLength(2);
    const css = widgetCss(host);
    expect(css).toContain(".quietjar-widget__label");
    expect(css).toContain("serif");
  });

  test("keeps the widget styles when custom css is invalid", () => {
    const host = mountWidget(resolveConfig({ style: { css: "@import 'evil.css';" } }));

    expect(host.shadowRoot?.querySelector(".quietjar-widget__button")).not.toBeNull();
    expect(widgetCss(host)).toContain(".quietjar-widget__button");
  });

  test("uses the default headline as the accessible name when none is set", () => {
    const host = mountWidget(resolveConfig(undefined));

    const button = host.shadowRoot?.querySelector(
      ".quietjar-widget__button",
    ) as HTMLButtonElement | null;
    expect(button?.getAttribute("aria-label")).toBe(DEFAULT_HEADLINE);
    expect(button?.title).toBe(DEFAULT_HEADLINE);
    expect(button?.querySelector(".quietjar-widget__label")).toBeNull();
    expect(button?.classList.contains("quietjar-widget__button--labeled")).toBe(false);
  });

  test("shows the headline next to the icon when one is set", () => {
    const host = mountWidget(resolveConfig({ labels: { headline: "Leave a tip" } }));

    const button = host.shadowRoot?.querySelector(
      ".quietjar-widget__button",
    ) as HTMLButtonElement | null;
    expect(button?.classList.contains("quietjar-widget__button--labeled")).toBe(true);
    expect(button?.getAttribute("aria-label")).toBe("Leave a tip");
    expect(button?.title).toBe("Leave a tip");

    const label = button?.querySelector(".quietjar-widget__label");
    expect(label?.textContent).toBe("Leave a tip");
    // The label follows the icon.
    expect(label?.previousElementSibling?.className).toBe("quietjar-widget__icon");
  });

  test("renders a headline containing markup as text", () => {
    const host = mountWidget(resolveConfig({ labels: { headline: "<b>tip</b>" } }));

    const label = host.shadowRoot?.querySelector(".quietjar-widget__label");
    expect(label?.textContent).toBe("<b>tip</b>");
    expect(label?.querySelector("b")).toBeNull();
  });

  test("falls back to body for an invalid selector target", () => {
    const host = mountWidget(resolveConfig({ mount: { target: "###" } }));
    expect(host.parentElement).toBe(document.body);
  });

  test("returns the existing host instead of mounting twice", () => {
    const first = mountWidget(resolveConfig(undefined));
    const second = mountWidget(resolveConfig(undefined));
    expect(second).toBe(first);
    expect(document.querySelectorAll("[data-quietjar-host]")).toHaveLength(1);
  });

  test("mounts separate hosts into separate containers", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    document.body.append(first, second);

    const firstHost = mountWidget(resolveConfig({ mount: { target: first } }));
    const secondHost = mountWidget(resolveConfig({ mount: { target: second } }));

    expect(secondHost).not.toBe(firstHost);
    expect(first.querySelector("[data-quietjar-host]")).toBe(firstHost);
    expect(second.querySelector("[data-quietjar-host]")).toBe(secondHost);
  });

  test("reuses the existing host when remounting into the same container", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const first = mountWidget(resolveConfig({ mount: { target: container } }));
    const second = mountWidget(resolveConfig({ mount: { target: container } }));

    expect(second).toBe(first);
    expect(container.querySelectorAll("[data-quietjar-host]")).toHaveLength(1);
  });

  test("renders the default icon glyph in the button", () => {
    const host = mountWidget(resolveConfig(undefined));

    const icon = host.shadowRoot?.querySelector("button .quietjar-widget__icon");
    expect(icon?.textContent).toBe(DEFAULT_ICON);
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  test("renders the configured icon glyph", () => {
    const host = mountWidget(resolveConfig({ labels: { icon: "☕" } }));

    expect(host.shadowRoot?.querySelector(".quietjar-widget__icon")?.textContent).toBe("☕");
  });

  test("renders the close control next to the main button", () => {
    const host = mountWidget(resolveConfig(undefined));

    const close = host.shadowRoot?.querySelector(".quietjar-widget__close");
    expect(close?.getAttribute("aria-label")).toBe(DEFAULT_CLOSE_LABEL);
    expect(close?.querySelector("svg")).not.toBeNull();
  });

  test("omits the close control when disabled", () => {
    const host = mountWidget(resolveConfig({ close: { enabled: false } }));

    expect(host.shadowRoot?.querySelector(".quietjar-widget__close")).toBeNull();
  });

  test("uses the configured close label", () => {
    const host = mountWidget(resolveConfig({ labels: { close: "Sluiten" } }));

    expect(host.shadowRoot?.querySelector(".quietjar-widget__close")?.getAttribute("aria-label")).toBe(
      "Sluiten",
    );
  });

  test("removes the widget and persists the dismissal when close is clicked", () => {
    const host = mountWidget(resolveConfig(undefined), { persistDismissal: true });

    const close = host.shadowRoot?.querySelector(".quietjar-widget__close") as HTMLButtonElement;
    close.click();

    expect(host.parentElement).toBeNull();
    expect(document.querySelectorAll("[data-quietjar-host]")).toHaveLength(0);
    expect(isDismissed()).toBe(true);
  });

  test("removes the widget without persisting when persistence is off", () => {
    const host = mountWidget(resolveConfig(undefined));

    const close = host.shadowRoot?.querySelector(".quietjar-widget__close") as HTMLButtonElement;
    close.click();

    expect(host.parentElement).toBeNull();
    expect(isDismissed()).toBe(false);
  });

  test("renders a card with headline, body, and action button when a body is set", () => {
    const host = mountWidget(
      resolveConfig({
        labels: {
          headline: "Support this site",
          body: "Every coffee helps\nKeep the lights on",
          action: "Chip in",
        },
      }),
    );

    const root = host.shadowRoot;
    const panel = root?.querySelector(".quietjar-widget__panel");
    expect(panel).not.toBeNull();
    // The card is informational; the main element is no longer a button.
    expect(root?.querySelector(".quietjar-widget__button")).toBeNull();
    expect(panel?.querySelector(".quietjar-widget__headline")?.textContent).toBe(
      "Support this site",
    );
    expect(panel?.querySelector(".quietjar-widget__body")?.textContent).toBe(
      "Every coffee helps\nKeep the lights on",
    );
    expect(panel?.querySelector(".quietjar-widget__action")?.textContent).toBe("Chip in");
  });

  test("renders the card without a headline when only a body is set", () => {
    const host = mountWidget(resolveConfig({ labels: { body: "Every coffee helps" } }));

    const panel = host.shadowRoot?.querySelector(".quietjar-widget__panel");
    expect(panel?.querySelector(".quietjar-widget__headline")).toBeNull();
    expect(panel?.querySelector(".quietjar-widget__body")?.textContent).toBe("Every coffee helps");
    expect(panel?.querySelector(".quietjar-widget__action")?.textContent).toBe("Tip");
  });

  test("keeps the dismissible close control in card mode", () => {
    const host = mountWidget(resolveConfig({ labels: { body: "Every coffee helps" } }));

    const close = host.shadowRoot?.querySelector(".quietjar-widget__close") as HTMLButtonElement;
    close.click();

    expect(host.parentElement).toBeNull();
  });
});
