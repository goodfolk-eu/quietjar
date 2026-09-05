import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { isMissingAccount, retrieveAccountCountry, stripeConfigFromEnv } from "../stripe/client";
import { getConnectionByUserId } from "../stripe/store";
import { currencyForCountry, isSupportedCurrency, SUPPORTED_CURRENCIES } from "./currency";
import { createSite, getSiteByUserId, updateSite } from "./store";
import { normalizeSiteUrl } from "./url";

async function sessionUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

/**
 * The creator's country decides the currency they collect in, so a site created
 * for a connected account starts on the right one instead of a global default.
 */
async function defaultCurrency(userId: string) {
  const config = stripeConfigFromEnv();
  const connection = await getConnectionByUserId(userId);
  if (!config || !connection) return currencyForCountry(undefined);
  try {
    return currencyForCountry(await retrieveAccountCountry(config, connection.accountId));
  } catch (err) {
    if (!isMissingAccount(err)) {
      console.error("[sites] account retrieval failed:", err);
    }
    return currencyForCountry(undefined);
  }
}

export const siteRoutes = new Elysia({ prefix: "/api/sites" })
  .get("/current", async ({ request, set }) => {
    const userId = await sessionUserId(request);
    if (!userId) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    // Created on first read: every signed-in creator needs a key before the
    // dashboard can show them a snippet.
    const existing = await getSiteByUserId(userId);
    const site =
      existing ?? (await createSite({ userId, currency: await defaultCurrency(userId) }));
    return {
      site: {
        publicKey: site.publicKey,
        currency: site.currency,
        siteUrl: site.siteUrl,
        currencies: [...SUPPORTED_CURRENCIES],
      },
    };
  })
  .put(
    "/current",
    async ({ request, set, body }) => {
      const userId = await sessionUserId(request);
      if (!userId) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      if (!isSupportedCurrency(body.currency)) {
        set.status = 400;
        return { error: "unsupported_currency" };
      }
      const siteUrl = normalizeSiteUrl(body.siteUrl);
      if (body.siteUrl !== null && siteUrl === null) {
        set.status = 400;
        return { error: "invalid_site_url" };
      }

      const site = await getSiteByUserId(userId);
      if (!site) {
        set.status = 400;
        return { error: "no_site" };
      }
      await updateSite(userId, { currency: body.currency, siteUrl });
      return { site: { publicKey: site.publicKey, currency: body.currency, siteUrl } };
    },
    {
      body: t.Object({
        currency: t.String({ minLength: 3, maxLength: 3 }),
        siteUrl: t.Nullable(t.String({ maxLength: 2048 })),
      }),
    },
  );
