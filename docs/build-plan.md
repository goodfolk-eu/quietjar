# QuietJar — brand redesign implementation plan (Astro)

A complete brief for applying the new QuietJar identity to the existing Astro site.
Reference design: `Website.dc.html` in this project (rendered marketing page, all values final).

---

## 0. Scope

Restyle the existing marketing page (`/`) to the new identity. **No copy rewrites, no new
sections, no route changes.** Same content blocks in the same order:

nav → hero → why it works (comparison) → payment methods bar → "knows when to step back" →
craft (3 features) → pricing → FAQ → closing CTA → footer

What changes: type, colour, spacing, corner radius, the logo, and two structural swaps
(see §6 Hero and §7 Comparison).

---

## 1. Assets to add

Copy these into `public/brand/`. They are final — do not regenerate or trace them.

| File | Use |
| --- | --- |
| `mark-blue.svg` | Piglet, Reflex Blue. Nav, light grounds |
| `mark-white.svg` | Piglet, white. Blue/dark grounds, footer |
| `mark-green.svg` | Piglet, green. Rare — avoid on marketing pages |
| `lockup-blue-green.svg` | Piglet + wordmark, light ground. Default lockup |
| `lockup-white.svg` | Piglet + wordmark, dark ground. Footer, blue panels |
| `lockup-large.svg` | Same lockup, larger wordmark ratio. Hero/OG use |
| `badge-blue.svg` / `badge-green.svg` | Circular badge. Favicon source, avatars |
| `field-green.svg` | Green field + centred lockup. Social/OG |
| `wordmark-blue.svg` / `wordmark-green.svg` / `wordmark-white.svg` | Wordmark alone |

All wordmark text is **converted to outlines** (real Gabarito 700 paths, tracking baked in).
No webfont dependency inside the SVGs. Knockouts (ear, eye) are true transparent holes via
`<mask>`, so every file drops onto any background.

Also add, from `linkedin/`:

- `banner-blue-lockup.png` — 2256×382, LinkedIn company cover
- `logo-green-600.png` / `logo-blue-600.png` / `logo-paper-600.png` — 600×600, LinkedIn company logo (upload at 300×300)

### Favicon / manifest

Generate from `badge-blue.svg`:

```
public/favicon.svg          ← badge-blue.svg verbatim
public/favicon-32.png       ← 32×32
public/apple-touch-icon.png ← 180×180, badge-blue on #003399 (no transparency)
public/og-image.png         ← 1200×630, field-green.svg composition
```

### Inline SVG, not `<img>`

The nav and footer marks must be **inline SVG** so they inherit no colour surprises and add
no request. Build one Astro component that emits the mark with a unique mask id:

```astro
---
// src/components/Mark.astro
interface Props { fill?: string; width?: number; class?: string }
const { fill = '#003399', width = 46, class: cls = '' } = Astro.props;
const id = 'qj-' + Math.random().toString(36).slice(2, 8);
const height = Math.round((width * 180) / 240);
---
<svg width={width} height={height} viewBox="0 0 240 180" class={cls} role="img" aria-label="QuietJar">
  <defs>
    <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="180">
      <clipPath id={`${id}c`}>
        <rect x="56.9" y="44.4" width="126.3" height="99.2" rx="47.6" />
      </clipPath>
      <g fill="#fff" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M68.5 64.2 L45.3 56.9 L70.6 81.1 Z" />
        <path d="M78.4 121.2 L99.5 121.2 L87.5 157.1 L77.2 157.1 Z" />
        <path d="M140.5 121.2 L161.6 121.2 L162.8 157.1 L152.5 157.1 Z" />
        <path d="M193.3 80.6 L174.3 79 L163.5 131.5 L193.3 104.6 Z" />
        <path d="M140.7 33.3 L194.2 55.8 L138.1 73.2 Z" />
        <rect x="59.9" y="47.4" width="120.3" height="93.2" rx="44.6" />
        <path d="M116.5 44.9 L147.6 17.8 L138.9 91 Z" />
      </g>
      <g clip-path={`url(#${id}c)`}>
        <path d="M116.5 44.9 L147.6 17.8 L138.9 91 Z" fill="#000" stroke="#000" stroke-width="6" stroke-linejoin="round" />
        <path d="M113.6 44.3 L127.1 35.7 L122.6 57.5 Z" fill="#000" />
      </g>
      <circle cx="160.5" cy="80.5" r="7.2" fill="#000" />
    </mask>
  </defs>
  <rect x="0" y="0" width="240" height="180" fill={fill} mask={`url(#${id})`} />
</svg>
```

Do not alter any path coordinate. The geometry is locked.

---

## 2. Type

Three families, loaded once in the base layout.

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gabarito:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" />
```

Prefer self-hosting via `@fontsource/gabarito`, `@fontsource/ibm-plex-sans`,
`@fontsource-variable/jetbrains-mono` — same weights, one less third-party origin (matters
for the EU/sovereignty positioning).

| Role | Family | Weight | Notes |
| --- | --- | --- | --- |
| Headings, wordmark, figures | **Gabarito** | 700 | `letter-spacing: -.03em` at display sizes, `-.02em` at 19–22px |
| Body, UI, nav | **IBM Plex Sans** | 400 / 500 / 600 | |
| Code, labels, step numbers, payment chips | **JetBrains Mono** | 400 | uppercase eyebrow labels get `letter-spacing: .08em` |

Never set body copy in Gabarito, never set a heading in Plex.

### Scale (desktop)

| Token | Size / line-height / tracking | Used for |
| --- | --- | --- |
| `display` | 62 / 1.01 / −.032em | Hero h1 |
| `h2` | 44 / 1.05 / −.03em | Section heads |
| `h2-cta` | 50 / 1.03 / −.032em | Closing CTA |
| `h3` | 21–22 / 1.3 / −.02em | Card titles, comparison column titles |
| `faq-q` | 19 / 1.3 / −.02em | FAQ question |
| `lead` | 17.5 / 1.62 | Hero paragraph |
| `body` | 17 / 1.62 | Section paragraphs |
| `body-sm` | 15–15.5 / 1.5–1.62 | Cards, lists, FAQ answers |
| `ui` | 14.5 / 1 / 500–600 | Nav, buttons |
| `meta` | 13.5 / 1.5 | Fine print, footer |
| `mono-label` | 11.5 / 1 / .08em uppercase | Eyebrow labels, step numbers |
| `mono-code` | 12.5–13 / 1.9 | Embed snippet |

---

## 3. Colour

```css
:root {
  --qj-blue:        #003399;  /* Pantone Reflex Blue — brand, mark, deep panels */
  --qj-blue-lift:   #0B49B4;  /* oversized mark on blue, watermarks only */
  --qj-blue-press:  #00256E;  /* pressed / hover on blue text links */
  --qj-green:       #00B366;  /* all actions, links, accents */
  --qj-green-press: #009454;  /* button hover */
  --qj-tint:        #7FD9B3;  /* "quiet" in the wordmark, labels on blue */
  --qj-eu-yellow:   #FFCC00;  /* CTA star ring only — §8a. Never anywhere else */

  --qj-ink:         #14181C;  /* body text, footer ground */
  --qj-ink-2:       #4A5259;  /* secondary text */
  --qj-ink-3:       #6B747B;  /* fine print, mono labels */
  --qj-ink-4:       #A8AFB4;  /* step numbers on light */

  --qj-surface:     #F4F6F7;  /* alternating section ground, code block */
  --qj-line:        #E6E9EB;  /* card + section borders */
  --qj-line-2:      #EEF1F2;  /* inner hairlines, skeleton bars */
  --qj-line-3:      #DDE2E5;  /* FAQ row rules on --qj-surface */
  --qj-radius:      2px;
}
```

Rules:

- **Green is the only action colour.** Every primary button, link hover, and accent number.
- **Blue is structure and brand**: the mark, the pricing panel, the closing CTA, the wordmark's `jar`.
- The tint `#7FD9B3` appears in exactly two places: the wordmark's `quiet`, and small labels on blue grounds.
- Radius is `2px` everywhere. No pills, no `12px` cards, no gradients, no shadows on flat panels — `shadow-md` only on the hero browser mock.
- Section rhythm alternates white → `--qj-surface` → white, each surface band bounded top and bottom by `1px solid --qj-line`.

If the site is on Tailwind, put these in `theme.extend.colors.qj.*` and set
`borderRadius.DEFAULT: '2px'`; do not leave stock Tailwind blues/greens reachable.

---

## 4. Layout

- Content container: `max-width: 1200px; margin: 0 auto; padding-inline: 40px`.
- Section padding: `96px` block on white bands, `88px / 96px` on surface bands.
- Two-column sections use `grid-template-columns: minmax(0,1fr) minmax(0,Xfr)` with `gap: 72px` — ratios differ per section (hero `1.05/.95`, step-back `1/.85`, pricing `1/.72`, FAQ `.62/1`).
- Card grids: `gap: 24px`.
- **Always flex/grid + `gap`.** No margin-based spacing between sibling groups.
- `text-wrap: balance` on the hero h1 and CTA h2; `text-wrap: pretty` on every paragraph.

Breakpoints (not in the reference, implement fresh):

- `≤1080px` — two-column grids collapse to one, `gap: 40px`; hero mock moves below the copy.
- `≤880px` — 3-up feature grid → 1 column; section padding → `64px`; `display` → 44px, `h2` → 34px.
- `≤640px` — container padding → 20px; nav collapses to mark + "Add to your site" with a sheet menu; payment chips wrap.

---

## 5. Nav

Sticky, `height: 72px`, `background: rgba(255,255,255,.94)` + `backdrop-filter: blur(8px)`,
`border-bottom: 1px solid var(--qj-line)`.

Left: `<Mark width={46} fill="var(--qj-blue)" />` + wordmark set live in Gabarito 700 / 32px /
`-.025em`, `quiet` in `--qj-tint`, `jar` in `--qj-green`, `margin-bottom: 3px` to sit the
baseline against the mark. Gap between mark and wordmark: `2px`.

Right: text links (`--qj-ink`, hover `--qj-blue`), "Log in" in `--qj-blue`, and the green
`Add to your site` button (`padding: 10px 18px`).

**Lockup ratio is locked** — wordmark size = mark width × 0.405, wordmark left offset =
mark width × 1.024. Do not eyeball it. Any other lockup size derives from those two numbers.

---

## 6. Hero — one structural change

The live site describes the widget in prose. Replace that with a **browser mock** showing
the button in place:

- Window chrome: `--qj-surface` bar, three `9px` grey dots, mono URL `your-site.com/writing`.
- Body: skeleton text bars (`height: 9px; background: var(--qj-line-2)`, widths 62/100/88/94%).
- The QuietJar card inline in the flow: `1px solid --qj-line`, `18px 20px`, "Enjoying this?" in
  Gabarito 700 17px + sub-line 13px `--qj-ink-3`, green `Support · €5` button on the right.
- More skeleton bars below (100/74%).
- Footer strip: the embed snippet in JetBrains Mono on `--qj-surface`, `border-top: 1px solid --qj-line`, with a green `✓ live · matches your design` line.

The whole mock: `1px solid --qj-line` + `shadow-md`. This is the only elevated element on the page.

Copy stays as written on the live site (eyebrow, h1, paragraph, two buttons, fine print).

---

## 7. Comparison — second structural change

The live site uses arrow diagrams (`↓`, `↓ ↓`). Replace with **two numbered columns**, side by side:

- Left ("The old way"): white card, `1px solid --qj-line`. Mono eyebrow in `--qj-ink-3`.
  Five steps, mono `01–05` in `--qj-ink-4`, text `--qj-ink-2`; final step `--qj-ink` at 500.
- Right ("With QuietJar"): white card, **`1.5px solid var(--qj-green)`**. Mono eyebrow in
  `--qj-green`. Three steps, numbers in `--qj-tint`. Closing line separated by
  `border-top: 1px solid --qj-line-2; padding-top: 18px`.

Below, full width: the payment-methods bar — sentence left, four mono chips right
(`1px solid --qj-line`, `7px 12px`): Apple Pay / Visa / Mastercard / Amex.

Keep the `↓` arrows out of the DOM entirely; they were a text workaround, and the numbers
carry the sequence.

---

## 8. Remaining sections

**Step-back section** (white). Two columns. Left: eyebrow, h2, body, then the pull line in
Gabarito 700 21px `--qj-blue`, `max-width: 34ch`. Right: bordered panel, mono label, then a
4-row list — each row `padding: 14px 0`, `border-bottom: 1px solid --qj-line-2` (last row
none), leading `8px` square in green / tint / `#D9DEE1` / green.

**Craft** (surface band). Eyebrow, h2, body at `max-width: 56ch`, then a 3-up grid of white
bordered cards: mono `01/02/03` in green, Gabarito 700 21px title, 15px body.

**Pricing** (white). Two columns. Right column is a solid `--qj-blue` panel, `40px` padding:
mono `SIMPLE` label in `--qj-tint`, `Free` in Gabarito 700 66px white + "to start, forever" at
72% white, three claims above a `1px solid rgba(255,255,255,.18)` rule, green button.

**FAQ** (surface band). Sticky left head (`top: 104px`), right column of 8 rows separated by
`1px solid --qj-line-3` (top rule on each, bottom rule on the last). Question Gabarito 700 19px,
answer 15.5px `--qj-ink-2`. Ship them **open** — no accordion; eight short answers do not
earn a click. If a collapsed version is required, use `<details>` with the same rules and a
green chevron.

**Closing CTA**. Full-bleed `--qj-blue`, `overflow: hidden`. Content left: h2 50px white
`max-width: 26ch`, paragraph at 80% white, green button + `Questions?` link in `--qj-tint`.

Right: **the EU-emblem joke** — the piglet ringed by twelve yellow stars. The ground is already
Pantone Reflex Blue, which is the European flag's blue, so the gag needs nothing but the stars.
Play it straight and let the reader notice; no caption, no tooltip, no alt text that explains it.

Spec (see §8a). This is the only place the joke appears — do not repeat it in the nav, footer,
favicon, OG image, or any social asset.

### 8a. Star ring

One `position: relative` wrapper, `300×300`, placed `right: 60px; top: 50%;
transform: translateY(-50%)` inside the CTA section.

- **Twelve stars**, five-pointed, points up, `22×22`, fill `#FFCC00` (the flag's yellow — add it
  as `--qj-eu-yellow` and use it nowhere else).
- Laid out on a circle: **radius 125px**, centre `150,150`, first star at 12 o'clock, one every
  30°. Position each by `left: cx + 125·sin θ − 11`, `top: cy − 125·cos θ − 11`.
- Stars are decorative: `aria-hidden="true"` on every one.
- **The piglet sits in the middle**, `210×158`, at `left: 45px; top: 71px`, fill `#2A5FC4` —
  lifted enough to read inside the ring, still recessed behind the stars. Not `#FFCC00`
  (the piglet then shouts louder than the headline) and not `--qj-blue-lift` (it disappears).

Star path, `viewBox="0 0 24 24"`:

```
M12 2 L14.9 9.1 L22.5 9.4 L16.5 14 L18.7 21.3 L12 17 L5.3 21.3 L7.5 14 L1.5 9.4 L9.1 9.1 Z
```

Generate the twelve positions in the component rather than hard-coding them:

```astro
---
// src/components/StarRing.astro — CTA only
const R = 125, C = 150, S = 22;
const stars = Array.from({ length: 12 }, (_, k) => {
  const t = (k * 30 * Math.PI) / 180;
  return { x: C + R * Math.sin(t) - S / 2, y: C - R * Math.cos(t) - S / 2 };
});
---
```

Below `1080px` the ring is the first thing to go — hide it rather than shrink it; a cramped
ring reads as a mistake, not a joke.

**Footer**. `--qj-ink` ground. Inline white mark (40px) + wordmark 27px with `quiet` at 60%
white, then two `13.5px` lines at 52% white.

---

## 9. Astro file map

```
src/
  layouts/BaseLayout.astro        fonts, tokens, meta, favicon set
  styles/tokens.css               §3 custom properties
  components/Mark.astro           §1 inline mark
  components/Lockup.astro         mark + wordmark, `size` prop drives both via the locked ratio
  components/Button.astro         variant: primary (green) | outline (blue) | quiet (text)
  components/sections/
    Nav.astro
    Hero.astro                    incl. BrowserMock
    BrowserMock.astro
    Comparison.astro
    PaymentBar.astro
    StepBack.astro
    Craft.astro
    Pricing.astro
    Faq.astro
    ClosingCta.astro
    StarRing.astro
    Footer.astro
  pages/index.astro               composes the sections in order
public/brand/                     §1 assets
```

Keep all copy in `src/content/landing.ts` (or frontmatter) as a single typed object so the
sections stay presentational and copy edits never touch markup.

Zero client-side JS is required for the page as specified — no islands. The only candidate is
the mobile nav sheet; use a `<details>` or a 15-line inline script rather than a framework island.

---

## 10. Acceptance checklist

- [ ] No Tailwind/browser-default blue or green survives anywhere (`grep` for `#3b82f6`, `blue-6`, `emerald`, `indigo`).
- [ ] Every heading is Gabarito 700; no heading in IBM Plex; no body copy in Gabarito.
- [ ] Every corner is 2px. No pill buttons, no rounded cards.
- [ ] Exactly one elevated element (the hero mock). No shadows elsewhere.
- [ ] `a` and `a:hover` are defined globally — no default blue link anywhere.
- [ ] The lockup ratio (wordmark = mark × 0.405) holds at every size used.
- [ ] The oversized CTA piglet is `#2A5FC4`, sits inside the star ring, and never reads as a logo.
- [ ] `--qj-eu-yellow` appears in the CTA star ring and nowhere else.
- [ ] The star ring is `aria-hidden` and hidden below 1080px.
- [ ] Focus states: `outline: 2px solid var(--qj-green); outline-offset: 2px` on every interactive element — visible against both white and `--qj-blue`.
- [ ] Contrast: `--qj-green` on white is ~3:1 — fine for buttons (white text on green) and 15px+ UI, **not** for green body copy. Green text on white must be 15px/600 or larger, or use `--qj-blue`.
- [ ] `prefers-reduced-motion` respected (nothing animates as specified, so this is only about the mobile sheet).
- [ ] OG image and favicons regenerated from the new badge.
- [ ] Lighthouse: no CLS from webfont swap — `font-display: swap` plus a matched metric fallback (`system-ui`) for both Gabarito and Plex.

---

## 11. What not to do

- Do not redraw the piglet, adjust its corners, legs, ears, snout or eye, or re-space the lockup.
- Do not introduce a third accent, a gradient, a glass panel, or an emoji.
- Do not convert the outlined wordmark SVGs back to live text.
- Do not add sections, testimonials, logo walls, or stats that the current site does not have.
- Do not use `--qj-green` as a large background field — it belongs to the badge and social assets, not the marketing page.
- Do not explain the star ring in copy, alt text, or a tooltip, and do not use the EU yellow anywhere else on the site.

---

## 12. Repo adaptation (QuietJar Astro monorepo)

The plan was written against a generic Astro layout. The actual repo lives in
`apps/frontend` (Tailwind v4, flat components, i18n JSON dictionaries). Adapt as
follows. The design values in §§1-11 are final and unchanged; this section only
maps them onto the existing code.

### File map (overrides §9)

```
apps/frontend/src/
  layouts/Layout.astro            existing base layout - fonts/tokens/meta/favicons go here
  layouts/DashboardLayout.astro   untouched (dashboard)
  styles/global.css               Tailwind v4 @theme - §3 tokens + radius go here (no tokens.css)
  components/
    logo.astro                    existing inline mark + wordmark (nav). Make mask id unique
    navbar/navbar.astro           existing nav (sticky, auth, mobile sheet) - restyle, add lockup
    hero.astro                    restyle + browser mock
    browsermock.astro             new, §6 hero mock
    features.astro                §7 comparison columns
    logos.astro                   §7 payment chips
    polite.astro                  §8 step-back
    craft.astro                   §8 craft cards
    pricing.astro                 §8 blue pricing panel
    faq.astro                     §8 open FAQ
    cta.astro                     §8 closing CTA + StarRing
    starrring.astro               new, §8a star ring
    footer.astro                  restyle
    container.astro               adjust to §4 container (1200px / 40px inline padding)
    ui/button.astro ui/link.astro restyle to green primary / blue outline
    sectionhead.astro             optional helper
  pages/index.astro               unchanged composition order
public/brand/                     §1 assets (already staged)
public/favicon.svg                replaced with badge-blue.svg verbatim
public/favicon-32.png             generated
public/apple-touch-icon.png       generated, #003399 ground
public/og-image.png               generated from field-green.svg
```

Notes that differ from the brief:

- **Keep the existing flat component names.** Do not create
  `components/sections/`, `Mark.astro`, `Lockup.astro`, `BaseLayout.astro`, or
  `tokens.css`. Restyle what exists, add only `browsermock.astro` and
  `starrring.astro`.
- **logo.astro already exists** as the full lockup (mark + outlined wordmark
  paths) with a hardcoded mask id `l`. It renders in the nav and again in the
  footer, so the mask id must become unique per instance (the brief's `qj-<rand>`
  pattern) or the knockout breaks.
- **Tailwind v4 tokens.** Add the §3 palette to `@theme` as `--color-qj-*`
  (e.g. `--color-qj-blue: #003399`) and set `--radius-*` so `rounded-sm` is 2px.
  Replace stock Tailwind blue/green/slate/black usage with `qj-*` tokens; do not
  leave browser-default blue links.
- **Copy stays in i18n.** Keep all copy in `src/i18n/en/home.json` +
  `shared.json` (already a single typed `dictionary()` object). No copy rewrites.
- **Auth wiring is sacred.** The signup/primary buttons in hero, pricing, cta,
  and the navbar use `data-auth-mode` + `window.__quietjarAuthOpen` and the
  BetterAuth modal. Restyling must preserve those attributes and the
  `onAuthStateChange` session toggle in `navbar.astro`.
- **Sections are full-bleed bands.** Currently `index.astro` wraps every section
  in `<Container>`. The §4 rhythm (white / `--qj-surface` bands bounded by 1px
  rules) means sections should own their background band, with a content
  container inside each, instead of one shared container.
- **Fonts already wired.** §2 fonts are self-hosted in `public/fonts/` and
  declared in `global.css` @font-face + `@theme`. Only verify weights match
  (Gabarito 600/700, Plex 400/500/600, Mono 400) and add the `--font-display`
  heading rule if missing.
- **Mobile nav exists.** `navbar.astro` already has a script toggled mobile
  sheet; keep it, restyle to the §4 ≤640px behavior. Respect `prefers-reduced-motion`.
- **Favicon/OG are new.** The current `public/favicon.svg` is a placeholder "Q";
  replace it and add the generated PNGs per §1.
