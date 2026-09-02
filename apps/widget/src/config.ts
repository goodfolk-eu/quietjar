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
  labels?: { headline?: string; icon?: string; close?: string };
  style?: { color?: string; font?: FontChoice };
  position?: { corner?: Corner };
  mount?: { target?: string | HTMLElement };
}

export interface ResolvedConfig {
  /** Visible button label; empty means the button stays icon-only. */
  headline: string;
  icon: string;
  /** Accessible name for the close control. */
  closeLabel: string;
  color: string;
  font: FontChoice;
  corner: Corner;
  target: string | HTMLElement | null;
}

export { DEFAULT_FONT, FONT_PRESETS, FONT_STACKS, type FontChoice, resolveFont } from "./font";

export { DEFAULT_ICON, ICON_LIBRARY, ICON_PRESETS } from "./icon";

/** Used as the accessible name when no headline is configured. */
export const DEFAULT_HEADLINE = "Support this site";
export const DEFAULT_CLOSE_LABEL = "Dismiss";
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

export function resolveConfig(input: QuietJarConfig | undefined): ResolvedConfig {
  const headline = input?.labels?.headline;
  const close = input?.labels?.close;
  const color = input?.style?.color;
  const corner = input?.position?.corner;
  const target = input?.mount?.target;

  return {
    headline: typeof headline === "string" ? headline.trim() : "",
    icon: resolveIcon(input?.labels?.icon),
    closeLabel:
      typeof close === "string" && close.trim() !== "" ? close.trim() : DEFAULT_CLOSE_LABEL,
    color: isValidHexColor(color) ? color : DEFAULT_COLOR,
    font: resolveFont(input?.style?.font),
    corner: CORNERS.includes(corner as Corner) ? (corner as Corner) : DEFAULT_CORNER,
    target: isMountTarget(target) ? target : null,
  };
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
