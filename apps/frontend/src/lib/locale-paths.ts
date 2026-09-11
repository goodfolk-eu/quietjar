import { locales } from "@/i18n/config";

/**
 * Shared `getStaticPaths` for a page under `src/pages/[locale]/...`. Every
 * page here is structurally identical across locales - only the i18n
 * dictionary differs - so one file drives every locale instead of a
 * duplicated file per locale. Re-export this from a page's frontmatter:
 *
 *   export { getStaticPaths } from "@/lib/locale-paths";
 *
 * A route backed by a content collection whose entries vary per locale (e.g.
 * legal's [slug]) writes its own getStaticPaths instead, deriving params from
 * the collection itself rather than from this fixed one-param list.
 */
export function getStaticPaths() {
  return locales.map((locale) => ({ params: { locale } }));
}
