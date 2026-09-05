import { afterEach, describe, expect, test } from "bun:test";
import "./setup";
import { resolveConfig } from "../src/config";
import { mountWidget, paymentContainer } from "../src/mount";

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
});

function mount(overrides: Parameters<typeof resolveConfig>[0] = {}) {
  const host = mountWidget(resolveConfig({ site: "qj_test", ...overrides }));
  const root = host.shadowRoot;
  if (!root) throw new Error("widget mounted without a shadow root");
  return {
    host,
    root,
    panel: root.querySelector<HTMLElement>(".quietjar-panel") as HTMLElement,
    trigger: root.querySelector<HTMLButtonElement>(
      ".quietjar-widget__button, .quietjar-widget__action",
    ) as HTMLButtonElement,
  };
}

function amounts(panel: HTMLElement): string[] {
  return Array.from(panel.querySelectorAll(".quietjar-panel__amount"), (el) => el.textContent ?? "");
}

describe("payment container", () => {
  test("stays closed until the widget button is clicked", () => {
    const { panel, trigger } = mount();
    expect(panel.hidden).toBe(true);

    trigger.click();
    expect(panel.hidden).toBe(false);
  });

  test("opens from the action button of a card widget", () => {
    const { panel, trigger } = mount({ labels: { body: "Every coffee helps" } });
    expect(trigger.className).toBe("quietjar-widget__action");

    trigger.click();
    expect(panel.hidden).toBe(false);
  });

  test("offers the configured amounts and an other option", () => {
    const { panel, trigger } = mount({ amounts: [2, 4], currency: "eur" });
    trigger.click();

    expect(amounts(panel)).toEqual(["€2", "€4", "Other"]);
  });

  test("submit follows the selected amount", () => {
    const { panel, trigger } = mount({ amounts: [3, 7], labels: { action: "Support" } });
    trigger.click();

    const submit = panel.querySelector<HTMLButtonElement>(".quietjar-panel__submit");
    expect(submit?.textContent).toBe("Support €3");

    panel.querySelectorAll<HTMLButtonElement>(".quietjar-panel__amount")[1].click();
    expect(submit?.textContent).toBe("Support €7");
  });

  test("the other option reveals a free-entry field and waits for a value", () => {
    const { panel, trigger } = mount();
    trigger.click();

    const custom = panel.querySelector<HTMLInputElement>(".quietjar-panel__custom");
    const submit = panel.querySelector<HTMLButtonElement>(".quietjar-panel__submit");
    expect(custom?.hidden).toBe(true);

    panel.querySelector<HTMLButtonElement>(".quietjar-panel__amount--other")?.click();
    expect(custom?.hidden).toBe(false);
    expect(submit?.disabled).toBe(true);

    if (!custom) throw new Error("no custom amount field");
    custom.value = "25";
    custom.dispatchEvent(new Event("input"));
    expect(submit?.disabled).toBe(false);
    expect(submit?.textContent).toContain("25");
  });

  test("rejects an amount outside the bounds the server enforces", () => {
    const { panel, trigger } = mount();
    trigger.click();
    panel.querySelector<HTMLButtonElement>(".quietjar-panel__amount--other")?.click();

    const custom = panel.querySelector<HTMLInputElement>(".quietjar-panel__custom");
    const submit = panel.querySelector<HTMLButtonElement>(".quietjar-panel__submit");
    if (!custom) throw new Error("no custom amount field");

    custom.value = "900";
    custom.dispatchEvent(new Event("input"));
    expect(submit?.disabled).toBe(true);
  });

  test("closes on the minimize control and on escape", () => {
    const { host, panel, trigger } = mount();

    trigger.click();
    panel.querySelector<HTMLButtonElement>(".quietjar-panel__minimize")?.click();
    expect(paymentContainer(host)?.isOpen()).toBe(false);
    expect(panel.dataset.state).toBe("closed");

    trigger.click();
    expect(paymentContainer(host)?.isOpen()).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(paymentContainer(host)?.isOpen()).toBe(false);
    expect(panel.dataset.state).toBe("closed");
  });

  test("stays in the tree until it has animated out", async () => {
    const { panel, trigger } = mount();
    trigger.click();
    expect(panel.hidden).toBe(false);

    panel.querySelector<HTMLButtonElement>(".quietjar-panel__minimize")?.click();
    // Still present, so the exit transition has something to animate.
    expect(panel.hidden).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(panel.hidden).toBe(true);
  });

  test("re-opening during the exit animation keeps the panel mounted", async () => {
    const { host, panel, trigger } = mount();
    trigger.click();
    panel.querySelector<HTMLButtonElement>(".quietjar-panel__minimize")?.click();
    trigger.click();

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(panel.hidden).toBe(false);
    expect(paymentContainer(host)?.isOpen()).toBe(true);
  });

  test("a click outside leaves it open", () => {
    const { panel, trigger } = mount();
    trigger.click();

    document.body.click();
    expect(panel.hidden).toBe(false);
  });

  test("credits QuietJar with a link", () => {
    const { panel } = mount();
    const link = panel.querySelector<HTMLAnchorElement>(".quietjar-panel__powered");

    expect(link?.textContent).toBe("Powered by QuietJar");
    expect(link?.href).toBe("https://quietjar.com/");
  });

  test("explains itself when the site key is missing", async () => {
    const host = mountWidget(resolveConfig({}));
    const root = host.shadowRoot;
    root?.querySelector<HTMLButtonElement>(".quietjar-widget__button")?.click();
    root?.querySelector<HTMLButtonElement>(".quietjar-panel__submit")?.click();
    await Promise.resolve();

    expect(root?.querySelector(".quietjar-panel__error")?.textContent).toBe(
      "Payments are not set up for this site yet.",
    );
  });

  test("shows the thank you in place of the amount step", () => {
    const { host, panel, trigger } = mount();
    trigger.click();

    paymentContainer(host)?.showThanks();
    expect(panel.querySelector(".quietjar-panel__thanks")?.textContent).toBe(
      "Thank you for your support",
    );
    expect(panel.querySelector(".quietjar-panel__amounts")).toBeNull();
  });
});

/**
 * happy-dom has no layout engine, so the boxes the placement reads are stubbed.
 * `scale` mimics a CSS transform: it inflates the rects the way a scaled
 * ancestor would, while the frame's layout size stays unscaled.
 */
function stubBox(
  el: HTMLElement,
  box: { top: number; left: number; width: number; height: number },
  scale = 1,
): void {
  el.getBoundingClientRect = () =>
    ({
      top: box.top,
      left: box.left,
      width: box.width * scale,
      height: box.height * scale,
      right: box.left + box.width * scale,
      bottom: box.top + box.height * scale,
      x: box.left,
      y: box.top,
    }) as DOMRect;
  Object.defineProperty(el, "clientWidth", { value: box.width, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: box.height, configurable: true });
}

describe("bounded viewport", () => {
  test("places the panel against the frame it is previewed in", () => {
    const frame = document.createElement("div");
    document.body.append(frame);
    // Offset from the page origin and scaled down, the way the dashboard's
    // mock page is: local coordinates must come out free of both.
    stubBox(frame, { top: 300, left: 200, width: 800, height: 500 }, 0.8);

    const host = mountWidget(resolveConfig({ site: "qj_test", mount: { target: frame } }), {
      viewport: frame,
    });
    const root = host.shadowRoot as ShadowRoot;
    const panel = root.querySelector<HTMLElement>(".quietjar-panel") as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>(
      ".quietjar-widget__button",
    ) as HTMLButtonElement;

    // A widget 60px up from the frame's bottom edge, in the frame's own space.
    stubBox(trigger, { top: 300 + 0.8 * 400, left: 200 + 0.8 * 700, width: 56, height: 56 }, 0.8);
    stubBox(panel, { top: 0, left: 0, width: 320, height: 240 }, 0.8);

    trigger.click();

    // Above the widget: 400 - 16 gap - 240 panel. Centring on a widget in the
    // right-hand corner clamps to the frame's own margin, 800 - 320 - 12,
    // rather than to the window's.
    expect(panel.style.top).toBe("144px");
    expect(panel.style.left).toBe("468px");
    expect(panel.classList.contains("quietjar-panel--sheet")).toBe(false);
  });

  test("falls back to the window without a frame", () => {
    const { panel, trigger } = mount();
    stubBox(trigger, { top: 600, left: 900, width: 56, height: 56 });
    stubBox(panel, { top: 0, left: 0, width: 320, height: 240 });

    trigger.click();

    // happy-dom reports a 1024x768 window, so the same widget clamps against
    // the window instead: 768 - 16 - 240 down, and 1024 - 320 - 12 across.
    expect(panel.style.top).toBe("344px");
    expect(panel.style.left).toBe("692px");
  });
});
