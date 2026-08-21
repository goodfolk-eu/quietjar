import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./auth";

const frontendOrigin =
  process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";

export const app = new Elysia()
  .use(
    cors({
      origin: [frontendOrigin, "http://localhost:4321"],
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
  .all("/api/auth/*", ({ request }) => auth.handler(request));

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
}

if (import.meta.main) {
  await bootstrap();
  app.listen(port, () => {
    console.log(`⚡ Quietjar backend listening on http://localhost:${port}`);
    console.log(`🛡  Auth mounted at /api/auth/*`);
  });
}

export type App = typeof app;