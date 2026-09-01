/** Quick picks shown inline in the dashboard picker. */
export const ICON_PRESETS = ["♥", "☕", "★", "✿", "☂", "✉", "⚡", "☺"] as const;

/**
 * The full set offered behind "browse all" in the dashboard. Curated rather
 * than a complete emoji index: these are the glyphs that read well at 24px on
 * a solid button. The custom field still accepts anything else.
 */
export const ICON_LIBRARY = [
  "♥",
  "♡",
  "★",
  "☆",
  "✦",
  "✧",
  "❀",
  "✿",
  "❉",
  "❊",
  "✺",
  "✹",
  "✸",
  "❦",
  "☺",
  "☻",
  "✓",
  "➜",
  "✉",
  "✎",
  "✂",
  "☂",
  "☁",
  "⚡",
  "✨",
  "🔆",
  "☕",
  "🍵",
  "🍺",
  "🍪",
  "🍩",
  "🥤",
  "🌮",
  "🍫",
  "🎁",
  "💝",
  "🪙",
  "💰",
  "🧡",
  "🫙",
  "🙏",
  "🤝",
  "🚀",
  "🔥",
  "💡",
  "📚",
  "🎧",
  "🎨",
  "🛠",
  "🐛",
] as const;

export const DEFAULT_ICON = "♥";

// A glyph can span several code units (surrogate pairs, variation selectors,
// ZWJ sequences), so the cap counts characters generously rather than exactly.
const MAX_ICON_LENGTH = 8;

export function resolveIcon(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_ICON;
  }
  const icon = value.trim();
  if (icon === "" || icon.length > MAX_ICON_LENGTH) {
    return DEFAULT_ICON;
  }
  return icon;
}
