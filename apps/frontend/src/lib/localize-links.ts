import { fileURLToPath } from "node:url";
import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri";
import { localizedPath } from "./links.ts";

type HastPlugin = NonNullable<SatteriProcessorOptions["hastPlugins"]>[number];

const CONTENT_LOCALE = /\/src\/content\/[^/]+\/([^/]+)\//;

/**
 * Content docs link to other pages locale-neutrally (`/legal/imprint/`). The
 * locale comes from the doc's folder (`src/content/<collection>/<locale>/`),
 * so each translation links within its own locale.
 */
export const localizeLinks: HastPlugin = {
  name: "localize-links",
  element: {
    filter: ["a"],
    visit(node, ctx) {
      const href = node.properties?.href;
      if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return;
      const locale = ctx.fileURL && fileURLToPath(ctx.fileURL).match(CONTENT_LOCALE)?.[1];
      if (locale) ctx.setProperty(node, "href", localizedPath(href, locale));
    },
  },
};
