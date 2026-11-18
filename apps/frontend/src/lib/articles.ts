import { type CollectionEntry, getCollection } from "astro:content";

export type Article = CollectionEntry<"articles">;

export function articleSlug(entry: Article): string {
  return entry.id.split("/")[1];
}

export function lastModified(entry: Article): Date {
  return entry.data.updatedDate ?? entry.data.publishedDate;
}

/** Published articles for one locale, newest first. Drafts only show in dev. */
export async function getArticles(locale: string): Promise<Article[]> {
  const entries = await getCollection(
    "articles",
    ({ id, data }) => id.startsWith(`${locale}/`) && (import.meta.env.DEV || !data.draft),
  );
  return entries.sort((a, b) => b.data.publishedDate.valueOf() - a.data.publishedDate.valueOf());
}

export function formatArticleDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}
