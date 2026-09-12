import { afterEach, describe, expect, test } from "bun:test";
import "./setup";
import { resolveConfig } from "../src/config";
import { mountWidget, paymentContainer } from "../src/mount";
import { clearOpenParam, shouldAutoOpen } from "../src/open";

// The index module auto-runs its own boot mount() at import time, so tests
// import it lazily after setting up URL and DOM state. Later tests reuse the
// cached module and call mount() directly.
type WidgetIndex = typeof import("../src/index");
let widgetIndex: WidgetIndex | undefined;

async function loadMount(): Promise<WidgetIndex["mount"]> {
  widgetIndex ??= await import("../src/index");
  return widgetIndex.mount;
}

// History state needs a real URL to resolve against: the registrator defaults
// to about:blank, where relative history updates silently do nothing.
function setURL(search: string): void {
  (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(
    `https://localhost/${search}`,
  );
}

function withSite(site = "qj_test"): void {
  (window as { QuietJar?: unknown }).QuietJar = { site };
}

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
  setURL("");
  delete (window as { QuietJar?: unknown }).QuietJar;
});

describe("deep link open param", () => {
  test("detects the qj_open marker", () => {
    expect(shouldAutoOpen("?qj_open=1")).toBe(true);
    expect(shouldAutoOpen("?page=2&qj_open=1")).toBe(true);
    expect(shouldAutoOpen("?page=2")).toBe(false);
    expect(shouldAutoOpen("?qj_open=0")).toBe(false);
    expect(shouldAutoOpen("?qj_open=")).toBe(false);
    expect(shouldAutoOpen("")).toBe(false);
  });

  test("clearOpenParam drops the marker and keeps the rest", () => {
    setURL("?page=2&qj_open=1");
    clearOpenParam();
    expect(window.location.search).toBe("?page=2");

    // Clearing again without the marker must not touch the URL.
    clearOpenParam();
    expect(window.location.search).toBe("?page=2");
  });
});

describe("deep link mount", () => {
  test("opens the payment panel as a modal and cleans the URL", async () => {
    setURL("?qj_open=1");
    withSite();
    document.body.innerHTML = "";
    await loadMount();

    const host = document.querySelector<HTMLElement>("[data-quietjar-host]");
    const root = host?.shadowRoot;
    if (!root) throw new Error("widget did not mount");
    const panel = root.querySelector<HTMLElement>(".quietjar-panel");
    const backdrop = root.querySelector<HTMLElement>(".quietjar-backdrop");
    const container = paymentContainer(host);

    expect(panel?.hidden).toBe(false);
    expect(panel?.classList.contains("quietjar-panel--modal")).toBe(true);
    expect(backdrop?.hidden).toBe(false);
    expect(backdrop?.dataset.state).toBe("open");
    expect(container?.isOpen()).toBe(true);
    expect(window.location.search).toBe("");
  });

  test("a deep link without a site key opens nothing but cleans the URL", async () => {
    setURL("?qj_open=1");
    document.body.innerHTML = "";
    const mount = await loadMount();
    mount();

    const host = document.querySelector<HTMLElement>("[data-quietjar-host]");
    const panel = host?.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
    expect(panel?.hidden).toBe(true);
    expect(host?.shadowRoot?.querySelector(".quietjar-backdrop")).toBeNull();
    expect(window.location.search).toBe("");
  });

  test("opens despite a stored dismissal", async () => {
    setURL("?qj_open=1");
    withSite();
    sessionStorage.setItem("quietjar-dismissed", "1");
    document.body.innerHTML = "";
    const mount = await loadMount();
    mount();

    const host = document.querySelector<HTMLElement>("[data-quietjar-host]");
    const panel = host?.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
    expect(panel?.hidden).toBe(false);
    expect(host?.shadowRoot?.querySelector(".quietjar-backdrop")).not.toBeNull();
  });

  test("a dismissed widget without the marker stays hidden", async () => {
    sessionStorage.setItem("quietjar-dismissed", "1");
    document.body.innerHTML = "";
    const mount = await loadMount();
    mount();

    expect(document.querySelector("[data-quietjar-host]")).toBeNull();
  });

  test("a second script load reuses the mounted widget", async () => {
    document.body.innerHTML = "";
    const mount = await loadMount();
    mount();
    const first = document.querySelector<HTMLElement>("[data-quietjar-host]");
    mount();
    const second = document.querySelector<HTMLElement>("[data-quietjar-host]");

    expect(second).toBe(first);
    expect(document.querySelectorAll("[data-quietjar-host]").length).toBe(1);
    expect(paymentContainer(first!)).toBeDefined();
  });
});

describe("modal presentation", () => {
  test("container.open centers the panel over a backdrop", () => {
    const host = mountWidget(resolveConfig({ site: "qj_test" }));
    const root = host.shadowRoot;
    if (!root) throw new Error("widget mounted without a shadow root");
    const panel = root.querySelector<HTMLElement>(".quietjar-panel");
    const container = paymentContainer(host);

    expect(root.querySelector(".quietjar-backdrop")).toBeNull();

    container?.open({ modal: true });
    expect(panel?.classList.contains("quietjar-panel--modal")).toBe(true);
    const backdrop = root.querySelector<HTMLElement>(".quietjar-backdrop");
    expect(backdrop?.hidden).toBe(false);
    expect(backdrop?.dataset.state).toBe("open");

    backdrop?.click();
    expect(container?.isOpen()).toBe(false);
    expect(backdrop?.dataset.state).toBe("closed");
  });
});
