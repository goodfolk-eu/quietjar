/**
 * Sitemap index lastmod Integration
 *
 * @astrojs/sitemap stamps every <sitemap> entry in sitemap-index.xml with a
 * single shared `lastmod` (the build timestamp), so the index claims that all
 * sub-sitemaps changed at the same instant. This integration runs after the
 * sitemap integration's `astro:build:done` and rewrites each entry's <lastmod>
 * to the newest authored date in that chunk, so the index reflects when each
 * section's content actually last changed.
 *
 * Chunk names are read straight out of the generated filenames
 * (sitemap-<chunk>-<n>.xml) and looked up in `chunkLastmods` (see
 * buildChunkLastmods in sitemap-lastmod.js). Entries with no authored date keep
 * the build-timestamp fallback the integration already wrote.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export function sitemapIndexLastmod({ chunkLastmods = {} } = {}) {
  return {
    name: "sitemap-index-lastmod",
    hooks: {
      "astro:build:done": ({ dir, logger }) => {
        const indexPath = fileURLToPath(new URL("./sitemap-index.xml", dir));
        let xml;
        try {
          xml = fs.readFileSync(indexPath, "utf8");
        } catch {
          return; // no sitemap index emitted in this build
        }

        let rewritten = 0;
        xml = xml.replace(
          /(<sitemap><loc>[^<]*\/sitemap-([a-z]+)-\d+\.xml<\/loc><lastmod>)[^<]*(<\/lastmod><\/sitemap>)/g,
          (match, head, chunk, tail) => {
            const date = chunkLastmods[chunk];
            if (!date) return match;
            rewritten += 1;
            return `${head}${date}T00:00:00.000Z${tail}`;
          },
        );

        fs.writeFileSync(indexPath, xml);
        logger.info(
          `stamped real lastmod on ${rewritten} sitemap-index entr${rewritten === 1 ? "y" : "ies"}`,
        );
      },
    },
  };
}
