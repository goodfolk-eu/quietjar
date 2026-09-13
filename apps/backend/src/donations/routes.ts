import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { earningsByDay, earningsSum, listDonations } from "../pay/store";
import { getSiteByUserId } from "../sites/store";
import { type Bucket, bucketEarnings } from "./series";

const PAGE_SIZE = 20;
const PERIOD_DAYS = { "30d": 30, "90d": 90 } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Keeps every period around ten to thirty bars wide. */
const PERIOD_BUCKET: Record<Period, Bucket> = { "30d": "day", "90d": "week", all: "month" };

type Period = "30d" | "90d" | "all";

const periodSchema = t.Object({
  period: t.Union([t.Literal("30d"), t.Literal("90d"), t.Literal("all")]),
});

async function sessionUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

/**
 * Credentialed routes for the dashboard home: they live outside `/api/pay`,
 * whose CORS policy answers any origin. Everything here requires a session,
 * and supporter details stay private to the site's owner.
 */
export const donationRoutes = new Elysia({ prefix: "/api/donations" })
  .get(
    "/earnings",
    async ({ request, set, query }) => {
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
      const since = query.period === "all" ? 0 : Date.now() - PERIOD_DAYS[query.period] * DAY_MS;
      return { net: await earningsSum(site.id, since), currency: site.currency };
    },
    { query: periodSchema },
  )
  .get(
    "/earnings/series",
    async ({ request, set, query }) => {
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

      const period = query.period;
      const bucket = PERIOD_BUCKET[period];
      const now = Date.now();
      const span = period === "all" ? now : PERIOD_DAYS[period] * DAY_MS;
      const since = now - span;

      const daily = await earningsByDay({ siteId: site.id, since });
      // All time has no fixed start: begin at the first donation, or at today
      // when there are none, so the axis never runs back to 1970.
      const from = period === "all" ? (daily[0]?.day ?? Math.floor(now / DAY_MS)) * DAY_MS : since;

      // The window before this one, for the change shown against the total.
      // All time has nothing before it.
      const earlier =
        period === "all"
          ? []
          : await earningsByDay({ siteId: site.id, since: since - span, until: since });
      const previous = earlier.reduce((total, entry) => total + entry.net, 0);

      return {
        currency: site.currency,
        bucket,
        points: bucketEarnings({ daily, bucket, from, to: now }),
        previous: period === "all" ? null : previous,
      };
    },
    { query: periodSchema },
  )
  .get(
    "/recent",
    async ({ request, set, query }) => {
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
      // One row past the page size answers hasMore without a count query.
      const offset = query.offset ?? 0;
      const donations = await listDonations({
        siteId: site.id,
        limit: PAGE_SIZE + 1,
        offset,
      });
      const hasMore = donations.length > PAGE_SIZE;
      return { donations: donations.slice(0, PAGE_SIZE), hasMore };
    },
    {
      query: t.Object({ offset: t.Optional(t.Numeric({ minimum: 0 })) }),
    },
  );
