import { defaultLocale, locales } from "@/i18n/config";

/**
 * Prefix a site path with the locale. The default locale's homepage is the
 * one exception: it is served at the root ("/en/" redirects to "/" instead
 * of being a real page). Every other page is prefixed for every locale,
 * including the default one (/en/developers/). Future locales prefix their
 * homepage too (/de/).
 *
 * A "#fragment" is preserved and reattached after the base path is
 * localized, rather than being localized itself — the homepage is a single
 * scrolling page with anchors like /#pricing, and those need to follow the
 * homepage's own locale rule, not be treated as a distinct sub-page.
 */
export function localizedPath(path: string, locale: string = defaultLocale): string {
  if (!locales.includes(locale as (typeof locales)[number])) locale = defaultLocale;

  const hashIndex = path.indexOf("#");
  const base = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : path.slice(hashIndex);
  const clean = base.startsWith("/") ? base : `/${base}`;

  let result: string;
  if (locale !== defaultLocale) {
    result =
      clean === "/" ? `/${locale}/` : `/${locale}${clean.endsWith("/") ? clean : `${clean}/`}`;
  } else if (clean === "/") {
    result = "/";
  } else {
    result = `/${defaultLocale}${clean.endsWith("/") ? clean : `${clean}/`}`;
  }

  return `${result}${hash}`;
}
