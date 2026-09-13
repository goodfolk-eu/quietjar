import { formatAmount } from "./money";

export interface GoalProgress {
  /** Minor units raised toward the goal inside its window. */
  raised: number;
  /** Minor units the goal is aiming for. */
  target: number;
  currency: string;
}

/**
 * One lookup per goal for the life of the page. Two widgets sharing a goal
 * therefore cost one request, and the dashboard's editor preview, which
 * remounts the widget on every keystroke, does not re-ask on each one.
 */
const lookups = new Map<string, Promise<GoalProgress | null>>();

/**
 * Reads a goal's progress. Never throws: the meter is decoration on a donation
 * button, so a failed lookup drops the bar rather than the widget.
 */
export function fetchGoalProgress(api: string, goalId: string): Promise<GoalProgress | null> {
  const key = `${api}\n${goalId}`;
  const existing = lookups.get(key);
  if (existing) return existing;
  const pending = loadGoalProgress(api, goalId);
  lookups.set(key, pending);
  return pending;
}

async function loadGoalProgress(api: string, goalId: string): Promise<GoalProgress | null> {
  try {
    const response = await fetch(`${api}/api/widget/goal/${encodeURIComponent(goalId)}/progress`);
    if (!response.ok) return null;
    const body = (await response.json()) as Partial<GoalProgress>;
    if (
      typeof body.raised !== "number" ||
      typeof body.target !== "number" ||
      typeof body.currency !== "string"
    ) {
      return null;
    }
    return { raised: body.raised, target: body.target, currency: body.currency };
  } catch {
    return null;
  }
}

export function isGoalMet(progress: GoalProgress): boolean {
  return progress.target > 0 && progress.raised >= progress.target;
}

/** How full the bar is, 0 to 1. A met or overshot goal fills it exactly. */
export function meterRatio(progress: GoalProgress): number {
  if (progress.target <= 0) return 0;
  return Math.min(1, Math.max(0, progress.raised / progress.target));
}

/**
 * A met goal reports what came in rather than restating the target, so an
 * overshoot stays honest instead of reading as exactly the target.
 */
export function meterLabel(progress: GoalProgress): string {
  const raised = formatAmount(progress.raised / 100, progress.currency);
  if (isGoalMet(progress)) return `Goal reached, ${raised} raised`;
  return `${raised} of ${formatAmount(progress.target / 100, progress.currency)} raised`;
}
