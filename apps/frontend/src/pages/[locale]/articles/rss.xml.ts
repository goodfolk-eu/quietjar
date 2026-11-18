import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { locales } from "@/i18n/config";
import { dictionary } from "@/i18n/t";
import { articleSlug, getArticles } from "@/lib/articles";
import { localizedPath } from "@/lib/links";

export function getStaticPaths() {
  return locales.map((locale) => ({ params: { locale } }));
}

export async function GET(context: APIContext) {
  const locale = context.params.locale ?? "en";
  const copy = dictionary(locale);
  const articles = await getArticles(locale);
  return rss({
    title: `QuietJar: ${copy.articles.title}`,
    description: copy.articles.description,
    site: context.site ?? "https://quietjar.com",
    items: articles.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedDate,
      link: localizedPath(`/articles/${articleSlug(entry)}/`, locale),
    })),
    customData: `<language>${locale}</language>`,
  });
}
