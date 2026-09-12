const LUMA_CUTOFF = 150;

const BLACK = "#000000";
const WHITE = "#ffffff";

/**
 * Perceived luma (0-255). The cutoff is roughly where white stops reading as
 * text on the color.
 */
function luma(hex: string): number {
  const digits = hex.slice(1);
  // Alpha colors blend with the host page, so the effective background is
  // unknowable; the channels alone are the signal to go on.
  const rgb =
    digits.length <= 4 ? [...digits.slice(0, 3)].map((d) => d + d).join("") : digits.slice(0, 6);
  const value = Number.parseInt(rgb, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Black or white, whichever reads as text on the given color as a background. */
export function contrastText(hex: string): string {
  return luma(hex) >= LUMA_CUTOFF ? BLACK : WHITE;
}

/** The color itself when it reads as text on white, otherwise black. */
export function textColorOnWhite(hex: string): string {
  return luma(hex) < LUMA_CUTOFF ? hex : BLACK;
}
