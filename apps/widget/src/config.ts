import { type FontChoice, resolveFont } from "./font";
import { resolveIcon } from "./icon";

export type Corner =
  | "bottom-right"
  | "bottom-center"
  | "bottom-left"
  | "top-right"
  | "top-center"
  | "top-left";

/** What a visitor closing the widget does to its visibility. */
export type CloseAfterMode = "session" | "days" | "never" | "forever";

/** What the widget does once its goal has been reached. */
export type GoalReachedMode = "hide" | "show" | "show-with-bar";

export interface QuietJarConfig {
  /** Public site key from the dashboard; without it the widget cannot collect. */
  site?: string;
  /** Overrides the QuietJar API origin. Only the widget dev server sets this. */
  api?: string;
  currency?: string;
  /** Goal id from the dashboard; renders the progress meter on the card. */
  goal?: string;
  /** What the widget does once the goal is reached. Ignored without a goal. */
  goalReached?: GoalReachedMode;
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
  close?: {
    enabled?: boolean;
    after?: CloseAfterMode;
    /** Days hidden after closing. Only used when after is "days". */
    days?: number;
  };
  donation?: { hideDays?: number };
  position?: { corner?: Corner };
  mount?: { target?: string | HTMLElement };
}

export interface ResolvedConfig {
  /** Empty when unset: the widget still renders, but cannot take payments. */
  site: string;
  api: string;
  /** ISO 4217 code, lowercase, as Stripe expects it. */
  currency: string;
  /** Empty when unset; otherwise the card renders a progress meter for it. */
  goal: string;
  /** What the widget does once the goal is reached. */
  goalReached: GoalReachedMode;
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
  /** Text glyph, the piggy sentinel for the default mark, or empty for no icon. */
  icon: string;
  /** Accessible name for the close control. */
  closeLabel: string;
  /** Whether the widget shows the close control visitors can use to dismiss it. */
  closeEnabled: boolean;
  color: string;
  /** What a visitor closing the widget does to its visibility. */
  closeAfter: CloseAfterMode;
  /** Days hidden after closing; only used when closeAfter is "days". */
  closeDays: number;
  /** Days hidden after a completed donation. */
  donationHideDays: number;
  font: FontChoice;
  /** Custom CSS overriding the widget's own styles; empty when unset. */
  css: string;
  corner: Corner;
  target: string | HTMLElement | null;
}

export { DEFAULT_FONT, FONT_PRESETS, FONT_STACKS, type FontChoice, resolveFont } from "./font";

export { DEFAULT_ICON, ICON_LIBRARY, ICON_PRESETS, PIGGY_ICON } from "./icon";

/** Used as the accessible name when no headline is configured. */
export const DEFAULT_HEADLINE = "Support this site";
export const DEFAULT_ACTION_LABEL = "Tip";
export const DEFAULT_CLOSE_LABEL = "Dismiss";
export const DEFAULT_THANKS_LABEL = "Thank you for your support";
export const DEFAULT_OTHER_LABEL = "Other";
export const DEFAULT_MINIMIZE_LABEL = "Minimize";
export const DEFAULT_API = "https://api.quietjar.com";
export const DEFAULT_CURRENCY = "eur";
export const MAX_AMOUNT_OPTIONS = 4;

interface CurrencyScale {
  min: number;
  max: number;
  presets: number[];
}

/**
 * Mirrors AMOUNT_BOUNDS in the backend, which is what actually enforces them;
 * these drive the input's min/max and the preset buttons. The widget ships to
 * third-party pages and cannot import backend code, so the two move together by
 * hand. `presets` are the euro defaults of 3/5/10 converted and rounded -- a
 * flat 3/5/10 would sit under the minimum charge in the low-value currencies.
 */
const SCALES: Record<string, CurrencyScale> = {
  aed: { min: 5, max: 2000, presets: [10, 25, 50] },
  ars: { min: 1000, max: 500_000, presets: [3000, 5000, 10_000] },
  aud: { min: 1, max: 800, presets: [5, 10, 20] },
  brl: { min: 5, max: 3000, presets: [20, 30, 60] },
  cad: { min: 1, max: 750, presets: [5, 10, 20] },
  chf: { min: 1, max: 500, presets: [3, 5, 10] },
  cop: { min: 5000, max: 2_000_000, presets: [15_000, 25_000, 50_000] },
  czk: { min: 20, max: 12_000, presets: [75, 125, 250] },
  dkk: { min: 5, max: 3500, presets: [25, 40, 75] },
  eur: { min: 1, max: 500, presets: [3, 5, 10] },
  gbp: { min: 1, max: 400, presets: [3, 5, 10] },
  hkd: { min: 5, max: 4000, presets: [25, 40, 80] },
  idr: { min: 20_000, max: 8_000_000, presets: [50_000, 100_000, 150_000] },
  ils: { min: 5, max: 2000, presets: [10, 20, 40] },
  inr: { min: 100, max: 45_000, presets: [250, 500, 1000] },
  mxn: { min: 20, max: 10_000, presets: [60, 100, 200] },
  myr: { min: 5, max: 2500, presets: [15, 25, 50] },
  nok: { min: 5, max: 6000, presets: [35, 60, 120] },
  nzd: { min: 2, max: 900, presets: [5, 10, 20] },
  php: { min: 100, max: 30_000, presets: [200, 300, 600] },
  pln: { min: 5, max: 2000, presets: [15, 25, 50] },
  ron: { min: 5, max: 2500, presets: [15, 25, 50] },
  sek: { min: 5, max: 6000, presets: [35, 60, 120] },
  sgd: { min: 1, max: 700, presets: [5, 10, 15] },
  thb: { min: 20, max: 18_000, presets: [100, 200, 400] },
  usd: { min: 1, max: 500, presets: [3, 5, 10] },
  zar: { min: 20, max: 10_000, presets: [60, 100, 200] },
};

export function amountScale(currency: string): CurrencyScale {
  return SCALES[currency.toLowerCase()] ?? SCALES[DEFAULT_CURRENCY];
}
export const DEFAULT_CLOSE_ENABLED = true;
export const DEFAULT_CLOSE_AFTER: CloseAfterMode = "session";
export const DEFAULT_GOAL_REACHED: GoalReachedMode = "hide";
export const DEFAULT_CLOSE_DAYS = 7;
export const DEFAULT_DONATION_HIDE_DAYS = 30;
export const DEFAULT_COLOR = "#0369a1";
export const DEFAULT_CORNER: Corner = "bottom-right";

export const CLOSE_AFTER_MODES: readonly CloseAfterMode[] = ["session", "days", "never", "forever"];
export const GOAL_REACHED_MODES: readonly GoalReachedMode[] = ["hide", "show", "show-with-bar"];
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
  const closeAfter = input?.close?.after;
  const closeDays = input?.close?.days;
  const donationHideDays = input?.donation?.hideDays;
  const color = input?.style?.color;
  const css = input?.style?.css;
  const corner = input?.position?.corner;
  const goalReached = input?.goalReached;
  const target = input?.mount?.target;

  // Amounts are bounded per currency, so the currency has to settle first.
  const currency = resolveCurrency(input?.currency);

  return {
    site: typeof input?.site === "string" ? input.site.trim() : "",
    api: resolveApi(input?.api),
    currency,
    goal: typeof input?.goal === "string" ? input.goal.trim() : "",
    goalReached: GOAL_REACHED_MODES.includes(goalReached as GoalReachedMode)
      ? (goalReached as GoalReachedMode)
      : DEFAULT_GOAL_REACHED,
    amounts: resolveAmounts(input?.amounts, currency),
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
    closeAfter: CLOSE_AFTER_MODES.includes(closeAfter as CloseAfterMode)
      ? (closeAfter as CloseAfterMode)
      : DEFAULT_CLOSE_AFTER,
    closeDays: resolveDays(closeDays, DEFAULT_CLOSE_DAYS),
    donationHideDays: resolveDays(donationHideDays, DEFAULT_DONATION_HIDE_DAYS),
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

/** A day count is only usable as a whole number of one or more. */
function resolveDays(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
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
function resolveAmounts(value: unknown, currency: string): number[] {
  const scale = amountScale(currency);
  if (!Array.isArray(value)) return [...scale.presets];
  const amounts: number[] = [];
  for (const entry of value) {
    if (typeof entry !== "number" || !Number.isFinite(entry)) continue;
    const amount = Math.round(entry * 100) / 100;
    if (amount < scale.min || amount > scale.max) continue;
    if (!amounts.includes(amount)) amounts.push(amount);
  }
  if (amounts.length === 0) return [...scale.presets];
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
