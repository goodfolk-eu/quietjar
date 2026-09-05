export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Placement {
  top: number;
  left: number;
  /**
   * Height the container has to fit in. A panel taller than this scrolls
   * inside itself rather than growing over the widget it belongs to.
   */
  maxHeight: number;
  /** Docked to the bottom of the viewport instead of anchored to the widget. */
  sheet: boolean;
}

/** Below this the container docks to the bottom edge rather than anchoring. */
export const SHEET_BREAKPOINT = 640;
/** How much of a narrow viewport the docked sheet may cover. */
export const SHEET_HEIGHT_RATIO = 0.85;
const MARGIN = 12;
const GAP = 16;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Place the container against the widget on whichever side has room, and keep
 * it inside the viewport whatever the widget's corner is. Pure arithmetic so
 * the behaviour is testable without a layout engine.
 */
export function computePlacement(anchor: Box, panel: Box, viewport: Viewport): Placement {
  if (viewport.width <= SHEET_BREAKPOINT) {
    const maxHeight = Math.round(viewport.height * SHEET_HEIGHT_RATIO);
    const height = Math.min(panel.height, maxHeight);
    return { top: Math.max(viewport.height - height, 0), left: 0, maxHeight, sheet: true };
  }

  // Space each side leaves once the gap to the widget and the viewport margin
  // are taken out, so the panel never has to be clamped over the widget.
  const spaceAbove = anchor.top - GAP - MARGIN;
  const spaceBelow = viewport.height - (anchor.top + anchor.height) - GAP - MARGIN;
  const preferAbove =
    spaceAbove >= panel.height || (spaceBelow < panel.height && spaceAbove >= spaceBelow);

  const maxHeight = Math.max(preferAbove ? spaceAbove : spaceBelow, 0);
  const height = Math.min(panel.height, maxHeight);
  const top = preferAbove ? anchor.top - GAP - height : anchor.top + anchor.height + GAP;

  // Centred on the widget: a centred widget gets a centred panel, and a corner
  // one ends up in its corner anyway once the viewport margin clamps it. The
  // panel and a card face share a width, so for those the edges line up too.
  const anchorCentre = anchor.left + anchor.width / 2;
  const left = clamp(anchorCentre - panel.width / 2, MARGIN, viewport.width - panel.width - MARGIN);

  return { top, left, maxHeight, sheet: false };
}
