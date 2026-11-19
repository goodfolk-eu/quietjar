import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { activeGoalForSite } from "../goals/store";
import { callerIp, RateLimiter } from "../pay/limits";
import { getSiteById, getSiteByUserId, type Site } from "../sites/store";
import { stripeConfigFromEnv, updateBusinessUrl } from "../stripe/client";
import { getConnectionByUserId } from "../stripe/store";
import { handleProblem, normalizeHandle } from "./handle";
import {
  HOSTED_IMAGE_PREFIX,
  hostedImageStoreFromEnv,
  IMAGE_CONTENT_TYPES,
  imageKeyFor,
  imageTypeOfKey,
  MAX_IMAGE_BYTES,
  sniffImageType,
} from "./images";
import {
  defaultDisplayName,
  ensureHostedPage,
  getHostedPageByHandle,
  type HostedPage,
  type ImageKind,
  setHostedPageImage,
  updateHostedPage,
} from "./store";
import { businessUrlFor, hostedPageUrl } from "./url";

export const MAX_DISPLAY_NAME_LENGTH = 60;
export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Short, because a handle that changed hands keeps answering from the edge for
 * this long, and the old handle is meant to stop working.
 */
const PAGE_CACHE_CONTROL = "public, max-age=60";
const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** The page is edge-cached, so this only guards the misses. */
const pagePerIp = new RateLimiter(60, 60_000);

async function sessionUser(
  request: Request,
): Promise<{ id: string; name?: string | null; email: string } | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

/** Relative to the API origin, which the caller already knows and the backend may not. */
function imagePath(key: string | null): string | null {
  return key === null ? null : `/api/hosted/image/${key.slice(HOSTED_IMAGE_PREFIX.length)}`;
}

function view(page: HostedPage) {
  return {
    handle: page.handle,
    url: hostedPageUrl(page.handle),
    displayName: page.displayName,
    title: page.title,
    description: page.description,
    avatarUrl: imagePath(page.avatarKey),
    coverUrl: imagePath(page.coverKey),
    color: page.color,
    goalId: page.goalId,
  };
}

/** Empty strings clear an optional field rather than storing blank text. */
function optionalText(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

async function currentPage(
  request: Request,
): Promise<{ site: Site; page: HostedPage } | { error: "unauthorized" | "no_site" }> {
  const user = await sessionUser(request);
  if (!user) return { error: "unauthorized" };
  const site = await getSiteByUserId(user.id);
  if (!site) return { error: "no_site" };
  return { site, page: await ensureHostedPage(site.id, defaultDisplayName(user)) };
}

const imageKindParams = t.Object({ kind: t.Union([t.Literal("avatar"), t.Literal("cover")]) });

/** Credentialed routes for the dashboard's hosted page section. */
export const hostedRoutes = new Elysia({ prefix: "/api/hosted" })
  .get("/current", async ({ request, set }) => {
    const current = await currentPage(request);
    if ("error" in current) {
      set.status = current.error === "unauthorized" ? 401 : 404;
      return { error: current.error };
    }
    return { page: view(current.page) };
  })
  .get(
    "/handle",
    async ({ request, set, query }) => {
      const current = await currentPage(request);
      if ("error" in current) {
        set.status = current.error === "unauthorized" ? 401 : 404;
        return { error: current.error };
      }
      const handle = normalizeHandle(query.value);
      if (handle === current.page.handle) return { handle, status: "current" as const };
      const problem = handleProblem(handle);
      if (problem) return { handle, status: problem };
      const owner = await getHostedPageByHandle(handle);
      return { handle, status: owner ? ("taken" as const) : ("available" as const) };
    },
    { query: t.Object({ value: t.String({ maxLength: 64 }) }) },
  )
  .put(
    "/current",
    async ({ request, set, body }) => {
      const current = await currentPage(request);
      if ("error" in current) {
        set.status = current.error === "unauthorized" ? 401 : 404;
        return { error: current.error };
      }
      const { site, page } = current;

      const handle = normalizeHandle(body.handle);
      const problem = handleProblem(handle);
      if (problem) {
        set.status = 400;
        return { error: problem === "reserved" ? "reserved_handle" : "invalid_handle" };
      }
      const displayName = body.displayName.trim();
      if (displayName === "") {
        set.status = 400;
        return { error: "invalid_display_name" };
      }
      if (body.color !== null && !HEX_COLOR.test(body.color)) {
        set.status = 400;
        return { error: "invalid_color" };
      }
      // Only the site's own live goals: the id is shown on a public page, and
      // an archived goal no longer reports progress.
      if (body.goalId !== null && !(await activeGoalForSite(body.goalId, site.id))) {
        set.status = 400;
        return { error: "unknown_goal" };
      }

      const input = {
        handle,
        displayName,
        title: optionalText(body.title),
        description: optionalText(body.description),
        color: body.color?.toLowerCase() ?? null,
        goalId: body.goalId,
      };
      if (!(await updateHostedPage(site.id, input))) {
        set.status = 409;
        return { error: "handle_taken" };
      }

      // Without a site of their own the hosted page is the creator's website
      // as far as Stripe knows, so it follows the handle.
      const followsHandle = handle !== page.handle && site.siteUrls.length === 0;
      const businessUrl = followsHandle ? businessUrlFor(null, handle) : null;
      const connection = await getConnectionByUserId(site.userId);
      const config = stripeConfigFromEnv();
      if (businessUrl && connection && config) {
        await updateBusinessUrl(config, connection.accountId, businessUrl);
      }

      return { page: view({ ...page, ...input }) };
    },
    {
      body: t.Object({
        handle: t.String({ maxLength: 64 }),
        displayName: t.String({ maxLength: MAX_DISPLAY_NAME_LENGTH }),
        title: t.Nullable(t.String({ maxLength: MAX_TITLE_LENGTH })),
        description: t.Nullable(t.String({ maxLength: MAX_DESCRIPTION_LENGTH })),
        color: t.Nullable(t.String({ maxLength: 7 })),
        goalId: t.Nullable(t.String({ maxLength: 64 })),
      }),
    },
  )
  .post(
    "/current/image/:kind",
    async ({ request, set, params, body }) => {
      const current = await currentPage(request);
      if ("error" in current) {
        set.status = current.error === "unauthorized" ? 401 : 404;
        return { error: current.error };
      }
      const kind: ImageKind = params.kind;
      if (body.file.size > MAX_IMAGE_BYTES[kind]) {
        set.status = 413;
        return { error: "image_too_large" };
      }
      const bytes = new Uint8Array(await body.file.arrayBuffer());
      const type = sniffImageType(bytes);
      if (!type) {
        set.status = 400;
        return { error: "unsupported_image" };
      }
      const store = await hostedImageStoreFromEnv();
      if (!store) {
        set.status = 503;
        return { error: "storage_unavailable" };
      }
      const key = imageKeyFor(bytes, type);
      if (!(await store.put(key, bytes, type))) {
        set.status = 502;
        return { error: "upload_failed" };
      }
      await setHostedPageImage(current.site.id, kind, key);
      const page = { ...current.page, [kind === "avatar" ? "avatarKey" : "coverKey"]: key };
      return { page: view(page) };
    },
    {
      params: imageKindParams,
      // The route's own per-kind limit is the real check; this only stops the
      // body parser from buffering something absurd first.
      body: t.Object({ file: t.File({ maxSize: MAX_IMAGE_BYTES.cover }) }),
    },
  )
  // The stored object stays: it is content-addressed, so another page may
  // share it, and an orphan costs next to nothing.
  .delete(
    "/current/image/:kind",
    async ({ request, set, params }) => {
      const current = await currentPage(request);
      if ("error" in current) {
        set.status = current.error === "unauthorized" ? 401 : 404;
        return { error: current.error };
      }
      await setHostedPageImage(current.site.id, params.kind, null);
      const page = { ...current.page, [params.kind === "avatar" ? "avatarKey" : "coverKey"]: null };
      return { page: view(page) };
    },
    { params: imageKindParams },
  );

/**
 * Read by the hosted page itself, from the frontend origin, with no session.
 * Like the goal progress, the answer is the same for everyone, so it caches at
 * the edge.
 */
export const publicHostedRoutes = new Elysia({ prefix: "/api/hosted" })
  .get(
    "/page/:handle",
    async ({ params, request, set }) => {
      if (!pagePerIp.take(callerIp(request))) {
        set.headers["cache-control"] = "no-store";
        set.status = 429;
        return { error: "rate_limited" };
      }
      // Public paths skip the no-store default, and the CDN caches a response
      // without its own header for 30 days. A 404 therefore needs one as much
      // as a hit does, or a freshly claimed handle stays missing for a month.
      set.headers["cache-control"] = PAGE_CACHE_CONTROL;
      const page = await getHostedPageByHandle(normalizeHandle(params.handle));
      const site = page ? await getSiteById(page.siteId) : null;
      if (!page || !site) {
        set.status = 404;
        return { error: "unknown_page" };
      }
      const connection = await getConnectionByUserId(site.userId);
      const goal = page.goalId ? await activeGoalForSite(page.goalId, site.id) : null;
      return {
        page: {
          displayName: page.displayName,
          title: page.title,
          description: page.description,
          avatarUrl: imagePath(page.avatarKey),
          coverUrl: imagePath(page.coverKey),
          color: page.color,
          site: site.publicKey,
          currency: site.currency,
          goalId: goal?.id ?? null,
          acceptingPayments: connection?.onboarding?.identity === "done",
        },
      };
    },
    { params: t.Object({ handle: t.String({ minLength: 1, maxLength: 64 }) }) },
  )
  .get(
    "/image/:file",
    async ({ params, set }) => {
      const key = `${HOSTED_IMAGE_PREFIX}${params.file}`;
      const type = imageTypeOfKey(key);
      const store = type ? await hostedImageStoreFromEnv() : null;
      const data = type && store ? await store.get(key) : null;
      if (!type || !data) {
        set.headers["cache-control"] = PAGE_CACHE_CONTROL;
        set.status = 404;
        return { error: "unknown_image" };
      }
      return new Response(data, {
        headers: {
          "content-type": IMAGE_CONTENT_TYPES[type],
          "cache-control": IMAGE_CACHE_CONTROL,
          "x-content-type-options": "nosniff",
        },
      });
    },
    { params: t.Object({ file: t.String({ minLength: 1, maxLength: 128 }) }) },
  );
