import {
  DEFAULT_FONT,
  DEFAULT_HEADLINE,
  FONT_STACKS,
  PIGGY_ICON,
  type ResolvedConfig,
} from "./config";
import { createPaymentContainer, type PaymentContainer } from "./container";
import { persistDismissal } from "./dismiss";
import { barVisible, fetchGoalProgress, type GoalProgress, meterLabel, meterRatio } from "./goal";
import { widgetStyles } from "./styles";

const HOST_SELECTOR = "[data-quietjar-host]";
const METER_SELECTOR = ".quietjar-widget__meter";

/** The clickable face of the widget: a pill button, or a card panel. */
export const FACE_SELECTOR = ".quietjar-widget__button, .quietjar-widget__panel";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface MountOptions {
  /** Persist the dismissal per the config's close mode when the widget is closed. */
  persistDismissal?: boolean;
  /**
   * Box the payment container is placed inside of, for a preview that frames
   * the widget rather than filling the window. Defaults to the viewport.
   */
  viewport?: HTMLElement;
  /**
   * Goal progress the caller already holds. Passing it, null included, builds
   * the final face in one go instead of mounting a bar that fills a moment
   * later, which is what lets a reached goal choose its shape up front.
   */
  progress?: GoalProgress | null;
  /**
   * Element the host is inserted into, for a preview that frames the widget.
   * Unlike the config's mount target this keeps the floating corner
   * placement; it only chooses where the host lands in the DOM.
   */
  target?: HTMLElement;
}

const containers = new WeakMap<HTMLElement, PaymentContainer>();

/** The payment container belonging to a mounted widget host. */
export function paymentContainer(host: HTMLElement): PaymentContainer | undefined {
  return containers.get(host);
}

export function mountWidget(config: ResolvedConfig, options: MountOptions = {}): HTMLElement {
  const container = options.target ?? resolveContainer(config);
  const existing = container.querySelector<HTMLElement>(HOST_SELECTOR);
  if (existing) {
    return existing;
  }

  // The config's mount target puts the widget in the target's flow; the fixed
  // corner classes would keep pinning it to the viewport and defeat the
  // placement. A preview target only chooses where the host is inserted, so
  // the corner placement stays.
  const inline = options.target === undefined && container !== document.body;
  const host = document.createElement("div");
  host.setAttribute("data-quietjar-host", "");
  host.style.cssText = inline ? "all: initial; display: block;" : "all: initial;";
  container.append(host);

  const root = host.attachShadow({ mode: "open" });
  applyStyles(root, config.color, labelFontFamily(config.font, container), config.css);

  const widget = document.createElement("div");
  widget.className = inline
    ? "quietjar-widget quietjar-widget--inline"
    : `quietjar-widget quietjar-widget--${config.corner}`;
  // A goal needs the vertical room only the card has, so it turns the pill into
  // one even when the owner wrote no body text. With the progress already in
  // hand a reached goal can drop the bar, and the card with it.
  const bar =
    options.progress === undefined
      ? config.goal !== ""
      : barVisible(config.goalReached, options.progress);
  const face = config.body !== "" || bar ? cardPanel(config, bar) : pillButton(config);
  widget.append(face);

  const meter = face.querySelector<HTMLElement>(METER_SELECTOR);
  if (meter) {
    if (options.progress === undefined) {
      void fillMeter(meter, config);
    } else if (options.progress !== null) {
      paintMeter(meter, options.progress);
    }
  }

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
        persistDismissal(config.closeAfter, config.closeDays);
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
      viewport: options.viewport,
      onVisibilityChange: (open) => widget.classList.toggle("quietjar-widget--open", open),
    });
    trigger.addEventListener("click", () => container.open());
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

  const iconEl = iconElement(config);
  if (iconEl) {
    button.append(iconEl);
  }

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
function cardPanel(config: ResolvedConfig, bar: boolean): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "quietjar-widget__panel";

  const iconEl = iconElement(config);
  if (iconEl) {
    panel.append(iconEl);
  }

  const text = document.createElement("div");
  text.className = "quietjar-widget__text";

  if (config.headline !== "") {
    const headline = document.createElement("div");
    headline.className = "quietjar-widget__headline";
    headline.textContent = config.headline;
    text.append(headline);
  }

  if (config.body !== "") {
    const body = document.createElement("div");
    body.className = "quietjar-widget__body";
    body.textContent = config.body;
    text.append(body);
  }

  if (bar) {
    text.append(meterRow());
  }

  panel.append(text);

  const action = document.createElement("button");
  action.type = "button";
  action.className = "quietjar-widget__action";
  action.textContent = config.actionLabel;
  panel.append(action);

  return panel;
}

/**
 * Built empty and filled once the progress lands, so the card does not grow a
 * row a moment after it appears. A failed lookup removes it again.
 */
function meterRow(): HTMLElement {
  const meter = document.createElement("div");
  meter.className = "quietjar-widget__meter";

  const track = document.createElement("div");
  track.className = "quietjar-widget__meter-track";
  // The label states the same amounts in words, so the bar is decoration.
  track.setAttribute("aria-hidden", "true");
  const fill = document.createElement("div");
  fill.className = "quietjar-widget__meter-fill";
  track.append(fill);

  const label = document.createElement("div");
  label.className = "quietjar-widget__meter-label";

  meter.append(track, label);
  return meter;
}

async function fillMeter(meter: HTMLElement, config: ResolvedConfig): Promise<void> {
  const progress = await fetchGoalProgress(config.api, config.goal);
  if (progress === null || !barVisible(config.goalReached, progress)) {
    meter.remove();
    return;
  }
  paintMeter(meter, progress);
}

function paintMeter(meter: HTMLElement, progress: GoalProgress): void {
  const fill = meter.querySelector<HTMLElement>(".quietjar-widget__meter-fill");
  const label = meter.querySelector<HTMLElement>(".quietjar-widget__meter-label");
  if (fill) fill.style.width = `${meterRatio(progress) * 100}%`;
  if (label) label.textContent = meterLabel(progress);
}

function iconElement(config: ResolvedConfig): HTMLSpanElement | null {
  if (config.icon === "") {
    return null;
  }
  const iconEl = document.createElement("span");
  iconEl.className = "quietjar-widget__icon";
  iconEl.setAttribute("aria-hidden", "true");
  if (config.icon === PIGGY_ICON) {
    iconEl.append(piggyIcon());
  } else {
    iconEl.textContent = config.icon;
  }
  return iconEl;
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

function piggyIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "45 13 150 150");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("aria-hidden", "true");

  const el = (parent: Element, name: string, attrs: Record<string, string>): SVGElement => {
    const node = document.createElementNS(SVG_NAMESPACE, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  };

  const mask = el(svg, "mask", {
    id: "qj-piggy-mask",
    maskUnits: "userSpaceOnUse",
    x: "0",
    y: "0",
    width: "240",
    height: "180",
  });
  const clip = el(mask, "clipPath", { id: "qj-piggy-clip" });
  el(clip, "rect", { x: "56.9", y: "44.4", width: "126.3", height: "99.2", rx: "47.6" });
  const white = el(mask, "g", {
    fill: "#fff",
    stroke: "#fff",
    "stroke-width": "6",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });
  el(white, "path", { d: "M68.5 64.2 L45.3 56.9 L70.6 81.1 Z" });
  el(white, "path", { d: "M78.4 121.2 L99.5 121.2 L87.5 157.1 L77.2 157.1 Z" });
  el(white, "path", { d: "M140.5 121.2 L161.6 121.2 L162.8 157.1 L152.5 157.1 Z" });
  el(white, "path", { d: "M193.3 80.6 L174.3 79 L163.5 131.5 L193.3 104.6 Z" });
  el(white, "path", { d: "M140.7 33.3 L194.2 55.8 L138.1 73.2 Z" });
  el(white, "rect", { x: "59.9", y: "47.4", width: "120.3", height: "93.2", rx: "44.6" });
  el(white, "path", { d: "M116.5 44.9 L147.6 17.8 L138.9 91 Z" });
  const black = el(mask, "g", { "clip-path": "url(#qj-piggy-clip)" });
  el(black, "path", {
    d: "M116.5 44.9 L147.6 17.8 L138.9 91 Z",
    fill: "#000",
    stroke: "#000",
    "stroke-width": "6",
    "stroke-linejoin": "round",
  });
  el(black, "path", { d: "M113.6 44.3 L127.1 35.7 L122.6 57.5 Z", fill: "#000" });
  el(mask, "circle", { cx: "160.5", cy: "80.5", r: "7.2", fill: "#000" });
  el(svg, "rect", {
    x: "0",
    y: "0",
    width: "240",
    height: "180",
    fill: "currentColor",
    mask: "url(#qj-piggy-mask)",
  });
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
