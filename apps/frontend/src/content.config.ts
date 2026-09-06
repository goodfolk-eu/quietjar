import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Docs live at src/content/legal/<locale>/<slug>.md so future locales can sit
// alongside en/ without changing the loader or the routes.
const legal = defineCollection({
  loader: glob({ pattern: "*/*.md", base: "./src/content/legal" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    lastUpdated: z.coerce.date(),
    order: z.number().default(0),
    // Shorter label for tight nav slots (rail, footer); the page keeps the full title.
    navTitle: z.string().optional(),
  }),
});

export const collections = { legal };
