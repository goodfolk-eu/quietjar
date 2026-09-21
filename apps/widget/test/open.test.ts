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

describe("reached goal", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function respondWithProgress(raised: number, target: number): void {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ raised, target, currency: "eur" }))) as unknown as typeof fetch;
  }

  test("does not mount when the goal is reached and the widget hides", async () => {
    respondWithProgress(10_000, 10_000);
    // A lookup is memoised per goal, so each test needs its own id.
    (window as { QuietJar?: unknown }).QuietJar = { site: "qj_test", goal: "qg_hidden" };
    document.body.innerHTML = "";
    const mount = await loadMount();
    await mount();

    expect(document.querySelector("[data-quietjar-host]")).toBeNull();
  });

  test("mounts a running goal that would hide once reached", async () => {
    respondWithProgress(2500, 10_000);
    (window as { QuietJar?: unknown }).QuietJar = { site: "qj_test", goal: "qg_open" };
    document.body.innerHTML = "";
    const mount = await loadMount();
    await mount();

    const host = document.querySelector<HTMLElement>("[data-quietjar-host]");
    expect(host).not.toBeNull();
    const fill = host?.shadowRoot?.querySelector(".quietjar-widget__meter-fill") as HTMLElement;
    expect(fill.style.width).toBe("25%");
  });

  test("a deep link opens the panel even on a reached goal", async () => {
    respondWithProgress(10_000, 10_000);
    setURL("?qj_open=1");
    (window as { QuietJar?: unknown }).QuietJar = { site: "qj_test", goal: "qg_deep" };
    document.body.innerHTML = "";
    const mount = await loadMount();
    await mount();

    const host = document.querySelector<HTMLElement>("[data-quietjar-host]");
    const panel = host?.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
    expect(panel?.hidden).toBe(false);
    expect(window.location.search).toBe("");
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

describe("programmatic open", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function openPanel(): void {
    window.QuietJar?.open?.();
  }

  test("attaches open onto the config object", async () => {
    withSite();
    document.body.innerHTML = "";
    const mount = await loadMount();
    await mount();

    expect(typeof window.QuietJar?.open).toBe("function");
  });

  test("opens the anchored panel like a click on the button", async () => {
    withSite();
    document.body.innerHTML = "";
    const mount = await loadMount();
    await mount();

    const host = document.querySelector<HTMLElement>("[data-quietjar-host]");
    if (!host) throw new Error("widget did not mount");
    openPanel();

    const panel = host.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
    expect(paymentContainer(host)?.isOpen()).toBe(true);
    expect(panel?.hidden).toBe(false);
    expect(panel?.classList.contains("quietjar-panel--modal")).toBe(false);
    expect(host.shadowRoot?.querySelector(".quietjar-backdrop")).toBeNull();
  });

  test("opens centered past a stored dismissal", async () => {
    withSite();
    sessionStorage.setItem("quietjar-dismissed", "1");
    document.body.innerHTML = "";
    const mount = await loadMount();
    await mount();

    expect(document.querySelector("[data-quietjar-host]")).toBeNull();
    openPanel();

    const host = document.querySelector<HTMLElement>("[data-quietjar-host]");
    const panel = host?.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
    const backdrop = host?.shadowRoot?.querySelector<HTMLElement>(".quietjar-backdrop");
    expect(panel?.hidden).toBe(false);
    expect(panel?.classList.contains("quietjar-panel--modal")).toBe(true);
    expect(backdrop?.dataset.state).toBe("open");
  });

  test("opens centered past a donation suppression", async () => {
    withSite();
    localStorage.setItem(
      "quietjar-donated",
      JSON.stringify({
        date: new Date().toISOString(),
        site: "qj_test",
        hideUntil: new Date(Date.now() + DAY_MS).toISOString(),
      }),
    );
    document.body.innerHTML = "";
    const mount = await loadMount();
    await mount();

    expect(document.querySelector("[data-quietjar-host]")).toBeNull();
    openPanel();

    const panel = document
      .querySelector<HTMLElement>("[data-quietjar-host]")
      ?.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
    expect(panel?.hidden).toBe(false);
    expect(panel?.classList.contains("quietjar-panel--modal")).toBe(true);
  });

  test("opens even on a reached goal", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ raised: 10_000, target: 10_000, currency: "eur" }),
      )) as unknown as typeof fetch;
    try {
      (window as { QuietJar?: unknown }).QuietJar = { site: "qj_test", goal: "qg_call" };
      document.body.innerHTML = "";
      const mount = await loadMount();
      await mount();

      expect(document.querySelector("[data-quietjar-host]")).toBeNull();
      openPanel();

      const panel = document
        .querySelector<HTMLElement>("[data-quietjar-host]")
        ?.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
      expect(panel?.hidden).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("remounts and centers after the visitor closed the widget", async () => {
    withSite();
    document.body.innerHTML = "";
    const mount = await loadMount();
    await mount();

    const first = document.querySelector<HTMLElement>("[data-quietjar-host]");
    if (!first) throw new Error("widget did not mount");
    first.shadowRoot?.querySelector<HTMLElement>(".quietjar-widget__close")?.click();
    expect(document.querySelector("[data-quietjar-host]")).toBeNull();

    openPanel();

    const second = document.querySelector<HTMLElement>("[data-quietjar-host]");
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    const panel = second?.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
    expect(panel?.hidden).toBe(false);
    expect(panel?.classList.contains("quietjar-panel--modal")).toBe(true);
  });

  test("a second call while open changes nothing", async () => {
    withSite();
    document.body.innerHTML = "";
    const mount = await loadMount();
    await mount();

    const host = document.querySelector<HTMLElement>("[data-quietjar-host]");
    if (!host) throw new Error("widget did not mount");
    openPanel();
    const panel = host.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
    expect(panel?.classList.contains("quietjar-panel--modal")).toBe(false);

    openPanel();

    expect(document.querySelectorAll("[data-quietjar-host]").length).toBe(1);
    expect(paymentContainer(host)?.isOpen()).toBe(true);
    expect(panel?.classList.contains("quietjar-panel--modal")).toBe(false);
  });
});
