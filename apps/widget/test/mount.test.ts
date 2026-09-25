import { afterEach, describe, expect, test } from "bun:test";
import "./setup";
import {
  DEFAULT_CLOSE_LABEL,
  DEFAULT_COLOR,
  DEFAULT_FONT,
  DEFAULT_HEADLINE,
  FONT_STACKS,
  PIGGY_ICON,
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

  test("mounts inline without corner positioning when a target resolves", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const host = mountWidget(resolveConfig({ mount: { target: container } }));

    expect(host.style.display).toBe("block");
    const widget = host.shadowRoot?.querySelector(".quietjar-widget");
    expect(widget?.className).toContain("quietjar-widget--inline");
    expect(widget?.className).not.toContain("quietjar-widget--bottom-right");
    expect(widgetCss(host)).toContain(".quietjar-widget--inline");
  });

  test("mounts into a preview target with the floating corner placement", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const host = mountWidget(resolveConfig(undefined), { target: container });

    expect(host.parentElement).toBe(container);
    const widget = host.shadowRoot?.querySelector(".quietjar-widget");
    expect(widget?.className).toContain("quietjar-widget--bottom-right");
    expect(widget?.className).not.toContain("quietjar-widget--inline");
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

  test("renders black text on a light brand color", () => {
    const host = mountWidget(resolveConfig({ style: { color: "#f59e0b" } }));

    expect(widgetCss(host)).toContain("#000000");
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
    const widget = host.shadowRoot?.querySelector(".quietjar-widget");
    expect(widget?.className).toContain("quietjar-widget--bottom-right");
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

  test("renders the piggy svg as the default icon", () => {
    const host = mountWidget(resolveConfig(undefined));

    const icon = host.shadowRoot?.querySelector("button .quietjar-widget__icon svg");
    expect(icon?.getAttribute("viewBox")).toBe("45 13 150 150");
  });

  test("renders the configured icon glyph", () => {
    const host = mountWidget(resolveConfig({ labels: { icon: "☕" } }));

    expect(host.shadowRoot?.querySelector(".quietjar-widget__icon")?.textContent).toBe("☕");
  });

  test("renders the piggy svg when the piggy is selected", () => {
    const host = mountWidget(resolveConfig({ labels: { icon: PIGGY_ICON } }));

    expect(host.shadowRoot?.querySelector("button .quietjar-widget__icon svg")).not.toBeNull();
  });

  test("renders no icon when the config chooses none", () => {
    const host = mountWidget(resolveConfig({ labels: { icon: "" } }));

    expect(host.shadowRoot?.querySelector("button .quietjar-widget__icon")).toBeNull();
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
    expect(panel?.querySelector(".quietjar-widget__action")?.textContent).toBe("Support");
  });

  test("renders the default piggy icon in the card when a body is set", () => {
    const host = mountWidget(resolveConfig({ labels: { body: "Every coffee helps" } }));

    const panel = host.shadowRoot?.querySelector(".quietjar-widget__panel");
    expect(panel?.querySelector(".quietjar-widget__icon svg")?.getAttribute("viewBox")).toBe(
      "45 13 150 150",
    );
    // The icon sits left of the headline and body.
    expect(panel?.querySelector(".quietjar-widget__text")?.previousElementSibling?.className).toBe(
      "quietjar-widget__icon",
    );
  });

  test("renders the configured glyph in the card when a body is set", () => {
    const host = mountWidget(resolveConfig({ labels: { body: "Every coffee helps", icon: "☕" } }));

    expect(
      host.shadowRoot?.querySelector(".quietjar-widget__panel .quietjar-widget__icon")?.textContent,
    ).toBe("☕");
  });

  test("renders no icon in the card when the config chooses none", () => {
    const host = mountWidget(resolveConfig({ labels: { body: "Every coffee helps", icon: "" } }));

    expect(
      host.shadowRoot?.querySelector(".quietjar-widget__panel .quietjar-widget__icon"),
    ).toBeNull();
  });

  test("keeps the dismissible close control in card mode", () => {
    const host = mountWidget(resolveConfig({ labels: { body: "Every coffee helps" } }));

    const close = host.shadowRoot?.querySelector(".quietjar-widget__close") as HTMLButtonElement;
    close.click();

    expect(host.parentElement).toBeNull();
  });
  describe("goal meter", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    function respondWith(body: unknown, status = 200): void {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
    }

    /**
     * The meter is filled from a fetch the widget owns, so the test waits for
     * the DOM to catch up rather than guessing how many ticks that takes.
     */
    async function settled(done: () => boolean): Promise<void> {
      for (let i = 0; i < 50 && !done(); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    function meter(host: HTMLElement): Element | null | undefined {
      return host.shadowRoot?.querySelector(".quietjar-widget__meter");
    }

    test("a goal alone turns the pill into a card with an empty meter", () => {
      respondWith({ raised: 4500, target: 10_000, currency: "eur" });
      // A lookup is memoised per goal, so each test needs its own id.
      const host = mountWidget(resolveConfig({ goal: "qg_card" }));

      const root = host.shadowRoot;
      expect(root?.querySelector(".quietjar-widget__panel")).not.toBeNull();
      expect(root?.querySelector(".quietjar-widget__button")).toBeNull();
      // No body was configured, so the card carries the meter and nothing else.
      expect(root?.querySelector(".quietjar-widget__body")).toBeNull();
      const fill = root?.querySelector(".quietjar-widget__meter-fill") as HTMLElement;
      expect(fill.style.width).toBe("");
      expect(root?.querySelector(".quietjar-widget__meter-label")?.textContent).toBe("");
    });

    test("the goal card leaves the icon out", () => {
      respondWith({ raised: 4500, target: 10_000, currency: "eur" });
      const host = mountWidget(resolveConfig({ goal: "qg_icon", labels: { icon: "\u2615" } }));

      expect(host.shadowRoot?.querySelector(".quietjar-widget__meter")).not.toBeNull();
      expect(host.shadowRoot?.querySelector(".quietjar-widget__icon")).toBeNull();
    });

    test("fills the bar and labels it once the progress lands", async () => {
      respondWith({ raised: 4500, target: 10_000, currency: "eur" });
      const host = mountWidget(resolveConfig({ goal: "qg_fill" }));
      const fill = host.shadowRoot?.querySelector(".quietjar-widget__meter-fill") as HTMLElement;
      await settled(() => fill.style.width !== "");

      const root = host.shadowRoot;
      expect(fill.style.width).toBe("45%");
      expect(root?.querySelector(".quietjar-widget__meter-label")?.textContent).toBe(
        "\u20ac45 of \u20ac100 raised",
      );
      expect(root?.querySelector(".quietjar-widget__meter-percent")?.textContent).toBe("45%");
    });

    test("keeps the body text above the meter", async () => {
      respondWith({ raised: 4500, target: 10_000, currency: "eur" });
      const host = mountWidget(
        resolveConfig({ goal: "qg_order", labels: { body: "Every coffee helps" } }),
      );
      const text = host.shadowRoot?.querySelector(".quietjar-widget__text");
      await settled(() => text?.querySelector(".quietjar-widget__meter-label")?.textContent !== "");

      expect(Array.from(text?.children ?? [], (child) => child.className)).toEqual([
        "quietjar-widget__body",
        "quietjar-widget__meter",
      ]);
    });

    test("removes the meter when the goal cannot be read", async () => {
      respondWith({ error: "unknown_goal" }, 404);
      const host = mountWidget(resolveConfig({ goal: "qg_gone" }));
      expect(meter(host)).not.toBeNull();
      await settled(() => meter(host) === null);

      expect(meter(host)).toBeNull();
      // The card itself stays: the donate button is the point of the widget.
      expect(host.shadowRoot?.querySelector(".quietjar-widget__action")).not.toBeNull();
    });

    test("a reached goal keeps its filled bar when the owner asked for it", () => {
      const progress = { raised: 12_000, target: 10_000, currency: "eur" };
      const host = mountWidget(
        resolveConfig({ goal: "qg_kept_bar", goalReached: "show-with-bar" }),
        { progress },
      );

      const root = host.shadowRoot;
      const fill = root?.querySelector(".quietjar-widget__meter-fill") as HTMLElement;
      expect(fill.style.width).toBe("100%");
      expect(root?.querySelector(".quietjar-widget__meter-label")?.textContent).toBe(
        "Goal reached, \u20ac120 raised",
      );
    });

    test("a reached goal drops the bar and keeps the card with a body", () => {
      const host = mountWidget(
        resolveConfig({
          goal: "qg_no_bar",
          goalReached: "show",
          labels: { body: "Every coffee helps" },
        }),
        { progress: { raised: 10_000, target: 10_000, currency: "eur" } },
      );

      const root = host.shadowRoot;
      expect(meter(host)).toBeNull();
      expect(root?.querySelector(".quietjar-widget__body")?.textContent).toBe(
        "Every coffee helps",
      );
      expect(root?.querySelector(".quietjar-widget__action")).not.toBeNull();
    });

    test("a reached goal with nothing else to say falls back to the pill", () => {
      const host = mountWidget(resolveConfig({ goal: "qg_pill", goalReached: "show" }), {
        progress: { raised: 10_000, target: 10_000, currency: "eur" },
      });

      const root = host.shadowRoot;
      expect(root?.querySelector(".quietjar-widget__button")).not.toBeNull();
      expect(root?.querySelector(".quietjar-widget__panel")).toBeNull();
      expect(meter(host)).toBeNull();
    });

    test("progress that could not be read renders the pill rather than an empty bar", () => {
      const host = mountWidget(resolveConfig({ goal: "qg_null", goalReached: "show" }), {
        progress: null,
      });

      expect(host.shadowRoot?.querySelector(".quietjar-widget__button")).not.toBeNull();
      expect(meter(host)).toBeNull();
    });

    test("a running goal keeps its bar when the widget would hide once reached", () => {
      const host = mountWidget(resolveConfig({ goal: "qg_running", goalReached: "hide" }), {
        progress: { raised: 2500, target: 10_000, currency: "eur" },
      });

      const fill = host.shadowRoot?.querySelector(".quietjar-widget__meter-fill") as HTMLElement;
      expect(fill.style.width).toBe("25%");
    });

    test("does not ask for progress when no goal is configured", () => {
      let asked = false;
      globalThis.fetch = (async () => {
        asked = true;
        return new Response("{}");
      }) as unknown as typeof fetch;

      const host = mountWidget(resolveConfig({ labels: { body: "Every coffee helps" } }));

      expect(meter(host)).toBeNull();
      expect(asked).toBe(false);
    });
  });
});
