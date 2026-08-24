import { execFileSync } from "node:child_process";
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

/**
 * URL -> lastmod map. Currently the single homepage carries a git-derived date;
 * future content collections can add their authored dates here.
 */
export function buildLastmodMap() {
  const homepageDate = gitLastmod(HOMEPAGE_SOURCES);
  const map = new Map();
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
