import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { RateLimiter } from "../pay/limits";
import { goalRaised, raisedByGoal } from "../pay/store";
import { toMinorUnits } from "../sites/currency";
import { getSiteById, getSiteByUserId } from "../sites/store";
import {
  archiveGoal,
  countActiveGoals,
  createGoal,
  type Goal,
  type GoalInput,
  getGoalById,
  listGoalsBySite,
  MAX_GOALS_PER_SITE,
  updateGoal,
} from "./store";
import { GOAL_PROGRESS_TTL_MS, isGoalWindow, monthStart, windowStart } from "./window";

export const MAX_GOAL_NAME_LENGTH = 80;
/** Major units of the site's currency. A goal is a real cost, not a fortune. */
const TARGET_BOUNDS = { min: 1, max: 1_000_000 };

/** Progress is edge-cached, so this only guards the misses. */
const progressPerIp = new RateLimiter(60, 60_000);

/** Every visitor of every site sees the same answer, so it caches at the edge. */
const PROGRESS_CACHE_CONTROL = `public, max-age=${GOAL_PROGRESS_TTL_MS / 1000}`;

async function sessionUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

function callerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

interface GoalBody {
  name: string;
  target: number;
  window: string;
}

/** Null when the submitted goal is unusable; the caller turns that into a 400. */
function parseGoalBody(body: GoalBody): GoalInput | null {
  const name = body.name.trim();
  if (name === "" || name.length > MAX_GOAL_NAME_LENGTH) return null;
  if (!isGoalWindow(body.window)) return null;
  if (!Number.isFinite(body.target)) return null;
  if (body.target < TARGET_BOUNDS.min || body.target > TARGET_BOUNDS.max) return null;
  return { name, target: toMinorUnits(body.target), window: body.window };
}

const goalBodySchema = t.Object({
  name: t.String({ maxLength: MAX_GOAL_NAME_LENGTH }),
  target: t.Number(),
  window: t.String({ maxLength: 16 }),
});

function view(goal: Goal, raised: number) {
  return {
    id: goal.id,
    name: goal.name,
    target: goal.target,
    window: goal.window,
    raised,
  };
}

/**
 * Credentialed routes for the dashboard's goals section. The public meter
 * reads progress through `publicGoalRoutes` instead, whose CORS policy answers
 * any origin.
 */
export const goalRoutes = new Elysia({ prefix: "/api/goals" })
  .get("/", async ({ request, set }) => {
    const userId = await sessionUserId(request);
    if (!userId) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const site = await getSiteByUserId(userId);
    if (!site) {
      set.status = 404;
      return { error: "no_site" };
    }
    const goals = await listGoalsBySite(site.id);
    const now = Date.now();
    const totals = await raisedByGoal(
      goals.map((goal) => goal.id),
      monthStart(now),
    );
    return {
      currency: site.currency,
      goals: goals.map((goal) => {
        const total = totals.get(goal.id);
        const raised = goal.window === "monthly" ? (total?.month ?? 0) : (total?.lifetime ?? 0);
        return view(goal, raised);
      }),
    };
  })
  .post(
    "/",
    async ({ request, set, body }) => {
      const userId = await sessionUserId(request);
      if (!userId) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const site = await getSiteByUserId(userId);
      if (!site) {
        set.status = 404;
        return { error: "no_site" };
      }
      const input = parseGoalBody(body);
      if (!input) {
        set.status = 400;
        return { error: "invalid_goal" };
      }
      if ((await countActiveGoals(site.id)) >= MAX_GOALS_PER_SITE) {
        set.status = 409;
        return { error: "too_many_goals" };
      }
      const goal = await createGoal({ ...input, siteId: site.id });
      return { goal: view(goal, 0) };
    },
    { body: goalBodySchema },
  )
  .put(
    "/:id",
    async ({ request, set, body, params }) => {
      const userId = await sessionUserId(request);
      if (!userId) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const site = await getSiteByUserId(userId);
      const goal = await getGoalById(params.id);
      if (!site || !goal || goal.siteId !== site.id || goal.archivedAt !== null) {
        set.status = 404;
        return { error: "unknown_goal" };
      }
      const input = parseGoalBody(body);
      if (!input) {
        set.status = 400;
        return { error: "invalid_goal" };
      }
      await updateGoal(goal.id, input);
      const updated: Goal = { ...goal, ...input };
      const raised = await goalRaised(goal.id, windowStart(input.window, Date.now()));
      return { goal: view(updated, raised) };
    },
    { body: goalBodySchema },
  )
  // Archived rather than deleted: a snippet already on a live page keeps
  // working as a plain card, and the donations attributed to it stay intact.
  .delete("/:id", async ({ request, set, params }) => {
    const userId = await sessionUserId(request);
    if (!userId) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const site = await getSiteByUserId(userId);
    const goal = await getGoalById(params.id);
    if (!site || !goal || goal.siteId !== site.id) {
      set.status = 404;
      return { error: "unknown_goal" };
    }
    await archiveGoal(goal.id);
    return { ok: true };
  });

/**
 * Called by the widget from any creator's website, with no session and no
 * credentials. The goal name is deliberately absent: the id sits in public
 * HTML, so an owner can label a goal for themselves without publishing it.
 */
export const publicGoalRoutes = new Elysia({ prefix: "/api/widget/goal" }).get(
  "/:id/progress",
  async ({ params, request, set }) => {
    if (!progressPerIp.take(callerIp(request))) {
      set.status = 429;
      return { error: "rate_limited" };
    }
    const goal = await getGoalById(params.id);
    if (!goal || goal.archivedAt !== null) {
      set.status = 404;
      return { error: "unknown_goal" };
    }
    // The widget charges in the site's currency, so the meter reads in it too.
    const site = await getSiteById(goal.siteId);
    if (!site) {
      set.status = 404;
      return { error: "unknown_goal" };
    }
    set.headers["cache-control"] = PROGRESS_CACHE_CONTROL;
    return {
      raised: await goalRaised(goal.id, windowStart(goal.window, Date.now())),
      target: goal.target,
      currency: site.currency,
    };
  },
  { params: t.Object({ id: t.String({ minLength: 1, maxLength: 64 }) }) },
);
