import { DEFAULT_FONT, DEFAULT_HEADLINE, FONT_STACKS, type ResolvedConfig } from "./config";
import { persistDismissal } from "./dismiss";
import { widgetStyles } from "./styles";

const HOST_SELECTOR = "[data-quietjar-host]";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface MountOptions {
  /** Store the dismissal in sessionStorage when the widget is closed. */
  persistDismissal?: boolean;
}

export function mountWidget(config: ResolvedConfig, options: MountOptions = {}): HTMLElement {
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
  applyStyles(root, config.color, labelFontFamily(config.font, container));

  const label = config.headline;
  const widget = document.createElement("div");
  widget.className = `quietjar-widget quietjar-widget--${config.corner}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "quietjar-widget__button";
  if (label !== "") {
    button.classList.add("quietjar-widget__button--labeled");
  }
  button.setAttribute("aria-label", label !== "" ? label : DEFAULT_HEADLINE);
  button.title = label !== "" ? label : DEFAULT_HEADLINE;

  const iconEl = document.createElement("span");
  iconEl.className = "quietjar-widget__icon";
  iconEl.setAttribute("aria-hidden", "true");
  iconEl.textContent = config.icon;
  button.append(iconEl);

  if (label !== "") {
    const labelEl = document.createElement("span");
    labelEl.className = "quietjar-widget__label";
    // textContent keeps a headline with markup in it from rendering as HTML.
    labelEl.textContent = label;
    button.append(labelEl);
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "quietjar-widget__close";
  closeButton.setAttribute("aria-label", config.closeLabel);
  closeButton.title = config.closeLabel;
  closeButton.append(closeIcon());
  closeButton.addEventListener("click", () => {
    if (options.persistDismissal) {
      persistDismissal();
    }
    host.remove();
  });

  widget.append(button, closeButton);
  root.append(widget);
  return host;
}

function closeIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "10");
  svg.setAttribute("height", "10");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", "M6 6l12 12M18 6L6 18");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "3");
  path.setAttribute("stroke-linecap", "round");
  svg.append(path);
  return svg;
}

// A constructed stylesheet is exempt from the style-src CSP directive, so the
// widget still renders on sites that ship a strict policy. Engines without
// constructable stylesheets fall back to a <style> element.
function applyStyles(root: ShadowRoot, color: string, labelFontFamily: string): void {
  const css = widgetStyles(color, labelFontFamily);

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

// @font-face is document-global, so a family declared by the host page still
// resolves inside the shadow root; reading the computed style picks up the
// page's effective stack.
function labelFontFamily(font: ResolvedConfig["font"], container: HTMLElement): string {
  if (font !== "inherit") {
    return FONT_STACKS[font];
  }
  const family = getComputedStyle(container).fontFamily;
  return family !== "" ? family : FONT_STACKS[DEFAULT_FONT];
}
