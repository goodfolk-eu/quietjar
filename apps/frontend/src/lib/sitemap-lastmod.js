import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT_DIR = fileURLToPath(new URL("../../../../", import.meta.url));

/**
 * The newest commit date across a set of source paths, from git. Returns an ISO
 * date string, or null when git cannot produce one (e.g. a shallow clone or no
 * commits for those paths).
 */
function gitLastmod(paths) {
  try {
    const args = ["log", "-1", "--format=%cI", "--", ...paths];
    const out = execFileSync("git", args, { cwd: ROOT_DIR, encoding: "utf8" }).trim();
    return out || null;
  } catch {
    return null;
  }
}

const HOMEPAGE_SOURCES = [
  "apps/frontend/src/pages/index.astro",
  "apps/frontend/src/layouts/Layout.astro",
  "apps/frontend/src/i18n",
  "apps/frontend/src/components",
];

const ARTICLES_DIR = fileURLToPath(new URL("../content/articles/", import.meta.url));

/**
 * Authored dates for articles, read from frontmatter. This runs in the Astro
 * config, before content collections exist, so it parses the files directly.
 */
function articleLastmods() {
  const entries = [];
  if (!existsSync(ARTICLES_DIR)) return entries;
  const files = readdirSync(ARTICLES_DIR, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .flatMap((dir) =>
      readdirSync(`${ARTICLES_DIR}${dir.name}`)
        .filter((name) => name.endsWith(".md"))
        .map((name) => `${dir.name}/${name}`),
    );
  for (const file of files) {
    const frontmatter = readFileSync(`${ARTICLES_DIR}${file}`, "utf8").split("---")[1] ?? "";
    if (/^draft:\s*true\s*$/m.test(frontmatter)) continue;
    const date =
      frontmatter.match(/^updatedDate:\s*["']?([\d-]+)/m)?.[1] ??
      frontmatter.match(/^publishedDate:\s*["']?([\d-]+)/m)?.[1];
    if (!date) continue;
    const [locale, name] = file.replace(/\.md$/, "").split("/");
    entries.push([`/${locale}/articles/${name}/`, date]);
  }
  return entries;
}

/**
 * URL -> lastmod map. The homepage carries a git-derived date, articles their
 * authored date.
 */
export function buildLastmodMap() {
  const homepageDate = gitLastmod(HOMEPAGE_SOURCES);
  const map = new Map(articleLastmods());
  if (homepageDate) {
    map.set("/", homepageDate);
    map.set("/index.html", homepageDate);
  }
  return map;
}

export function authoredLastmod(url, lastmodMap) {
  return lastmodMap.get(url);
}

/**
 * Newest authored date per sitemap chunk name. With no chunks configured this is
 * empty; it is the input for sitemap-index-lastmod so the index reflects real
 * content dates whenever chunking is enabled.
 */
export function buildChunkLastmods(lastmodMap) {
  const chunkLastmods = {};
  for (const date of lastmodMap.values()) {
    const chunk = "marketing";
    const current = chunkLastmods[chunk];
    if (!current || date > current) chunkLastmods[chunk] = date;
  }
  return chunkLastmods;
}
