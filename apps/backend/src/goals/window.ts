/**
 * How long a goal's progress may be served from a cache. The public progress
 * endpoint and the static widget image both hold to it, so the bar in a PNG
 * can never lag the live meter by more than one window.
 */
export const GOAL_PROGRESS_TTL_MS = 5 * 60 * 1000;

/** When a goal's progress starts counting from. */
export type GoalWindow = "monthly" | "lifetime";

export const GOAL_WINDOWS: readonly GoalWindow[] = ["monthly", "lifetime"];

export function isGoalWindow(value: unknown): value is GoalWindow {
  return typeof value === "string" && GOAL_WINDOWS.includes(value as GoalWindow);
}

/**
 * Midnight UTC on the first of the month containing `now`. The progress
 * response is cached per goal and served worldwide, so the boundary cannot
 * depend on a viewer's clock; a site carries a country but no timezone.
 */
export function monthStart(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function windowStart(window: GoalWindow, now: number): number {
  return window === "monthly" ? monthStart(now) : 0;
}
