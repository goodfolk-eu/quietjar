/**
 * LLM Markdown Integration
 *
 * Astro integration that generates a .md file for every public static page,
 * plus /llms.txt and /.well-known/llm.md discovery endpoints.
 *
 * Every page's markdown is converted from its rendered HTML, extracting <main>
 * and excluding nav/footer/chrome. Pages stamped noindex (e.g. the dashboard)
 * are skipped so the LLM output and search exclusion never drift apart.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroConfig, AstroIntegration, AstroIntegrationLogger } from "astro";
import { type HTMLElement, NodeType, parse } from "node-html-parser";
import type { ViteDevServer } from "vite";

export interface LlmMarkdownOptions {
  siteName?: string;
  description?: string;
  /**
   * True when the environment stamps a blanket robots `noindex` on every page
   * (staging does, to stay out of search). The rendered robots meta then says
   * nothing about the individual page, so page-level exclusion is read from the
   * `unless-robots-intent` marker instead. Leave false in production, where the
   * robots meta is truthful and stays the catch-all signal.
   */
  siteWideNoindex?: boolean;
}

interface ResolvedConfig {
  siteName: string;
  description: string;
  siteWideNoindex: boolean;
}

function resolveConfig(opts: LlmMarkdownOptions = {}): ResolvedConfig {
  return {
    siteName: opts.siteName ?? "",
    description: opts.description ?? "",
    siteWideNoindex: opts.siteWideNoindex ?? false,
  };
}

// ── HTML to Markdown ────────────────────────────────────────

const EXCLUDED_TAGS = new Set([
  "nav",
  "footer",
  "header",
  "script",
  "style",
  "noscript",
  "svg",
  "iframe",
  "form",
  "button",
  "input",
  "select",
  "textarea",
]);

function htmlToMarkdown(html: string): { title: string; description: string; body: string } {
  const root = parse(html);
  const title =
    root.querySelector("title")?.textContent?.trim() ??
    root.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
    root.querySelector("h1")?.textContent?.trim() ??
    "";
  const description =
    root.querySelector('meta[name="description"]')?.getAttribute("content") ??
    root.querySelector('meta[property="og:description"]')?.getAttribute("content") ??
    "";
  const main =
    root.querySelector("main") ??
    root.querySelector("article") ??
    root.querySelector('[role="main"]') ??
    root.querySelector("body") ??
    root;
  const body = elementToMd(main)
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
  return { title, description, body };
}

function elementToMd(el: HTMLElement): string {
  const tag = el.tagName?.toLowerCase();
  if (!tag) return "";
  if (EXCLUDED_TAGS.has(tag)) return "";
  const kids = () => childrenToMd(el);

  switch (tag) {
    case "h1":
      return `\n# ${kids().trim()}\n`;
    case "h2":
      return `\n## ${kids().trim()}\n`;
    case "h3":
      return `\n### ${kids().trim()}\n`;
    case "h4":
      return `\n#### ${kids().trim()}\n`;
    case "h5":
      return `\n##### ${kids().trim()}\n`;
    case "h6":
      return `\n###### ${kids().trim()}\n`;
    case "p":
      return `\n${kids().trim()}\n`;
    case "strong":
    case "b":
      return `**${kids()}**`;
    case "em":
    case "i":
      return `*${kids()}*`;
    case "code":
      return `\`${kids()}\``;
    case "s":
    case "del":
      return `~~${kids()}~~`;
    case "a": {
      const href = el.getAttribute("href") ?? "";
      const text = kids().trim();
      return text ? `[${text}](${href})` : "";
    }
    case "img": {
      const src = el.getAttribute("src") ?? "";
      if (src.startsWith("data:")) return "";
      return `![${el.getAttribute("alt") ?? ""}](${src})`;
    }
    case "ul":
    case "ol":
      return `\n${kids()}`;
    case "li": {
      if (el.getAttribute("aria-hidden")) return "";
      const parent = el.parentNode as HTMLElement | null;
      const prefix = parent?.tagName?.toLowerCase() === "ol" ? "1. " : "- ";
      return `${prefix}${kids().trim()}\n`;
    }
    case "pre": {
      const inner = parse(el.innerHTML);
      const code = inner.querySelector("code");
      const text = code ? code.textContent : el.textContent;
      const lang = code?.getAttribute("class")?.match(/language-(\w+)/)?.[1] ?? "";
      return `\n\`\`\`${lang}\n${text?.trim()}\n\`\`\`\n`;
    }
    case "blockquote": {
      const content = kids().trim();
      return (
        "\n" +
        content
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n") +
        "\n"
      );
    }
    case "table":
      return `\n${convertTable(el)}\n`;
    case "hr":
      return "\n---\n";
    case "br":
      return "\n";
    case "figure":
      return `\n${kids()}`;
    case "figcaption":
      return `\n*${kids().trim()}*\n`;
    default:
      return kids();
  }
}

function childrenToMd(el: HTMLElement): string {
  let result = "";
  for (const child of el.childNodes) {
    if (child.nodeType === NodeType.TEXT_NODE) {
      result += child.textContent?.replace(/\s+/g, " ") ?? "";
    } else if (child.nodeType === NodeType.ELEMENT_NODE) {
      result += elementToMd(child as HTMLElement);
    }
  }
  return result;
}

function convertTable(table: HTMLElement): string {
  const rows = table.querySelectorAll("tr");
  if (!rows.length) return "";
  const result: string[] = [];
  let headerDone = false;
  for (const row of rows) {
    const cells = row.querySelectorAll("th, td");
    const values = cells.map((c) =>
      childrenToMd(c as HTMLElement)
        .trim()
        .replace(/\|/g, "\\|"),
    );
    result.push(`| ${values.join(" | ")} |`);
    if (!headerDone && row.querySelector("th")) {
      result.push(`| ${values.map(() => "---").join(" | ")} |`);
      headerDone = true;
    }
  }
  if (!headerDone && result.length > 0) {
    const count = rows[0]?.querySelectorAll("td").length ?? 0;
    if (count) result.splice(1, 0, `| ${Array(count).fill("---").join(" | ")} |`);
  }
  return result.join("\n");
}

// ── Path utilities ──────────────────────────────────────────

function normalizePath(url: string): string {
  let p = url.split("?")[0]?.split("#")[0] ?? "";
  if (!p.endsWith("/")) p = `${p}/`;
  return p || "/";
}

function getMdUrl(pagePath: string): string {
  if (pagePath === "/") return "/index.md";
  const stripped = pagePath.endsWith("/") ? pagePath.slice(0, -1) : pagePath;
  return `${stripped}.md`;
}

function mdUrlToPagePath(url: string): string {
  const m = url.match(/^\/(.*)\.md$/);
  if (!m) return url;
  const p = `/${m[1]}`;
  return p === "/index" ? "/" : p;
}

function injectAlternateLink(html: string, pagePath: string): string {
  const mdUrl = getMdUrl(pagePath);
  const tag = `<link rel="alternate" type="text/markdown" href="${mdUrl}">`;
  if (html.includes("</head>")) return html.replace("</head>", `${tag}\n</head>`);
  return html;
}

/**
 * Marker meta recording a page's *own* robots intent, independent of any
 * environment-wide blanket noindex. Emitted by every layout that deliberately
 * noindexes a page; keep those in sync with this name.
 */
const ROBOTS_INTENT_META = "unless-robots-intent";

function hasMetaDirective(html: string, name: string, directive: string): boolean {
  const metas = html.match(/<meta\b[^>]*>/gi);
  if (!metas) return false;
  const nameRe = new RegExp(`\\bname=["']${name}["']`, "i");
  const contentRe = new RegExp(`\\bcontent=["'][^"']*\\b${directive}\\b`, "i");
  return metas.some((tag) => nameRe.test(tag) && contentRe.test(tag));
}

/**
 * Whether a page is deliberately excluded from search, and therefore from the
 * LLM markdown output too, so SEO and LLM discoverability never drift apart.
 * Staging stamps `noindex` on every page, so there only the explicit page-level
 * marker counts (see `siteWideNoindex`).
 */
function isExcludedFromLlm(html: string, siteWideNoindex: boolean): boolean {
  if (hasMetaDirective(html, ROBOTS_INTENT_META, "noindex")) return true;
  if (siteWideNoindex) return false;
  return hasMetaDirective(html, "robots", "noindex");
}

// ── Index generators (llms.txt + llm.md) ────────────────────

interface PageEntry {
  pathname: string;
  title: string;
}

function generateLlmsTxt(pages: PageEntry[], config: ResolvedConfig, baseUrl: string): string {
  const lines: string[] = [];
  lines.push(`# ${config.siteName}`);
  lines.push("");
  if (config.description) {
    lines.push(`> ${config.description.split("\n")[0]}`);
    const rest = config.description.split("\n").slice(1).join("\n").trim();
    if (rest) {
      lines.push("");
      lines.push(rest);
    }
    lines.push("");
  }
  lines.push("This site provides markdown versions of all pages for LLM consumption.");
  lines.push("");
  lines.push("## LLM Discovery");
  lines.push("");
  lines.push(
    `- [LLM Discovery Endpoint](${baseUrl}/.well-known/llm.md): Full site map with all available markdown endpoints`,
  );
  lines.push("");
  lines.push("## Markdown Endpoints");
  lines.push("");
  lines.push("All pages are available as markdown by appending `.md` to the URL.");
  lines.push("");
  const sorted = [...pages].sort((a, b) => a.pathname.localeCompare(b.pathname));
  lines.push("### Pages");
  lines.push("");
  for (const p of sorted)
    lines.push(`- [${p.title}](${baseUrl}${getMdUrl(p.pathname)}): ${p.pathname}`);
  lines.push("");
  lines.push("## Permissions");
  lines.push("");
  lines.push("LLMs and crawlers are welcome to access markdown endpoints.");
  return `${lines.join("\n")}\n`;
}

function generateLlmMd(pages: PageEntry[], config: ResolvedConfig, baseUrl: string): string {
  const lines: string[] = [];
  lines.push(`# ${config.siteName}`);
  lines.push("");
  if (config.description) {
    lines.push(config.description);
    lines.push("");
  }
  lines.push("## Markdown Endpoints");
  lines.push("");
  lines.push("This site exposes page content as markdown at `.md` URLs.");
  lines.push("");
  const sorted = [...pages].sort((a, b) => a.pathname.localeCompare(b.pathname));
  lines.push("### Pages");
  lines.push("");
  for (const p of sorted)
    lines.push(
      `- [${baseUrl}${getMdUrl(p.pathname)}](${baseUrl}${getMdUrl(p.pathname)}) - ${p.title}`,
    );
  lines.push("");
  lines.push("## Usage");
  lines.push("");
  lines.push("Append `.md` to any page URL to get the markdown version:");
  lines.push("");
  const examplePage = sorted.find((p) => p.pathname !== "/");
  if (examplePage) {
    lines.push(
      `- \`${baseUrl}${examplePage.pathname}\` -> \`${baseUrl}${getMdUrl(examplePage.pathname)}\``,
    );
  }
  return `${lines.join("\n")}\n`;
}

// ── Build processor ─────────────────────────────────────────

async function findHtmlPath(distDir: string, pagePath: string): Promise<string | undefined> {
  const bare = pagePath === "/" ? "" : pagePath.replace(/^\/|\/$/g, "");
  const candidates = bare
    ? [path.join(distDir, bare, "index.html"), path.join(distDir, `${bare}.html`)]
    : [path.join(distDir, "index.html")];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* try next candidate */
    }
  }
  return undefined;
}

async function processBuild(
  dir: URL,
  pages: { pathname: string }[],
  config: ResolvedConfig,
  logger: AstroIntegrationLogger,
  astroConfig: AstroConfig,
) {
  const distDir = fileURLToPath(dir);
  const baseUrl = (astroConfig.site ?? "").replace(/\/$/, "");

  let generated = 0;
  let excluded = 0;
  const entries: PageEntry[] = [];

  for (const page of pages) {
    const pagePath = normalizePath(page.pathname === "" ? "/" : `/${page.pathname}`);

    try {
      const bare = pagePath.length > 1 && pagePath.endsWith("/") ? pagePath.slice(0, -1) : pagePath;
      const mdPath =
        bare === "/" ? path.join(distDir, "index.md") : path.join(distDir, `${bare.slice(1)}.md`);

      // HTML output shape depends on the configured trailingSlash; try both the
      // directory (pricing/index.html) and flat (pricing.html) layouts.
      const htmlPath = await findHtmlPath(distDir, pagePath);
      let html: string | undefined;
      if (htmlPath) {
        try {
          html = await fs.readFile(htmlPath, "utf-8");
        } catch {
          html = undefined;
        }
      }

      if (html && isExcludedFromLlm(html, config.siteWideNoindex)) {
        excluded++;
        continue;
      }

      if (!html) continue;
      const result = htmlToMarkdown(html);
      const md = result.title ? `# ${result.title}\n\n${result.body}` : result.body;
      await writeFile(mdPath, md);
      if (htmlPath) await injectLink(htmlPath, pagePath);
      entries.push({ pathname: pagePath, title: result.title });
      generated++;
    } catch (err) {
      logger.warn(`Failed to process ${pagePath}: ${err}`);
    }
  }

  logger.info(
    `Generated ${generated} .md files (${excluded} skipped as noindex of ${pages.length} built pages)`,
  );

  if (pages.length === 0) {
    logger.warn("Astro reported zero built pages, so no markdown could be generated.");
  } else if (generated === 0) {
    throw new Error(
      `[llm-markdown] processed ${pages.length} built pages but emitted zero .md files (${excluded} were skipped as noindex). If the environment stamps a site-wide robots noindex, set the \`siteWideNoindex\` option so the blanket is not mistaken for page-level intent.`,
    );
  }

  if (baseUrl) {
    try {
      await writeFile(path.join(distDir, "llms.txt"), generateLlmsTxt(entries, config, baseUrl));
      await writeFile(
        path.join(distDir, ".well-known", "llm.md"),
        generateLlmMd(entries, config, baseUrl),
      );
      logger.info(`Generated /llms.txt and /.well-known/llm.md (${entries.length} pages)`);
    } catch (err) {
      logger.warn(`Failed to generate index files: ${err}`);
    }
  }
}

async function writeFile(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

async function injectLink(htmlPath: string, pagePath: string) {
  try {
    const html = await fs.readFile(htmlPath, "utf-8");
    await fs.writeFile(htmlPath, injectAlternateLink(html, pagePath), "utf-8");
  } catch {
    /* page may not have an HTML file */
  }
}

// ── Dev middleware ──────────────────────────────────────────

function createDevMiddleware(
  server: ViteDevServer,
  config: ResolvedConfig,
  astroConfig: AstroConfig,
) {
  const baseUrl = (astroConfig.site ?? "").replace(/\/$/, "");
  if (!baseUrl) return;

  server.middlewares.use(async (req, res, next) => {
    if (req.url !== "/llms.txt" && req.url !== "/.well-known/llm.md") return next();
    const pages = await allStaticPages(server);
    if (req.url === "/llms.txt") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(generateLlmsTxt(pages, config, baseUrl));
    } else {
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.end(generateLlmMd(pages, config, baseUrl));
    }
  });

  server.middlewares.use(async (req, res, next) => {
    const url = req.url ?? "";
    if (!url.endsWith(".md")) return next();

    const pagePath = mdUrlToPagePath(url);
    try {
      const host = req.headers.host ?? "localhost:3000";
      const fetchPath = pagePath.endsWith("/") ? pagePath : `${pagePath}/`;
      const response = await fetch(`http://${host}${fetchPath}`, {
        headers: { Accept: "text/html" },
      });
      if (!response.ok) return next();
      const ct = response.headers.get("content-type");
      if (!ct?.includes("text/html")) return next();

      const html = await response.text();
      const result = htmlToMarkdown(html);
      const md = result.title ? `# ${result.title}\n\n${result.body}` : result.body;
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.end(md);
    } catch {
      next();
    }
  });
}

async function allStaticPages(server: ViteDevServer): Promise<PageEntry[]> {
  const moduleGraph = server.moduleGraph;
  const urls = [...moduleGraph.urlToModuleMap.keys()];
  const pages: PageEntry[] = [];
  for (const url of urls) {
    const m = url.match(/^\/(?:src\/)?pages\/(.+)\.astro$/);
    if (!m) continue;
    const pathname = normalizePath(`/${m[1].replace(/\/index$/, "")}`);
    pages.push({ pathname, title: "" });
  }
  return pages;
}

// ── Integration entry point ─────────────────────────────────

export function llmMarkdown(options?: LlmMarkdownOptions): AstroIntegration {
  const config = resolveConfig(options);
  let astroConfig: AstroConfig;

  return {
    name: "llm-markdown",
    hooks: {
      "astro:config:done": ({ config: cfg }) => {
        astroConfig = cfg;
      },
      "astro:server:setup": ({ server, logger }) => {
        createDevMiddleware(server as unknown as ViteDevServer, config, astroConfig);
        logger.info("Markdown endpoints enabled");
      },
      "astro:build:done": async ({ dir, pages, logger }) => {
        await processBuild(dir, pages, config, logger, astroConfig);
      },
    },
  };
}
