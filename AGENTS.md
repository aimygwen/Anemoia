# AGENTS.md — Anemoia (Art of Aimy Gwen)

Aimy Gwen's portfolio. A **static multi-page site** — no framework, no build step, no bundler.
Plain HTML + CSS + vanilla JS, deployed 1:1 to GitHub Pages.

## Run & deploy

- Local preview: `npm run dev` (or `python3 -m http.server 7100`) from the repo root. The site is static; no build step. Always preview through `http://localhost:7100` — opening `index.html` directly via `file://` will break external SVG masks and some assets.
- There are no tests, no lint, no build. Verify changes by opening the page in a browser.
- **Safari is the reference browser** for this project. Do visual verification in Safari; **never use Chrome/Blink** for testing, screenshots, or "what you see" verification.
- **Do not push to GitHub** until the user explicitly asks. Stage work locally and preview in Safari first.
- Deploy: push to `main` → `.github/workflows/static.yml` uploads the **entire repo** to GitHub Pages. Anything committed is public.

## Project layout

- `index.html` — home ("Start"). NOTE: it is a 1:1 SSR snapshot of an old Nuxt app; the `<style>` blocks and `[data-v-*]` selectors in `home.css` are frozen legacy output. Don't restyle them — layer new work in `home-overrides.css` / `start-work.css` instead.
- `about.html`, `contact.html`, `gallery.html`, `insights.html`, `imprint.html`, `legal.html`, `lowpoly.html` — sibling pages, each with a matching `css/<page>.css` + `js/<page>.js` pair.
- `404/` — self-contained 404 page (own css/js inside the folder).
- `css/polykroma.css` — **shared design system + chrome**. Loaded on every page. Single source for: palette tokens, fixed header/nav, Polly mascot (logo SVG layers), menu coin + overlay, page transitions. Geometry here is px-locked on purpose — don't convert to rem.
- `js/polykroma.js` — chrome runtime: band page transition (`window.AimyPageTransition.navigate(href)`).
- `js/polyglide.js` — shared weighted scroller (`window.Polyglide`), see below.
- `js/polly-iris.js`, `js/polly-specular.js` — logo micro-interactions (specular is paused).
- `js/lowpoly-catalog-data.js` — **auto-generated, do not edit** (built from a lowpoly catalog; the generator script is not in this repo).
- `assets/` — images (page art at root, `thumbnails/`, `content/` for gallery/lowpoly media, `polykroma/` for brand assets). `fonts/`, `fav/`.
- `preview-shots/` — reference screenshots of the home hero.

## Hard conventions

1. **Cache busting.** Every css/js/asset URL carries a version query, currently `?v=aug3b`. When you change a CSS/JS file, bump the tag **on every page that references it** (grep for the old tag). Keep all pages on one tag — don't mix versions.
2. **Per-page pairing.** Page-specific code goes in that page's own css/js file. Only things shared by ≥2 pages belong in `polykroma.*`. Load order in `<head>`/end of `<body>` matters: CDN libs → `polyglide.js` → `polykroma.js` → page script.
3. **No dependencies.** CDN only: Lenis 1.1.18, GSAP 3.12.5, simplex-noise 2.4.0. Do not add npm packages or a build tool; if a capability is missing, write it by hand.
4. **Vanilla JS**, `"use strict"` IIFEs exposing one `window.*` global (see `js/polyglide.js` for the house style). ES5-leaning (`var`) in shared helpers is intentional; match the file you're editing. Every script starts with a short `/** … */` header describing what it owns.
5. **Reduced motion.** All animation code must check `prefers-reduced-motion` and degrade (Polyglide already does).
6. **Paths.** Relative `./…` everywhere; the site must work from any sub-path (GitHub Pages project site).

## Design tokens (polykroma.css)

### Anemoia 8-step palette — single source of truth

| Token | Hex | Role |
|-------|-----|------|
| `--step-01` | `#FEF0FE` | Soft Blush Glow — lightest surfaces / dark-mode headings |
| `--step-02` | `#FDC3FD` | Lavender Bubblegum — card/container surfaces |
| `--step-03` | `#F09EFB` | Radiant Orchid — hover/active surfaces, soft accents |
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
| `--pk-bg` | `--step-01` | `--step-08` |
| `--pk-surface` | `--step-02` | `--step-07` |
| `--pk-hover` | `--step-03` | `--step-06` |
| `--pk-border` | `--pk-soft` | `rgba(178, 75, 251, 0.3)` |
| `--pk-text` | `--step-07` | `--step-02` |
| `--pk-heading` | `--step-08` | `--step-01` |
| `--pk-primary` | `color-mix(--step-07 68%, --step-01)` | `color-mix(--step-07 62%, --step-02)` |
| `--pk-accent` | `color-mix(--step-06 58%, --step-01)` | `color-mix(--step-06 65%, --step-02)` |
| `--pk-soft` | `color-mix(--step-04 55%, --step-01)` | `color-mix(--step-04 45%, --step-02)` |
| `--pk-cta-bg` | `--pk-primary` | `--pk-primary` |
| `--pk-cta-text` | `--step-08` | `--step-01` |

`--aimy-primary`, `--aimy-accent`, `--aimy-menu-coin`, and the logo primary use `--pk-primary` / `--pk-accent`, so the brand signal is now a muted pastel lavender rather than the raw magenta step.

### Token application rules

- **No hardcoded hex outside the step definitions.** Every CSS color must resolve to a `--step-*` token, a semantic alias, or `color-mix(in srgb, var(--step-XX) N%, transparent)` for opacity.
- For opacity, prefer `color-mix()` over `rgba(#hex, a)`. Example: `color-mix(in srgb, var(--step-07) 22%, transparent)`.
- Use `var(--step-01)` in place of white and `var(--step-08)` in place of black for UI surfaces. The literal keywords `black`/`white` are reserved only for SVG masks where full opacity is required.
- Dark mode is automatic via `prefers-color-scheme` in `polykroma.css` — write components against the `--pk-*` / `--aimy-*` tokens so they flip for free.
- Logo color hierarchy is fixed: primary (brand accent) → hairstyle, secondary (lightest pastel) → face/bow/base, tertiary (darkest) → iris/lashes.
- Fluid type/spacing via `clamp()`. Polykroma menu geometry is px-locked by design (home sets a large root font-size).

## Motion & feel

- **Polyglide** (`js/polyglide.js`) is the site's weighted Lenis scroll — free inertial scroll, ~1.15s exponential ease. When the user asks for scrolling that feels "slower/smoother/weighted like the other pages", they mean Polyglide: include Lenis CDN + `polyglide.js`, call `Polyglide.boot()`, and use `Polyglide.stop()/start()` around lightboxes/overlays. It is **not** scroll-snap and never page-jumps. Don't boot Lenis inline on a page — use Polyglide so settings stay single-sourced.
- Motion language: organic blooms, soft blur→clear, gentle fade/scale (GSAP). No harsh snaps, industrial slides, or aggressive spins. This is a warm, cozy, lavender–rosé editorial sanctuary — not cyberpunk, not corporate.
- The legacy `--f-cubic`/`--f-smooth` easings and `--vh`/`--vw` custom-property viewport units in `home.css` are part of the snapshot; reuse them when touching home.

## Gotchas

- `index.html` contains a giant frozen Nuxt snapshot: huge inline `<style>` blocks, `[data-v-*]` attribute selectors, and legacy CSS vars (`--c-yellow`, `--c-black`, `--g-gap`, `--h1`…). Treat it as read-only scenery; fix forward with overrides.
- Some links point outside the repo (`../../videos.html`, `../../visuals/…`) — they resolve on the deployed site, not locally. Don't "fix" them.
- `.cursor/rules/*.mdc` exists but is gitignored and references a `behind-the-madness/` folder that no longer exists — its Polyglide/brand content is superseded by this file. Keep this AGENTS.md current instead.
- `legal.html` currently has no css/js pair.
- **Do not use Git LFS.** The site is deployed 1:1 from the repo by `.github/workflows/static.yml`; GitHub Pages serves the committed bytes, and it cannot resolve LFS pointers. Images/videos/fonts must remain regular files in git.
- macOS junk (`.DS_Store`) is untracked via `.gitignore`; keep it that way.

## When you change things

- New shared chrome/token/scroll behavior → update this AGENTS.md in the same change.
- New page → copy the per-page pattern: `<page>.html` + `css/<page>.css` + `js/<page>.js`, load `polykroma.css` first, Polyglide for scroll, `?v=` tag on every reference.
