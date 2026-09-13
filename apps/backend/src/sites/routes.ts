import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { registerWalletDomains, stripeConfigFromEnv } from "../stripe/client";
import { getConnectionByUserId } from "../stripe/store";
import {
  type Country,
  DEFAULT_CURRENCY,
  isSupportedCountry,
  isSupportedCurrency,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
} from "./currency";
import { createSite, type EntityType, getSiteByUserId, updateSite } from "./store";
import { normalizeSiteUrl } from "./url";

async function sessionUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

const ENTITY_TYPES: EntityType[] = ["individual", "company"];

function isEntityType(value: unknown): value is EntityType {
  return typeof value === "string" && ENTITY_TYPES.includes(value as EntityType);
}

export const siteRoutes = new Elysia({ prefix: "/api/sites" })
  .get("/current", async ({ request, set }) => {
    const userId = await sessionUserId(request);
    if (!userId) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    // Created on first read: every signed-in creator needs a key before the
    // dashboard can show them a snippet. Country is unknown at this point, so
    // the currency starts on the default and follows the country once picked.
    const existing = await getSiteByUserId(userId);
    const site = existing ?? (await createSite({ userId, currency: DEFAULT_CURRENCY }));
    // The country and entity type are baked into the Stripe account at
    // creation and cannot be changed afterwards, so the dashboard needs to know
    // whether to render them as fields or as a summary.
    const connection = await getConnectionByUserId(userId);
    return {
      site: {
        publicKey: site.publicKey,
        currency: site.currency,
        siteUrl: site.siteUrl,
        country: site.country,
        entityType: site.entityType,
        connected: connection !== null,
        currencies: [...SUPPORTED_CURRENCIES],
        countries: [...SUPPORTED_COUNTRIES],
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
      if (body.country !== null && !isSupportedCountry(body.country)) {
        set.status = 400;
        return { error: "unsupported_country" };
      }
      if (body.entityType !== null && !isEntityType(body.entityType)) {
        set.status = 400;
        return { error: "invalid_entity_type" };
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

      // Stripe freezes an account's country and entity type at creation, so
      // once connected these are read-only however the request arrives.
      const connection = await getConnectionByUserId(userId);
      const country = connection
        ? site.country
        : ((body.country?.toUpperCase() ?? null) as Country | null);
      const entityType = connection ? site.entityType : (body.entityType as EntityType | null);

      await updateSite(userId, { currency: body.currency, siteUrl, country, entityType });

      // A creator who moves their widget to another domain would otherwise
      // keep the old domain's wallets and get none on the new one.
      const config = stripeConfigFromEnv();
      if (connection && config) await registerWalletDomains(config, connection.accountId, siteUrl);

      return {
        site: {
          publicKey: site.publicKey,
          currency: body.currency,
          siteUrl,
          country,
          entityType,
          connected: connection !== null,
        },
      };
    },
    {
      body: t.Object({
        currency: t.String({ minLength: 3, maxLength: 3 }),
        siteUrl: t.Nullable(t.String({ maxLength: 2048 })),
        country: t.Nullable(t.String({ maxLength: 2 })),
        entityType: t.Nullable(t.String({ maxLength: 16 })),
      }),
    },
  );
