import { randomBytes } from "node:crypto";
import { libsqlClient } from "../db";
import type { GoalWindow } from "./window";

/** Active goals a site may hold at once. */
export const MAX_GOALS_PER_SITE = 20;

export interface Goal {
  id: string;
  siteId: string;
  name: string;
  /** Minor units of the site's currency. */
  target: number;
  window: GoalWindow;
  /** Set once archived; archived goals leave the dashboard and stop reporting. */
  archivedAt: number | null;
}

interface Row {
  id: string;
  site_id: string;
  name: string;
  target: number;
  period: string;
  archived_at: number | null;
}

function toGoal(row: Row): Goal {
  return {
    id: row.id,
    siteId: row.site_id,
    name: row.name,
    target: row.target,
    window: row.period as GoalWindow,
    archivedAt: row.archived_at,
  };
}

/**
 * The id is pasted into public HTML, so it carries no meaning: it only has to
 * be unguessable and recognisable in a support conversation.
 */
function newGoalId(): string {
  return `qg_${randomBytes(8).toString("hex")}`;
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const result = await libsqlClient.execute({
    sql: "SELECT * FROM goals WHERE id = ?",
    args: [id],
  });
  return result.rows.length > 0 ? toGoal(result.rows[0] as unknown as Row) : null;
}

/**
 * Oldest first, so a site's list does not reshuffle as goals are edited.
 * rowid breaks the tie rather than the id, which is random: two goals created
 * in the same millisecond would otherwise land in an arbitrary order.
 */
export async function listGoalsBySite(siteId: string): Promise<Goal[]> {
  const result = await libsqlClient.execute({
    sql: `SELECT * FROM goals
          WHERE site_id = ? AND archived_at IS NULL
          ORDER BY created_at, rowid`,
    args: [siteId],
  });
  return result.rows.map((row) => toGoal(row as unknown as Row));
}

export async function countActiveGoals(siteId: string): Promise<number> {
  const result = await libsqlClient.execute({
    sql: "SELECT COUNT(*) AS total FROM goals WHERE site_id = ? AND archived_at IS NULL",
    args: [siteId],
  });
  const row = result.rows[0] as unknown as { total: number } | undefined;
  return typeof row?.total === "number" ? row.total : 0;
}

export interface GoalInput {
  name: string;
  target: number;
  window: GoalWindow;
}

export async function createGoal(input: GoalInput & { siteId: string }): Promise<Goal> {
  const now = Date.now();
  const goal: Goal = {
    id: newGoalId(),
    siteId: input.siteId,
    name: input.name,
    target: input.target,
    window: input.window,
    archivedAt: null,
  };
  await libsqlClient.execute({
    sql: `INSERT INTO goals
            (id, site_id, name, target, period, archived_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    args: [goal.id, goal.siteId, goal.name, goal.target, goal.window, now, now],
  });
  return goal;
}

/**
 * Target and window are only read when progress is computed, so changing them
 * re-reads the same attributed donations under the new terms rather than
 * rewriting anything.
 */
export async function updateGoal(id: string, input: GoalInput): Promise<void> {
  await libsqlClient.execute({
    sql: `UPDATE goals
            SET name = ?, target = ?, period = ?, updated_at = ?
          WHERE id = ?`,
    args: [input.name, input.target, input.window, Date.now(), id],
  });
}

export async function archiveGoal(id: string): Promise<void> {
  const now = Date.now();
  await libsqlClient.execute({
    sql: "UPDATE goals SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL",
    args: [now, now, id],
  });
}

/**
 * A goal the site is allowed to name. The ownership check is what stops one
 * site pointing its widget at another site's goal.
 */
export async function goalForSite(id: string, siteId: string): Promise<Goal | null> {
  const goal = await getGoalById(id);
  return goal && goal.siteId === siteId ? goal : null;
}

/** The same, and still live: what a new donation may be set up against. */
export async function activeGoalForSite(id: string, siteId: string): Promise<Goal | null> {
  const goal = await goalForSite(id, siteId);
  return goal?.archivedAt === null ? goal : null;
}
