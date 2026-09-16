import { locales } from "@/i18n/config";
import { QUIETJAR_RATE } from "@/lib/fees";

/**
 * Bare @id references, for any node that needs to point at the Organization
 * or WebApplication node without repeating its fields. The @id itself is
 * defined once, on the full node in src/i18n/data/<locale>/organization.json
 * and webApplication.json.
 */
export const ORGANIZATION_ID = "https://quietjar.com/#organization";
export const WEBAPPLICATION_ID = "https://quietjar.com/#webapplication";

export const ORGANIZATION_REF = { "@type": "Organization", "@id": ORGANIZATION_ID } as const;
export const WEBAPPLICATION_REF = { "@type": "WebApplication", "@id": WEBAPPLICATION_ID } as const;

export function canonicalUrlFor(site: URL, pathname: string): URL {
  return new URL(pathname, site);
}

/**
 * Structured data must never carry markup: text is authored with inline HTML
 * for on-page rendering, but the graph copy needs tags removed and
 * whitespace collapsed on the way in. Used for title/description and FAQ
 * answer text before either reaches the graph.
 */
export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * QuietJar has no tiered plans - one flat take-rate applies to every
 * donation. This is the only place that rate is turned into schema.org
 * commercial markup, sourced from fees.ts so the number can't drift from
 * what the pricing page actually charges.
 */
export function buildFlatRateOffer() {
  return {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: `Free to install. QuietJar takes ${QUIETJAR_RATE * 100}% of donations received, no fixed fee.`,
  };
}

const LOCALE_PREFIX = `(?:${locales.join("|")})\\/`;
const COMMERCIAL_PATHNAME = new RegExp(`^/(?:${LOCALE_PREFIX})?(?:pricing/)?$`);

/**
 * Commercial markup (offers) only belongs on pages that actually show
 * pricing - the homepage and the pricing page - showing it elsewhere is
 * off-topic and risks a manual action.
 */
export function pathnameShowsCommercialTerms(pathname: string): boolean {
  return COMMERCIAL_PATHNAME.test(pathname);
}
