/** Quick picks shown in the dashboard font picker. */
export const FONT_PRESETS = ["system", "serif", "rounded", "mono"] as const;

export type FontPreset = (typeof FONT_PRESETS)[number];

export const INHERIT_FONT = "inherit";

export type FontChoice = FontPreset | typeof INHERIT_FONT;

export const DEFAULT_FONT: FontPreset = "rounded";

/**
 * System stacks only: the widget is embedded on sites whose CSP may block
 * font-src, so no webfonts are fetched. Each preset trades exactness for
 * personality that survives across platforms.
 */
export const FONT_STACKS: Record<FontPreset, string> = {
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: "ui-serif, Georgia, Charter, serif",
  rounded: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono", monospace',
};

export function resolveFont(value: unknown): FontChoice {
  if (value === INHERIT_FONT) {
    return INHERIT_FONT;
  }
  if (typeof value === "string" && (FONT_PRESETS as readonly string[]).includes(value)) {
    return value as FontPreset;
  }
  return DEFAULT_FONT;
}
