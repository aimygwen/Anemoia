# AGENTS.md — Anemoia (Art of Aimy Gwen)

Aimy Gwen's portfolio. A **static site** — vanilla HTML + CSS + JS, no build step. `index.html` is the **SPA host**; all main views live in the SPA.

## Run & deploy

- Local preview: `npm run dev` (runs `scripts/dev-server.py` on port 7100) from the repo root. The dev server serves `index.html` for SPA routes (`/work`, `/insights`, …) so reload works like GitHub Pages. **Do not** run `python3 -m http.server 7100` at the same time — if both bind port 7100, localhost may still hit the plain server and 404 on reload. Always preview through `http://localhost:7100` — opening `index.html` directly via `file://` will break external SVG masks and some assets.
- There are no tests, no lint, no build. Verify changes by opening the page in a browser.
- **Safari is the reference browser** for this project. Do visual verification in Safari; **never use Chrome/Blink** for testing, screenshots, or "what you see" verification.
- **Do not push to GitHub** until the user explicitly asks. Stage work locally and preview in Safari first.
- Deploy: push to `main` → `.github/workflows/static.yml` uploads the **entire repo** to GitHub Pages. Anything committed is public.

## Project layout

- `index.html` — **SPA host** + Start view (`data-spa-host`, `#app-viewport`). Start is **splash-only** (`data-aimy-splash-only`) — carousel lives in the coin menu, not on Start.
- `404.html` — GitHub Pages SPA fallback (stores path in `sessionStorage`, redirects to `index.html`).
- `partials/view-*.html` — fetched HTML for non-Start views (Work, Insights, Me, Contact).
- `js/spa/` — SPA core: `spa-router.js`, `spa-shell.js`, `spa-nav.js`, `spa-state.js`, `spa-transitions.js`, `spa-a11y.js`, `spa-views.js`, `spa-prefetch.js`; view hooks in `js/spa/views/view-*.js` + `window.SpaPages.*`.
- `css/spa/` — SPA shell, transitions, scaffold + Work hub (`?v=spa-11`).
- `about.html` — full-page About / Me sibling (`css/about.css` + `js/about.js`; polaroid hero, scroll curtain, lifebar HUD). Coin menu Me links here until content migrates to SPA `./me`.
- `imprint.html`, `legal.html` — full-page legal siblings (footer links, `data-no-spa`). `imprint` pairs `css/insights.css` + `css/imprint.css` + `js/imprint.js` (Insights hub typography, signature, tokens); `legal.html` redirects to imprint.
- `css/polykroma.css` — **shared design system + chrome**. Loaded on every page. Single source for: palette tokens, fixed header/nav, Charm mascot (logo SVG layers), menu coin + overlay, page transitions. Geometry here is px-locked on purpose — don't convert to rem.
- `css/mono-dev.css` — **temporary greyscale dev palette** (load last on `index.html` + `imprint.html`; delete when restoring color).
- `js/polykroma.js` — chrome runtime: band page transition (`window.AimyPageTransition.navigate(href)`).
- `js/polyglide.js` — shared weighted scroller (`window.Polyglide`), see below.
- `assets/polykroma/branding/` — Charm layers (`charm-*.svg`), wordmark (`wordmark-type.svg`, `wordmark-shadow.svg`, `wordmark-outline.svg`), `signature.svg`, `noise.svg`, `prism.jpg`, `minimark.svg`.
- `js/charm-mark.js`, `js/charm-iris.js`, `js/charm-specular.js` — Charm mark hydration + logo micro-interactions (specular file kept but not loaded — paused). Bump `charm-mark.js?v=` when editing `charm-*.svg`.
- `css/wordmark-holo.css` + `js/wordmark-holo.js` — shared Rainbow Rare holo sticker wordmark (Start splash + Insights identity log). Class `.aimy-wordmark-holo`; boot via `window.AimyWordmarkHolo.boot()`.
- `js/lowpoly.js`, `js/gallery.js` + matching CSS — Work category content, lazy-loaded from `view-work.js`.
- `js/work-stickerbook.js`, `js/work-sticker-holo.js`, `css/work-stickerbook.css` — Hytale Work sticker book (holo die-cut spreads + page flip). Loaded from `view-work.js` when `?category=hytale`.
- `assets/content/lowpoly/hytale/pages/` — **Hytale sticker book content** (see below). `index.json` lists page folder order; each `page-N/page.json` defines topic/title/text + sticker list. Drop PNGs into the page folder and reference by filename.
- `js/lowpoly-catalog-data.js` — **auto-generated, do not edit** (built from a lowpoly catalog; the generator script is not in this repo).
- `assets/` — images (page art at root, `thumbnails/`, `content/` for gallery/lowpoly media, `polykroma/` for brand assets). `fonts/`, `fav/`.
- `preview-shots/` — reference screenshots of the home hero.
- `scripts/dev-server.py` — local static server with SPA fallback for clean URLs.

## Hard conventions

1. **Cache busting.** Every css/js/asset URL carries a version query. When you change a CSS/JS file, bump the tag **on every page that references it** (grep for the old tag). Keep all pages on one tag — don't mix versions. Shared chrome is currently `polykroma-84` (js) / `polykroma-81` (css); SPA bundle is `spa-110` / `spa-23` / `spa-13`; Work view is `spa-51`; Hytale sticker book is `stickerbook-7`; Hytale page manifest is `hytale-pages-2`; menu carousel is `menu-carousel-11`; home splash is `home-splash-24`; menu-select is `menu-select-22` (GLB assets use `SELECT_TAG` in `menu-select.js`, currently `select-2`); imprint is `imprint-ins-5`.
2. **Per-page pairing.** SPA view code goes in `partials/view-*.html`, `js/spa/views/view-*.js`, and `css/spa/*`. Full-page legal uses `imprint.*`. Only things shared by ≥2 pages belong in `polykroma.*`. Load order on SPA host: CDN libs → `polyglide.js` → page/home scripts → `charm-*.js` → `polykroma.js` → `js/spa/*` (shell last).
3. **No dependencies.** CDN only: Lenis 1.1.18, GSAP 3.12.5, Three.js (menu carousel). Do not add npm packages or a build tool; if a capability is missing, write it by hand.
4. **Vanilla JS**, `"use strict"` IIFEs exposing one `window.*` global (see `js/polyglide.js` for the house style). ES5-leaning (`var`) in shared helpers is intentional; match the file you're editing. Every script starts with a short `/** … */` header describing what it owns.
5. **Reduced motion.** All animation code must check `prefers-reduced-motion` and degrade (Polyglide already does).
6. **Paths.** Relative `./…` everywhere; the site must work from any sub-path (GitHub Pages project site).

## Design tokens (polykroma.css)

### Anemoia 8-step palette — single source of truth

| Token | Hex | Role |
|-------|-----|------|
| `--step-01` | `#F2F0F8` | Mist Lavender — neutral page ground / dark-mode headings |
| `--step-02` | `#FDC3FD` | Lavender Bubblegum — card/container surfaces |
| `--step-03` | `#F09EFB` | Pastel Rose Orchid — hover/active surfaces, soft accents |
| `--step-04` | `#F089FE` | Electric Blossom — borders, secondary accents |
| `--step-05` | `#E43EFF` | Ultra Magenta — primary brand accent / CTA fill |
| `--step-06` | `#B24BFB` | Neon Violet — hover CTA, violet accents |
| `--step-07` | `#8E14CE` | Velvet Purple — body/secondary text |
| `--step-08` | `#311633` | Midnight Eclipse — headings (light), dark surfaces |

These eight values are constants — **never redefine them, never add new steps**. Derive every UI color from them.

### Semantic aliases

Use `--pk-*` (or the older `--aimy-*` aliases) so components flip automatically in dark mode:

| Token | Light mode | Dark mode |
|-------|------------|-----------|
| `--pk-bg` | `--step-01` | `oklch(from --step-08 0.105 0.014 h)` — off-black ground |
| `--pk-surface` | `--step-02` | `oklch(from --step-08 0.148 0.02 h)` — elevated panel |
| `--pk-hover` | `--step-03` | `oklch(from --step-08 0.188 0.026 h)` |
| `--pk-border` | `--pk-soft` | `color-mix(--step-06 30%, transparent)` |
| `--pk-text` | `--step-07` | `--step-02` |
| `--pk-heading` | `--step-08` | `--step-01` |
| `--pk-primary` | `color-mix(--step-06 68%, --step-01)` | `color-mix(--step-06 62%, --step-02)` |
| `--pk-accent` | `color-mix(--step-05 58%, --step-01)` | `color-mix(--step-05 68%, --step-02)` |
| `--pk-soft` | `color-mix(--step-04 55%, --step-01)` | `color-mix(--step-04 48%, --step-02)` |
| `--pk-cta-bg` | `--pk-primary` | `--pk-primary` |
| `--pk-cta-text` | `--step-08` | `--step-01` |

`--aimy-primary`, `--aimy-accent`, `--aimy-menu-coin`, and the logo primary use `--pk-primary` / `--pk-accent` — vibrant pastel rose-violet, not grey-blue periwinkle.

### Token application rules

- **No hardcoded hex outside the step definitions.** Every CSS color must resolve to a `--step-*` token, a semantic alias, or `color-mix(in srgb, var(--step-XX) N%, transparent)` for opacity.
- For opacity, prefer `color-mix()` over `rgba(#hex, a)`. Example: `color-mix(in srgb, var(--step-07) 22%, transparent)`.
- **Rainbow hover tokens** (`--rainbow-1`…`4` in `polykroma.css`) are the deliberate exception — pink / butter / teal / lilac hex cycle restored from legacy `ui.css`; do not remap them to `--step-*` or they collapse into grey-lavender.
- Use `var(--step-01)` in place of white and `var(--step-08)` in place of black for UI surfaces. The literal keywords `black`/`white` are reserved only for SVG masks where full opacity is required.
- Dark mode is automatic via `prefers-color-scheme` in `polykroma.css` — write components against the `--pk-*` / `--aimy-*` tokens so they flip for free.
- Logo color hierarchy is fixed: primary (brand accent) → hairstyle, secondary (lightest pastel) → face/bow/base, tertiary (darkest) → iris/lashes.
- Fluid type/spacing via `clamp()`. Polykroma menu geometry is px-locked by design (home sets a large root font-size).

## Motion & feel

- **Polyglide** (`js/polyglide.js`) is the site's weighted Lenis scroll — free inertial scroll, ~1.15s exponential ease. When the user asks for scrolling that feels "slower/smoother/weighted like the other pages", they mean Polyglide: include Lenis CDN + `polyglide.js`, call `Polyglide.boot()`, and use `Polyglide.stop()/start()` around lightboxes/overlays. It is **not** scroll-snap and never page-jumps. Don't boot Lenis inline on a page — use Polyglide so settings stay single-sourced.
- Motion language: organic blooms, soft blur→clear, gentle fade/scale (GSAP). No harsh snaps, industrial slides, or aggressive spins. This is a warm, cozy, blue-violet lavender editorial sanctuary — not cyberpunk, not corporate.
- The legacy `--f-cubic`/`--f-smooth` easings and `--vh`/`--vw` custom-property viewport units in `home.css` are part of the snapshot; reuse them when touching home.

## SPA routing (vanilla Path 1)

- **Host:** `index.html` only (`body[data-spa-host]`). Views live in `#app-viewport`; Start is inline, others fetch from `partials/view-*.html`.
- **Routes:** `./` (Start), `./work?category=`, `./insights`, `./me`, `./contact`. Work categories: `lowpoly`, `hytale`, `stills`, `motion`.
- **Nav:** coin menu holds the **WebGL portfolio carousel** (Start / Work / Insights / Me / Contact) — no text nav list in the overlay. **Me** opens full-page `about.html`; Imprint/Legal live on `imprint.html` (full-page siblings).
- **Legacy map:** old `.html` filenames (`lowpoly.html`, `gallery.html`, …) still resolve via `spa-router.js` for bookmarks — those files are gone; routing happens in the SPA. `about.html` is restored as a real page (router treats it as external, not `./me`).
- **Transitions:** in-app navigations on the host bypass full-page `AimyPageTransition`; coin menu calls `AimySpa.navigate()` when the href is routable.
- **Deploy:** root `404.html` stores the requested path and redirects to `index.html` for clean URLs on GitHub Pages. Local dev uses `scripts/dev-server.py` (via `npm run dev`) for the same reload behavior.
- **Work hub:** `partials/view-work.html` — scrollable **work-deck** chooser (Hytale / Lowpoly / Stills / Motion) + docked title + category panels. Lazy-loads `lowpoly.*` / `gallery.*` on first category visit via `view-work.js`. **Hytale** uses the sticker book (`work-stickerbook.*`) instead of the catalog grid — Polyglide scroll, bottom-right page flip, content driven by `assets/content/lowpoly/hytale/pages/`.

### Hytale sticker book pages

Curate spreads without touching JS:

1. **`pages/index.json`** — ordered list of folder names (`page-1`, `page-2`, …). Reorder to change book sequence.
2. **`pages/page-N/page.json`** — per-spread config:
   - `topic`, `title`, `lede`, `body` — optional intro copy above the sticker grid
   - `stickers[]` — `{ "image", "label", "catalogId"? }` per sticker
3. **Images** — drop PNGs into `page-N/` and reference `"my-sticker.png"`, or point at catalog assets: `"lowpoly/hytale/Furnishings/bentoboxxnano.png"`. Set `catalogId` to open the lowpoly lightbox on click.
4. **Empty pages** — spreads with no stickers are skipped until you add at least one entry.
5. **Template** — copy `page.example.json` when adding a new folder; add the folder id to `index.json`.

Bump `?v=hytale-pages-*` on manifest fetches in `work-stickerbook.js` when editing page JSON during dev.

## Gotchas

- `index.html` contains a giant frozen Nuxt snapshot: huge inline `<style>` blocks, `[data-v-*]` attribute selectors, and legacy CSS vars (`--c-yellow`, `--c-black`, `--g-gap`, `--h1`…). Only the splash (`c-welcome`) is live in `#app-viewport`; fix forward with overrides in `home-overrides.css` / `spa-tokens.css`, don't extend the inline dump.
- Some links point outside the repo (`../../videos.html`, `../../visuals/…`) — they resolve on the deployed site, not locally. Don't "fix" them.
- **Do not use Git LFS.** The site is deployed 1:1 from the repo by `.github/workflows/static.yml`; GitHub Pages serves the committed bytes, and it cannot resolve LFS pointers. Images/videos/fonts must remain regular files in git.
- macOS junk (`.DS_Store`) is untracked via `.gitignore`; keep it that way.

## When you change things

- New shared chrome/token/scroll behavior → update this AGENTS.md in the same change.
- New SPA view → add `partials/view-*.html`, `js/spa/views/view-*.js`, register in `spa-views.js`, bump `spa-*` cache tag everywhere.
- New full-page sibling (rare) → `<page>.html` + shared design CSS if paired (e.g. legal loads `insights.css`) + `css/<page>.css` + `js/<page>.js`, load `polykroma.css` first, Polyglide for scroll, `?v=` tag on every reference.
