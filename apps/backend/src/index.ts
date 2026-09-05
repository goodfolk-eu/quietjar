import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { auth } from "./auth";
import { payRoutes } from "./pay/routes";
import { ensureSchema } from "./schema";
import { siteRoutes } from "./sites/routes";
import { stripeRoutes } from "./stripe/routes";

const frontendOrigin = process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";
const dashboardOrigins = [frontendOrigin, "http://localhost:4321"];

/**
 * The dashboard is the only origin allowed to make credentialed calls. The
 * widget's payment routes are public by design and read no cookies, so they
 * answer any origin; everything else stays on the allowlist so a third-party
 * page can never reach a session-backed endpoint.
 */
function isAllowedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin && dashboardOrigins.includes(origin)) return true;
  return new URL(request.url).pathname.startsWith("/api/pay");
}

export const app = new Elysia()
  .use(
    cors({
      origin: isAllowedRequestOrigin,
      credentials: true,
      allowedHeaders: ["Content-Type"],
    }),
  )
  .get("/health", () => ({ ok: true, time: new Date().toISOString() }))
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
  .use(payRoutes);

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
    console.log(`⚡ Quietjar backend listening on http://localhost:${port}`);
    console.log(`🛡  Auth mounted at /api/auth/*`);
  });
}

export type App = typeof app;
