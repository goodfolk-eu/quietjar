import { afterEach, describe, expect, test } from "bun:test";
import "./setup";
import { resolveConfig } from "../src/config";
import { readDonation } from "../src/donation";
import { mountPanel, paymentContainer } from "../src/mount";

const realFetch = globalThis.fetch;

function setURL(search: string): void {
  (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(
    `https://localhost/@creator${search}`,
  );
}

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  globalThis.fetch = realFetch;
  setURL("");
});

function mount(overrides: Parameters<typeof resolveConfig>[0] = {}) {
  const target = document.createElement("div");
  document.body.append(target);
  const host = mountPanel(resolveConfig({ site: "qj_test", ...overrides }), target);
  const panel = host.shadowRoot?.querySelector<HTMLElement>(".quietjar-panel");
  if (!panel) throw new Error("panel did not mount");
  return { host, target, panel };
}

describe("embedded panel", () => {
  test("mounts inside the target, already open on the amount step", () => {
    const { host, target, panel } = mount({ amounts: [2, 4], currency: "eur" });
    expect(host.parentElement).toBe(target);
    expect(panel.hidden).toBe(false);
    expect(panel.classList.contains("quietjar-panel--embedded")).toBe(true);
    const amounts = Array.from(panel.querySelectorAll(".quietjar-panel__amount"), (el) =>
      el.textContent?.trim(),
    );
    expect(amounts).toEqual(["€2", "€4", "Other"]);
  });

  test("has no minimize control or footer of its own", () => {
    const { panel } = mount();
    expect(panel.querySelector(".quietjar-panel__minimize")).toBeNull();
    expect(panel.querySelector(".quietjar-panel__footer")).toBeNull();
  });

  test("cannot be closed, by Escape or otherwise", () => {
    const { host, panel } = mount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    paymentContainer(host)?.close();
    expect(panel.hidden).toBe(false);
    expect(paymentContainer(host)?.isOpen()).toBe(true);
  });

  test("thanks a supporter back from a redirect without hiding the creator's widget", async () => {
    setURL("?qj_donation=cs_test_1");
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ status: "paid" }), {
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;

    const { panel } = mount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(panel.querySelector(".quietjar-panel__thanks")).not.toBeNull();
    expect(window.location.search).toBe("");
    expect(readDonation()).toBeNull();
  });
});
