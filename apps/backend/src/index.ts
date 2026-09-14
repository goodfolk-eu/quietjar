import { cors } from "@elysiajs/cors";
import { cron, Patterns } from "@elysiajs/cron";
import { Elysia } from "elysia";
import { auth } from "./auth";
import { donationRoutes } from "./donations/routes";
import { feedbackRoutes } from "./feedback/routes";
import { goalRoutes, publicGoalRoutes } from "./goals/routes";
import { sendPendingDonationEmails } from "./notify/donation";
import { payRoutes } from "./pay/routes";
import { ensureSchema } from "./schema";
import { siteRoutes } from "./sites/routes";
import { stripeRoutes } from "./stripe/routes";
import { widgetRoutes } from "./widget/routes";

const frontendOrigin = process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";
const dashboardOrigins = [frontendOrigin, "http://localhost:4321"];

/**
 * Routes that are public by design: they read no cookies, so their answer is
 * the same for every caller and for every origin. The goal CRUD lives under
 * /api/goals and is deliberately not on this list.
 */
function isPublicWidgetPath(path: string): boolean {
  return (
    path.startsWith("/api/pay") ||
    path.startsWith("/api/widget/goal") ||
    path.startsWith("/api/widget/image")
  );
}

/**
 * The dashboard is the only origin allowed to make credentialed calls. The
 * public widget routes answer any origin; everything else stays on the
 * allowlist so a third-party page can never reach a session-backed endpoint.
 */
function isAllowedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin && dashboardOrigins.includes(origin)) return true;
  return isPublicWidgetPath(new URL(request.url).pathname);
}

export const app = new Elysia()
  .use(
    cors({
      origin: isAllowedRequestOrigin,
      credentials: true,
      allowedHeaders: ["Content-Type"],
    }),
  )
  /**
   * The CORS plugin is configured for the dashboard, so it stamps every
   * response as credentialed and varying by Origin, and echoes the caller's
   * own header names back in expose-headers. On the public widget routes that
   * is both wrong -- `allow-credentials: true` next to `allow-origin: *` is a
   * pairing browsers reject -- and expensive: a CDN reads a credentialed,
   * Origin-varying response as belonging to one caller and refuses to cache
   * it, which is why the five minute goal progress cache never took effect at
   * the edge. These routes read no cookies, so they say so plainly and the
   * response becomes byte-identical for everyone.
   */
  .onRequest(({ request, set }) => {
    if (!isPublicWidgetPath(new URL(request.url).pathname)) return;
    set.headers["access-control-allow-origin"] = "*";
    delete set.headers["access-control-allow-credentials"];
    delete set.headers["access-control-expose-headers"];
    delete set.headers.vary;
  })
  // Without a cache-control of its own the CDN applies its 30 day default, and
  // a health check that answers `ok` from the edge long after the container
  // stopped answering at all is worse than no health check.
  .get("/health", ({ set }) => {
    set.headers["cache-control"] = "no-cache";
    return { ok: true, time: new Date().toISOString() };
  })
  // Typed protected endpoint: returns the signed-in user or 401.
  .get("/api/me", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { user: null };
    }
    return { user: session.user };
  })
  // Mount BetterAuth at the standard /api/auth/* path.
  .all("/api/auth/*", ({ request }) => auth.handler(request))
  .use(stripeRoutes)
  .use(siteRoutes)
  .use(donationRoutes)
  .use(payRoutes)
  .use(goalRoutes)
  .use(publicGoalRoutes)
  .use(widgetRoutes)
  .use(feedbackRoutes)
  // Donation emails are sent here rather than from the payment webhook, so a
  // mail failure can never touch a payment. `protect` drops a tick whose
  // predecessor is still running instead of letting two sweeps overlap.
  .use(
    cron({
      name: "donationEmails",
      pattern: Patterns.EVERY_5_MINUTES,
      protect: true,
      run: () => void sendPendingDonationEmails(),
    }),
  );

const port = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  // auth.$context is a Promise<globalContext>; resolve it to reach the
  // BetterAuth instance, then run schema migrations against BunnyDB.
  type AuthLike = { $context: Promise<{ runMigrations?: () => Promise<void> }> };
  const ctx = await (auth as unknown as AuthLike).$context;
  if (typeof ctx?.runMigrations === "function") {
    try {
      await ctx.runMigrations();
      console.log("🧬 BetterAuth schema is up to date");
    } catch (err) {
      console.error("⚠️  BetterAuth migration failed:", (err as Error).message);
    }
  }

  try {
    await ensureSchema();
    console.log("🧬 App schema is up to date");
  } catch (err) {
    console.error("⚠️  App schema migration failed:", (err as Error).message);
  }
}

if (import.meta.main) {
  await bootstrap();
  app.listen(port, () => {
    console.log(`⚡ QuietJar backend listening on http://localhost:${port}`);
    console.log(`🛡  Auth mounted at /api/auth/*`);
  });
}

export type App = typeof app;
