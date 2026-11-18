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

const articles = defineCollection({
  loader: glob({ pattern: "*/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    pillar: z.enum(["goals", "craft", "audience", "quiet"]),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { legal, articles };
