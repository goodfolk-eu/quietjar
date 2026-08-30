import type { ResolvedConfig } from "./config";
import { heartIconMarkup } from "./icon";
import { widgetStyles } from "./styles";

const HOST_SELECTOR = "[data-quietjar-host]";

export function mountWidget(config: ResolvedConfig): HTMLElement {
  const container = resolveContainer(config);
  const existing = container.querySelector<HTMLElement>(HOST_SELECTOR);
  if (existing) {
    return existing;
  }

  const host = document.createElement("div");
  host.setAttribute("data-quietjar-host", "");
  host.style.cssText = "all: initial;";
  container.append(host);

  const root = host.attachShadow({ mode: "open" });
  applyStyles(root, config.color);

  const button = document.createElement("button");
  button.type = "button";
  button.className = `quietjar-widget quietjar-widget--${config.corner}`;
  button.setAttribute("aria-label", config.headline);
  button.title = config.headline;
  button.innerHTML = heartIconMarkup();

  root.append(button);
  return host;
}

// A constructed stylesheet is exempt from the style-src CSP directive, so the
// widget still renders on sites that ship a strict policy. Engines without
// constructable stylesheets fall back to a <style> element.
function applyStyles(root: ShadowRoot, color: string): void {
  const css = widgetStyles(color);

  if (typeof CSSStyleSheet === "function" && "replaceSync" in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [sheet];
    return;
  }

  const style = document.createElement("style");
  style.textContent = css;
  root.prepend(style);
}

function resolveContainer(config: ResolvedConfig): HTMLElement {
  if (typeof config.target === "string") {
    try {
      const el = document.querySelector<HTMLElement>(config.target);
      if (el) {
        return el;
      }
    } catch {
      // invalid selector falls back to body
    }
  } else if (config.target instanceof HTMLElement) {
    return config.target;
  }
  return document.body;
}
