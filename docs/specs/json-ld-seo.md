# Implement schema.org JSON-LD structured data

> Source: pasted spec from Sander, 2026-09-15. Stored here for reference during implementation
> (see linked issue "json-ld for seo"). This is architecture guidance, not content - substitute
> QuietJar's own entity names, URLs, plan names and locales throughout.

Add structured data to this site the way a working Astro marketing site does it: **one JSON-LD
graph per page, assembled in the root layout, fed by per-locale data files, with page-type nodes
contributed by individual routes.** The rules below are the architecture, not the content, so
substitute your own entity names, URLs, plan names and locales throughout.

## 1. One graph, emitted once, from the root layout

- **All** structured data is emitted by the single root layout that owns `<head>`, never by a page
  or a component. Each page therefore has exactly one `application/ld+json` block, with one
  `@context: "https://schema.org"` and one `@graph` array. Render it with `astro-seo-schema`'s
  `<Schema item={schema} />` (or the framework equivalent), once, at the end of `<head>`.
- The layout builds that graph in three moves: load the base nodes from per-locale JSON data
  files, shallow-merge each with an optional same-named page prop, then append conditional and
  page-type nodes.
- The layout props that make this work: `title`, `description`, `canonical`, `noindex`, the three
  base-node overrides (`webPage`, `organization`, `webApplication`), `dateModified`, `faq`,
  `breadcrumb`, `additionalSchema`, plus `image` for the social card.
- Every wrapper layout (marketing, docs, article shells) must **forward** `faq`, `breadcrumb`,
  `dateModified`, `image` and `additionalSchema` down to the root layout. A layout that silently
  drops them is the usual reason a deep route's markup never appears.
- Run `title` and `description` through one shared HTML-stripping helper before they reach either
  the meta tags or the graph, and drop null/undefined top-level keys just before emitting.
- **Author repeating content in schema.org shape and render the components from it.** FAQ entries,
  team members and customer reviews are all stored as schema.org objects (`Question[]`, `Person[]`,
  `Review[]`) and the visible components read those objects directly - the FAQ accordion renders
  `question.name` and `question.acceptedAnswer.text`, the team grid renders the member objects.
  There is no display shape sitting next to a markup shape, so the two cannot disagree. Whether a
  given list is also emitted into the graph is a separate decision, made per page (§7).
- Keep the data files one-node-per-file and per-locale: `src/i18n/data/<locale>/webPage.json`,
  `organization.json`, `webApplication.json`.

## 2. The base graph: three nodes on every page

- **WebPage**: the per-locale default lives in `webPage.json` - `@type`, the site-level fallback
  name and description, `publisher` as a bare Organization `@id` reference, `about` as a bare
  WebApplication `@id` reference, and `image` (an absolute logo URL). The layout overwrites at
  render time: `name` and `description` from the page's meta, `url` and `@id` from the canonical
  URL, `inLanguage` from the locale, `dateModified` from the page's own last-updated date. A page
  may replace the node type (e.g. `AboutPage` for contact/about pages) via the `webPage` prop.
- **Organization**: one stable `@id` (a URL you control and will never change), name,
  alternateName, founder, description, url, logo, PostalAddress, ContactPoint[] (one per public
  channel), sameAs[] (social profiles). This is the single Organization node; everything else
  references it by `@id` only.
- **WebApplication** (or Product/SoftwareApplication if that fits the offering better): stable
  `@id`, name, url, description, applicationCategory, operatingSystem, browserRequirements,
  featureList[], offers[] (one Offer per plan with `price`, `priceCurrency`, `url`,
  `description`), aggregateRating (only if backed by a real, linkable review source),
  softwareHelp (CreativeWork pointing at the help centre), license (terms URL).

## 3. Relevance guard for commercial markup

Strip `offers` and `aggregateRating` from the WebApplication node on every page except the
homepage and pricing pages. Rating and price markup on pages that do not visibly show a rating or
price is off-topic and risks a manual action. Implement this as a pathname test in the root
layout, not per page.

## 4. Conditional nodes the layout adds itself

### FAQPage

FAQ is the emitted case of the schema-shaped authoring convention above: the accordion renders
straight from the `Question[]`, so the markup and the visible page are literally one array. It is
also the node most likely to earn a manual action if those ever drift. Treat these as hard rules.

- **Two authoring surfaces, one internal shape.** FAQs reach a page by two routes, and both end as
  the same `Question[]`:
  1. **Page JSON** for marketing pages, authored as literal schema.org objects
     (`faq: [{ "@type":"Question", name, acceptedAnswer: { "@type":"Answer", text } }]`), so there
     is no mapping layer at all.
  2. **Collection frontmatter** for markdown content (help articles, blog posts, cookbook entries,
     integration pages), authored in the shape a writer will actually maintain -
     `faqs: [{ question, answer }]`, validated by the collection schema and translated with the
     rest of the entry copy - and mapped to `Question[]` in the route.
- **Map once, per route, and feed both consumers from that one array.** The mapped `Question[]`
  goes to the layout (for the graph) and to the visible FAQ component (for the accordion). Do not
  also hand the component the raw frontmatter array: a component that accepts both a mapped list
  and a raw list, and concatenates them, will render every question twice while the graph still
  shows the correct count - a duplication that is invisible in the JSON-LD and obvious to a
  reader. One mapping point, one array, two consumers.
- **A markdown collection can silently emit an invisible FAQ.** Marketing shells render the
  accordion themselves, so passing `faq` is enough there. Docs/article shells typically do not -
  the route has to render the FAQ component in the body itself. A collection route that maps
  frontmatter `faqs`, passes it to the layout, and forgets that render emits FAQPage markup for
  questions that appear nowhere on the page, which is precisely the violation. If a collection is
  wired for `faqs`, wire its visible render in the same commit, or do not pass `faq` to the layout
  at all.
- **Visibility is the rule the rest of this serves.** Google requires every question in FAQPage
  markup to be visible on the page; an expandable `<details>`/`<summary>` accordion satisfies
  that. A question in the graph but not on the page is the violation to design out.
- **Nest it, do not add a top-level node.** When the array is non-empty, set
  `WebPage.hasPart = { "@type":"FAQPage", "mainEntity": [...] }`. It belongs to the page node that
  already carries the canonical `@id`, so there is nothing to give a second identity to.
- **Strip HTML in the layout, not in the source.** Answers are authored with inline markup and
  rendered as HTML, so the graph copy gets tags removed and whitespace collapsed on the way in
  (`text.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim()`). Strip for the graph only; the
  visible answer keeps its markup. If a surface authors answers as markdown, parse the inline
  markup at that surface's single mapping point, not inside the shared FAQ component: surfaces
  differ (markdown in frontmatter, HTML in page JSON), and a component that parses everything will
  re-parse the HTML-authored ones. The layout's tag-stripping then keeps the graph plain either
  way.
- **The FAQ component must emit no JSON-LD of its own.** It renders HTML and nothing else. A
  component that emits its own `<Schema>` block is how a page ends up with two
  `application/ld+json` blocks and a duplicate FAQPage - and because it only fires on one branch
  of one prop shape, it is invisible until a validator catches it. All structured data comes from
  the root layout.
- **One FAQPage per page.** If a page shows more than one FAQ block, merge them into a single
  array before it reaches the layout.
- **Wrapper layouts must forward `faq`.** Marketing and docs shells both sit between the route and
  the root layout; either one dropping the prop silently removes the markup.

### BreadcrumbList

Derive the trail from the same data the visual breadcrumb component renders, so the two cannot
drift. 1-indexed ListItems, absolute `item` URLs, and no `item` on the last (current) entry. Docs
layouts compute their trail from the navigation tree and pass it as the `breadcrumb` override.

## 5. Page-type nodes via `additionalSchema`

These are added NEXT TO the WebPage node, never in place of it:

- Blog post route: `BlogPosting` (headline, description, image, datePublished, dateModified,
  inLanguage, mainEntityOfPage = canonical URL, author and publisher = Organization reference).
- Help / cookbook / integration article routes: `TechArticle`, same fields.
- Release-notes route: `Article`, same fields.
- Pricing overview: one `Product` per plan with a nested `Offer`; Fixed/Flex plan pages: the
  single matching `Product`. Build these from the same plan data the visible cards render from.
- Do not use `HowTo` unless the page has real numbered steps with per-step content.

## 6. Shared references module

Create `src/lib/schema-refs.ts` exporting:

- `ORGANIZATION_REF = { "@type":"Organization", "@id": <the Organization @id> }` used by every
  author/publisher field, so the id is defined in one place.
- `canonicalUrlFor(site, origin, pathname)` returning the absolute canonical for this build.
- `PLAN_PRICES` as raw numeric strings plus currency per plan key. Never parse the localized
  display price (comma vs point decimal separators differ per locale). If prices also appear in
  the WebApplication offers, have that data file be generated from or validated against this
  module rather than hand-copied; there must be exactly one source for each price.

## 7. Schema-shaped content that is not always emitted

The convention from §1 applies to every repeating content list, but authoring something in
schema.org shape does not entitle it to a place in the graph. Emission is decided per page, by one
test: **is this content visible on this page?**

- **FAQ (`Question[]`, in the page JSON)** - rendered by the accordion and emitted as
  `WebPage.hasPart` on the same page. Always both, never one without the other.
- **Team members (`member.json`, `Person[]`)** - rendered as the team grid on every page that
  shows people, but emitted only by the team page itself, which passes `{ member }` as its
  `organization` override so the array is merged into the Organization node. No other page adds
  people to the Organization.
- **Customer reviews (`review.json`, `Review[]`)** - loaded and rendered as quotes and case-study
  cards on the customers page and elsewhere, and emitted nowhere. They are schema-shaped purely so
  the content has one canonical structure and a stable `@id` per review to cross-reference from
  other pages. Never emit a Review node on a page that does not show that review, and never roll
  these up into an `aggregateRating` you did not source from a real, linkable review platform.

The payoff of the convention is that promoting one of these lists into the graph later is a
one-line change at the route, not a reshaping of the content.

## 8. Localisation and validation rules

- All node text goes through the i18n data tree; no hardcoded user-facing strings in layouts or
  routes.
- Every locale's data files must have the same top-level keys; add a parity check to the existing
  i18n validation script.
- Validate against the BUILT output, not the dev server: for a sample of each page type, assert
  exactly one `application/ld+json` block, the expected node types present, and no HTML entities
  leaking into the JSON.
