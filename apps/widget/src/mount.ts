import { DEFAULT_HEADLINE, type ResolvedConfig } from "./config";
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

  const label = config.headline;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `quietjar-widget quietjar-widget--${config.corner}`;
  if (label !== "") {
    button.classList.add("quietjar-widget--labeled");
  }
  button.setAttribute("aria-label", label !== "" ? label : DEFAULT_HEADLINE);
  button.title = label !== "" ? label : DEFAULT_HEADLINE;
  button.innerHTML = heartIconMarkup();

  if (label !== "") {
    const labelEl = document.createElement("span");
    labelEl.className = "quietjar-widget__label";
    // textContent keeps a headline with markup in it from rendering as HTML.
    labelEl.textContent = label;
    button.append(labelEl);
  }

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
