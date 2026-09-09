import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { earningsSum, listDonations } from "../pay/store";
import { getSiteByUserId } from "../sites/store";

const PAGE_SIZE = 20;
const PERIOD_DAYS = { "30d": 30, "90d": 90 } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

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
    {
      query: t.Object({
        period: t.Union([t.Literal("30d"), t.Literal("90d"), t.Literal("all")]),
      }),
    },
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
