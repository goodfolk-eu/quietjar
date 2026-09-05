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
