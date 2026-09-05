import { DEFAULT_FONT, DEFAULT_HEADLINE, FONT_STACKS, type ResolvedConfig } from "./config";
import { createPaymentContainer, type PaymentContainer } from "./container";
import { persistDismissal } from "./dismiss";
import { widgetStyles } from "./styles";

const HOST_SELECTOR = "[data-quietjar-host]";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface MountOptions {
  /** Store the dismissal in sessionStorage when the widget is closed. */
  persistDismissal?: boolean;
}

const containers = new WeakMap<HTMLElement, PaymentContainer>();

/** The payment container belonging to a mounted widget host. */
export function paymentContainer(host: HTMLElement): PaymentContainer | undefined {
  return containers.get(host);
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
  applyStyles(root, config.color, labelFontFamily(config.font, container), config.css);

  const widget = document.createElement("div");
  widget.className = `quietjar-widget quietjar-widget--${config.corner}`;
  const face = config.body !== "" ? cardPanel(config) : pillButton(config);
  widget.append(face);

  const trigger =
    face instanceof HTMLButtonElement
      ? face
      : face.querySelector<HTMLButtonElement>(".quietjar-widget__action");

  if (config.closeEnabled) {
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
    widget.append(closeButton);
  }

  root.append(widget);

  if (trigger) {
    // The container is a sibling of the widget: a corner that uses a transform
    // would otherwise become the containing block for its fixed position.
    const container = createPaymentContainer({
      config,
      // The card's action button is only part of the face, so the placement
      // measures the whole face and the trigger only takes focus back.
      anchor: face,
      trigger,
      host,
      onVisibilityChange: (open) => widget.classList.toggle("quietjar-widget--open", open),
    });
    trigger.addEventListener("click", container.open);
    root.append(container.element);
    containers.set(host, container);
  }

  return host;
}

function pillButton(config: ResolvedConfig): HTMLButtonElement {
  const label = config.headline;
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

  return button;
}

// With a body the widget is an informational card instead of a clickable
// pill: bold headline, multi-line body, and an action button on the right.
function cardPanel(config: ResolvedConfig): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "quietjar-widget__panel";

  const text = document.createElement("div");
  text.className = "quietjar-widget__text";

  if (config.headline !== "") {
    const headline = document.createElement("div");
    headline.className = "quietjar-widget__headline";
    headline.textContent = config.headline;
    text.append(headline);
  }

  const body = document.createElement("div");
  body.className = "quietjar-widget__body";
  body.textContent = config.body;
  text.append(body);
  panel.append(text);

  const action = document.createElement("button");
  action.type = "button";
  action.className = "quietjar-widget__action";
  action.textContent = config.actionLabel;
  panel.append(action);

  return panel;
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
function applyStyles(
  root: ShadowRoot,
  color: string,
  labelFontFamily: string,
  customCss: string,
): void {
  const css = widgetStyles(color, labelFontFamily);

  if (typeof CSSStyleSheet === "function" && "replaceSync" in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const sheets = [sheet];
    if (customCss !== "") {
      // A separate sheet ordered after the base one lets the custom CSS
      // override it, and keeps invalid custom CSS (replaceSync rejects
      // @import) from taking down the widget's own styles.
      try {
        const custom = new CSSStyleSheet();
        custom.replaceSync(customCss);
        sheets.push(custom);
      } catch {
        // invalid custom CSS is ignored
      }
    }
    root.adoptedStyleSheets = sheets;
    return;
  }

  const style = document.createElement("style");
  // Custom CSS goes last: CSS error recovery only eats rules after it.
  style.textContent = customCss !== "" ? `${css}\n${customCss}` : css;
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
