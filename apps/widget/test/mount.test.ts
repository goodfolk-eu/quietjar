import { afterEach, describe, expect, test } from "bun:test";
import "./setup";
import { DEFAULT_COLOR, DEFAULT_HEADLINE, resolveConfig } from "../src/config";
import { mountWidget } from "../src/mount";

afterEach(() => {
  document.body.innerHTML = "";
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
    const button = host.shadowRoot?.querySelector("button");
    expect(button?.className).toContain("quietjar-widget--bottom-right");
  });

  test("uses the configured corner class", () => {
    const host = mountWidget(resolveConfig({ position: { corner: "top-left" } }));

    const button = host.shadowRoot?.querySelector("button");
    expect(button?.className).toContain("quietjar-widget--top-left");
  });

  test("applies the configured color to the stylesheet", () => {
    const host = mountWidget(resolveConfig({ style: { color: "#123abc" } }));

    expect(widgetCss(host)).toContain("#123abc");
  });

  test("uses the default color when none is configured", () => {
    const host = mountWidget(resolveConfig(undefined));

    expect(widgetCss(host)).toContain(DEFAULT_COLOR);
  });

  test("sets the headline as the button label", () => {
    const host = mountWidget(resolveConfig(undefined));

    const button = host.shadowRoot?.querySelector("button");
    expect(button?.getAttribute("aria-label")).toBe(DEFAULT_HEADLINE);
    expect(button?.title).toBe(DEFAULT_HEADLINE);
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

  test("renders a heart icon in the button", () => {
    const host = mountWidget(resolveConfig(undefined));

    const svg = host.shadowRoot?.querySelector("button svg");
    expect(svg).not.toBeNull();
  });
});
