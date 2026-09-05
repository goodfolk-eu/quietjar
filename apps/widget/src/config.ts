import { type FontChoice, resolveFont } from "./font";
import { resolveIcon } from "./icon";

export type Corner =
  | "bottom-right"
  | "bottom-center"
  | "bottom-left"
  | "top-right"
  | "top-center"
  | "top-left";

export interface QuietJarConfig {
  /** Public site key from the dashboard; without it the widget cannot collect. */
  site?: string;
  /** Overrides the QuietJar API origin. Only the widget dev server sets this. */
  api?: string;
  currency?: string;
  /** Amounts offered in the payment container, in major units. */
  amounts?: number[];
  labels?: {
    headline?: string;
    icon?: string;
    body?: string;
    action?: string;
    close?: string;
    thanks?: string;
    other?: string;
    minimize?: string;
  };
  style?: {
    color?: string;
    font?: FontChoice;
    /** Raw CSS appended after the widget's own stylesheet to override it. */
    css?: string;
  };
  close?: { enabled?: boolean };
  position?: { corner?: Corner };
  mount?: { target?: string | HTMLElement };
}

export interface ResolvedConfig {
  /** Empty when unset: the widget still renders, but cannot take payments. */
  site: string;
  api: string;
  /** ISO 4217 code, lowercase, as Stripe expects it. */
  currency: string;
  amounts: number[];
  /** Shown in the container once a tip succeeds. */
  thanksLabel: string;
  /** Label for the free-entry amount option. */
  otherLabel: string;
  /** Accessible name for the control that collapses the container. */
  minimizeLabel: string;
  /** Visible button label; empty means the button stays icon-only. */
  headline: string;
  /** Card body; empty means the widget renders as a plain pill button. */
  body: string;
  /** Label for the card's action button. */
  actionLabel: string;
  icon: string;
  /** Accessible name for the close control. */
  closeLabel: string;
  /** Whether the widget shows the close control visitors can use to dismiss it. */
  closeEnabled: boolean;
  color: string;
  font: FontChoice;
  /** Custom CSS overriding the widget's own styles; empty when unset. */
  css: string;
  corner: Corner;
  target: string | HTMLElement | null;
}

export { DEFAULT_FONT, FONT_PRESETS, FONT_STACKS, type FontChoice, resolveFont } from "./font";

export { DEFAULT_ICON, ICON_LIBRARY, ICON_PRESETS } from "./icon";

/** Used as the accessible name when no headline is configured. */
export const DEFAULT_HEADLINE = "Support this site";
export const DEFAULT_ACTION_LABEL = "Tip";
export const DEFAULT_CLOSE_LABEL = "Dismiss";
export const DEFAULT_THANKS_LABEL = "Thank you for your support";
export const DEFAULT_OTHER_LABEL = "Other";
export const DEFAULT_MINIMIZE_LABEL = "Minimize";
export const DEFAULT_API = "https://api.quietjar.com";
export const DEFAULT_CURRENCY = "eur";
export const DEFAULT_AMOUNTS = [3, 5, 10];
/** Matches the bounds the payment endpoint enforces. */
export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 500;
export const MAX_AMOUNT_OPTIONS = 4;
export const DEFAULT_CLOSE_ENABLED = true;
export const DEFAULT_COLOR = "#0284c7";
export const DEFAULT_CORNER: Corner = "bottom-right";

const CORNERS: readonly Corner[] = [
  "bottom-right",
  "bottom-center",
  "bottom-left",
  "top-right",
  "top-center",
  "top-left",
];
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CURRENCY_CODE = /^[a-zA-Z]{3}$/;

export function resolveConfig(input: QuietJarConfig | undefined): ResolvedConfig {
  const headline = input?.labels?.headline;
  const body = input?.labels?.body;
  const action = input?.labels?.action;
  const close = input?.labels?.close;
  const closeEnabled = input?.close?.enabled;
  const color = input?.style?.color;
  const css = input?.style?.css;
  const corner = input?.position?.corner;
  const target = input?.mount?.target;

  return {
    site: typeof input?.site === "string" ? input.site.trim() : "",
    api: resolveApi(input?.api),
    currency: resolveCurrency(input?.currency),
    amounts: resolveAmounts(input?.amounts),
    thanksLabel: label(input?.labels?.thanks, DEFAULT_THANKS_LABEL),
    otherLabel: label(input?.labels?.other, DEFAULT_OTHER_LABEL),
    minimizeLabel: label(input?.labels?.minimize, DEFAULT_MINIMIZE_LABEL),
    headline: typeof headline === "string" ? headline.trim() : "",
    body: typeof body === "string" ? body.trim() : "",
    actionLabel:
      typeof action === "string" && action.trim() !== "" ? action.trim() : DEFAULT_ACTION_LABEL,
    icon: resolveIcon(input?.labels?.icon),
    closeLabel:
      typeof close === "string" && close.trim() !== "" ? close.trim() : DEFAULT_CLOSE_LABEL,
    closeEnabled: typeof closeEnabled === "boolean" ? closeEnabled : DEFAULT_CLOSE_ENABLED,
    color: isValidHexColor(color) ? color : DEFAULT_COLOR,
    font: resolveFont(input?.style?.font),
    css: typeof css === "string" ? css.trim() : "",
    corner: CORNERS.includes(corner as Corner) ? (corner as Corner) : DEFAULT_CORNER,
    target: isMountTarget(target) ? target : null,
  };
}

function label(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function resolveCurrency(value: unknown): string {
  return typeof value === "string" && CURRENCY_CODE.test(value)
    ? value.toLowerCase()
    : DEFAULT_CURRENCY;
}

function resolveApi(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") return DEFAULT_API;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return DEFAULT_API;
  }
}

/**
 * A bad amount list would leave the container with nothing to offer, so an
 * unusable entry is dropped rather than shown, and an empty result falls back
 * to the defaults.
 */
function resolveAmounts(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_AMOUNTS];
  const amounts: number[] = [];
  for (const entry of value) {
    if (typeof entry !== "number" || !Number.isFinite(entry)) continue;
    const amount = Math.round(entry * 100) / 100;
    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) continue;
    if (!amounts.includes(amount)) amounts.push(amount);
  }
  if (amounts.length === 0) return [...DEFAULT_AMOUNTS];
  return amounts.slice(0, MAX_AMOUNT_OPTIONS).sort((a, b) => a - b);
}

function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

function isMountTarget(value: unknown): value is string | HTMLElement {
  if (typeof value === "string") {
    return value.trim() !== "";
  }
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}
