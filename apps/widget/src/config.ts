export type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface QuietJarConfig {
  labels?: { headline?: string };
  style?: { color?: string };
  position?: { corner?: Corner };
  mount?: { target?: string | HTMLElement };
}

export interface ResolvedConfig {
  headline: string;
  color: string;
  corner: Corner;
  target: string | HTMLElement | null;
}

export const DEFAULT_HEADLINE = "Support this site";
export const DEFAULT_COLOR = "#0f172a";
export const DEFAULT_CORNER: Corner = "bottom-right";

const CORNERS: readonly Corner[] = ["bottom-right", "bottom-left", "top-right", "top-left"];
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function resolveConfig(input: QuietJarConfig | undefined): ResolvedConfig {
  const headline = input?.labels?.headline;
  const color = input?.style?.color;
  const corner = input?.position?.corner;
  const target = input?.mount?.target;

  return {
    headline: typeof headline === "string" && headline !== "" ? headline : DEFAULT_HEADLINE,
    color: isValidHexColor(color) ? color : DEFAULT_COLOR,
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
