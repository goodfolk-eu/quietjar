import type { ResolvedConfig } from "./config";
import { heartIconMarkup } from "./icon";
import { widgetStyles } from "./styles";

const HOST_SELECTOR = "[data-quietjar-host]";

export function mountWidget(config: ResolvedConfig): HTMLElement {
  const existing = document.querySelector<HTMLElement>(HOST_SELECTOR);
  if (existing) {
    return existing;
  }

  const container = resolveContainer(config);
  const host = document.createElement("div");
  host.setAttribute("data-quietjar-host", "");
  host.style.cssText = "all: initial;";
  container.append(host);

  const root = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = widgetStyles(config.color);

  const button = document.createElement("button");
  button.type = "button";
  button.className = `quietjar-widget quietjar-widget--${config.corner}`;
  button.setAttribute("aria-label", config.headline);
  button.title = config.headline;
  button.innerHTML = heartIconMarkup();

  root.append(style, button);
  return host;
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
