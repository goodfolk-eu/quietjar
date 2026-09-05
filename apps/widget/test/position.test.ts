import { describe, expect, test } from "bun:test";
import "./setup";
import { type Box, computePlacement, SHEET_BREAKPOINT } from "../src/position";

const panel: Box = { top: 0, left: 0, width: 340, height: 400 };
const desktop = { width: 1280, height: 900 };

function button(left: number, top: number): Box {
  return { left, top, width: 56, height: 56 };
}

describe("computePlacement", () => {
  test("sits a gap above a bottom-corner button", () => {
    const placement = computePlacement(button(1200, 820), panel, desktop);
    expect(placement.sheet).toBe(false);
    expect(placement.top).toBe(820 - 16 - 400);
  });

  test("clears a tall card instead of covering it", () => {
    // A card widget is the anchor, not just the small action button in it.
    const card: Box = { left: 1000, top: 700, width: 360, height: 120 };
    const placement = computePlacement(card, panel, desktop);
    expect(placement.top + panel.height).toBe(card.top - 16);
  });

  test("flips below when there is no room above", () => {
    const placement = computePlacement(button(1200, 40), panel, desktop);
    expect(placement.top).toBe(40 + 56 + 16);
  });

  test("gives the panel a height that keeps it off the button", () => {
    // Too tall for either side, so it takes the roomier one and scrolls
    // inside the space that is actually there instead of covering the button.
    const tall: Box = { top: 0, left: 0, width: 340, height: 880 };
    const placement = computePlacement(button(1200, 400), tall, desktop);
    expect(placement.top).toBe(400 + 56 + 16);
    expect(placement.maxHeight).toBe(desktop.height - (400 + 56) - 16 - 12);
    expect(placement.top + placement.maxHeight).toBe(desktop.height - 12);
  });

  test("never overlaps the anchor from either side", () => {
    const tall: Box = { top: 0, left: 0, width: 340, height: 2000 };
    for (const top of [0, 40, 200, 400, 600, 820, 880]) {
      const anchor = button(1200, top);
      const placement = computePlacement(anchor, tall, desktop);
      const bottom = placement.top + Math.min(tall.height, placement.maxHeight);
      const clears =
        bottom <= anchor.top || placement.top >= anchor.top + anchor.height;
      expect(clears).toBe(true);
      expect(placement.top).toBeGreaterThanOrEqual(12);
      expect(bottom).toBeLessThanOrEqual(desktop.height - 12);
    }
  });

  test("centres the panel on a centred widget", () => {
    // The bottom-center corner puts the widget in the middle of the viewport,
    // so the panel above it has to be centred too.
    const centred: Box = { left: (desktop.width - 360) / 2, top: 820, width: 360, height: 56 };
    const placement = computePlacement(centred, panel, desktop);

    const panelCentre = placement.left + panel.width / 2;
    expect(panelCentre).toBe(desktop.width / 2);
  });

  test("lines up with a card face, which shares the panel's width", () => {
    const card: Box = { left: 896, top: 820, width: 360, height: 56 };
    const wide: Box = { top: 0, left: 0, width: 360, height: 400 };
    const placement = computePlacement(card, wide, desktop);

    expect(placement.left).toBe(card.left);
  });

  test("keeps a corner widget in its corner", () => {
    const placement = computePlacement(button(1200, 820), panel, desktop);
    expect(placement.left).toBe(desktop.width - 340 - 12);
  });

  test("never leaves the viewport horizontally", () => {
    const placement = computePlacement(button(4, 820), panel, desktop);
    expect(placement.left).toBeGreaterThanOrEqual(12);

    const right = computePlacement(button(1270, 820), panel, desktop);
    expect(right.left).toBeLessThanOrEqual(desktop.width - 340 - 12);
  });

  test("docks to the bottom on a narrow viewport", () => {
    const placement = computePlacement(button(300, 600), panel, {
      width: SHEET_BREAKPOINT,
      height: 700,
    });
    expect(placement).toEqual({ top: 300, left: 0, maxHeight: 595, sheet: true });
  });
});
