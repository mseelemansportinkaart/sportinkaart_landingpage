# SEO Improvements Plan — from the 30 Jul 2026 audit (health 43/100)

> **For agentic workers:** implement task-by-task. After EVERY task: `npm run build` must stay green
> (19 pages, 20 once `/steden` exists) and the task gets its own commit. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Act on the claude-seo v2.2.4 audit of www.sportinkaart.nl — fix the canonical/host split, ship
real structured data and social images, cut LCP weight, replace thin generic homepage copy with ~500+
words of specific Dutch content built on REAL counts, add an all-cities hub, and close the small
accessibility/overflow/manifest gaps.

**Branch:** `claude/city-pages-seo-162413` — **this branch is production**. Never touch `master`.

## Global Constraints

- **Language:** all copy Dutch, `<html lang="nl">`. Brand: teal `#00E6B8`, dark `#0a0a0a`, Montserrat.
- **Real numbers only.** Verified against Supabase project `ytyljpykccckvzitwcpo` on 31 Jul 2026:
  - **1.902** active sportlocaties, **18** steden, **36** canonical sportcategorieën.
  - Top categories: Fitness 531, Yoga 272, Dansen 153, Multisport 124, Vechtsporten 98,
    Zwemmen 83, Voetbal 76, Tennis 71.
  - Per stad: Utrecht 391, Almere 238, Amersfoort 196, Hilversum 102, Lelystad 102, Ede 94,
    Veenendaal 93, Nieuwegein 92, Zeist 84, Harderwijk 76, Houten 74, Bussum 74, Woerden 73,
    Dronten 56, Huizen 50, Zeewolde 45, Emmeloord 38, Urk 24.
  - Real geography (audit called this an overclaim): Flevoland 503, provincie Utrecht 1.003,
    het Gooi (Noord-Holland) 226, Gelderse Veluwerand 170. **Not** "heel Nederland".
  - Note: the audit brief said ~1.940 / Utrecht 397; the live database says 1.902 / 391. Use the live numbers.
- **Counts must not be hardcoded where the data layer can supply them.** Homepage totals derive from
  `getAllCities()` at build time so they never go stale.
- **Preserve the 'binnenkort' app-store CTAs.** They are deliberately non-clickable
  (`span.btn.btn-soon[aria-disabled=true]`). Swap their icons to inline SVG but keep text, class and ARIA.
  Do NOT invent store URLs and do NOT add `MobileApplication` JSON-LD.
- **Do NOT scaffold `/privacy` or `/voorwaarden`** — the owner has these on a separate project.
- **Sandbox note:** the Supabase host is blocked by this environment's egress policy, so local builds run
  against a local fixture seeded with the real aggregates above (via the gitignored `.env` only —
  no committed code is changed for it). Production builds on Vercel hit Supabase directly.

---

### Task 1: Canonical host + trailing slash + robots

**Files:** `astro.config.mjs`, `public/robots.txt`

- [ ] `site: 'https://www.sportinkaart.nl'` (was non-www, which 308s to www — the audit's canonical bug).
- [ ] `trailingSlash: 'never'` so `/x` and `/x/` stop both returning 200.
- [ ] `public/robots.txt` Sitemap line → `https://www.sportinkaart.nl/sitemap-index.xml`.
- [ ] Verify: built `<link rel=canonical>` and `sitemap-0.xml` all use the www host.

### Task 2: `vercel.json` — redirects, security headers, asset caching

**Files:** create `vercel.json`

- [ ] Apex `sportinkaart.nl` → `https://www.sportinkaart.nl/$1`, permanent.
- [ ] `cleanUrls: true` + `trailingSlash: false` to match Astro.
- [ ] Headers on `/(.*)`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
      `Referrer-Policy: strict-origin-when-cross-origin`,
      `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
      and a **permissive but present** CSP that allows the inline JSON-LD / inline styles / inline
      module script this site actually ships (`'unsafe-inline'` for script-src and style-src,
      Google Fonts hosts, `data:` images).
- [ ] `/_astro/(.*)` → `Cache-Control: public, max-age=31536000, immutable`.
- [ ] Best-effort legacy 301s, clearly marked as needing owner verification:
      `/:stad/:bedrijf` → `/sporten-in-:stad`, `/organisaties/:rest*` → `/steden`.
      These must NOT shadow the real routes — order and specificity matter; verify `/sporten-in-utrecht`
      and `/steden` still resolve.

### Task 3: Homepage structured data

**Files:** `src/pages/index.astro`

- [ ] Add `Organization` (name, url, logo, areaServed = the 18 steden) and `WebSite` JSON-LD.
- [ ] No `MobileApplication` — there is no store URL yet.

### Task 4: og:image + twitter:image

**Files:** `src/components/Seo.astro`

- [ ] Add absolute `og:image` / `twitter:image` (+ width/height/alt) defaulting to the hero banner,
      overridable per page via a new optional `image` prop.

### Task 5: Compress the hero (1.35 MB → WebP < 150 KB)

**Files:** `public/sportinkaart-banner.webp` (new), `src/pages/index.astro`, `package.json`

- [ ] `npm i -D sharp`, generate a web-sized WebP (max ~1920px wide, quality tuned to land < 150 KB).
- [ ] Point `#hero-bg` at the WebP. Keep the JPG only if still referenced (og:image) — otherwise
      keep it for social previews, since some scrapers handle WebP poorly.

### Task 6: Kill render-blocking Font Awesome; inline SVG icons; font preconnect

**Files:** `src/pages/index.astro`, `src/components/Seo.astro`

- [ ] Remove `@import url('...font-awesome...')` from the global style block (render-blocking, ~third-party).
- [ ] Replace the five `<i class="fa...">` icons (apple, google-play, map-marker, running, route) with
      inline SVG, including the two 'binnenkort' spans — text/class/ARIA preserved. Icons `aria-hidden`.
- [ ] Add `<link rel="preconnect">` for `fonts.googleapis.com` and `fonts.gstatic.com` (crossorigin).

### Task 7: Homepage copy rewrite (~500+ words, real numbers, no overclaim)

**Files:** `src/pages/index.astro`

- [ ] Pull `getAllCities()` at build time; derive total locations, city count, category count, top sports.
- [ ] Replace the thin ~127-word page with specific Dutch content: what the dataset covers, per-region
      breakdown, top categories with counts, how it works, who it is for.
- [ ] Delete the unverifiable "Sluit je aan bij duizenden andere sporters" line.
- [ ] Reframe scope: concretely Flevoland / provincie Utrecht / het Gooi / Veluwerand, aspirational
      about the rest of Nederland — never claiming national coverage today.

### Task 8: H1 accessible name

**Files:** `src/pages/index.astro`

- [ ] `<h1>Sporten in<br><span>Nederland</span></h1>` reads as "Sporten inNederland". Fix so the
      accessible name contains a real space while the two-line look is kept (CSS line break, not `<br>`).

### Task 9: 375 px horizontal overflow

**Files:** `src/pages/index.astro`

- [ ] "Waarom Sportinkaart?" (`.section-title`, 2.5 rem uppercase) overflows at 375 px.
      Clamp the font-size and allow wrapping; verify no element exceeds the viewport at 375 px.

### Task 10: Favicon + web manifest

**Files:** `public/favicon.ico`/`.png`/`.svg`, `public/site.webmanifest`, `src/components/Seo.astro`

- [ ] Generate favicons from the existing logo with sharp; add `site.webmanifest`
      (name, short_name, theme_color `#00E6B8`, background `#0a0a0a`, icons, `lang: nl`).
- [ ] Reference favicon + manifest + `theme-color` from `<head>`.

### Task 11: `/steden` hub page

**Files:** `src/pages/steden.astro` (new), `src/pages/index.astro`

- [ ] List all 18 steden with real location + category counts, each linking to `/sporten-in-<slug>`,
      grouped by region. Own title/description/canonical, `BreadcrumbList` + `ItemList` JSON-LD
      whose `numberOfItems` equals the rendered count.
- [ ] Repoint the homepage "Bekijk alle steden" link from `/sporten-in-utrecht` to `/steden`.
- [ ] `@astrojs/sitemap` picks it up automatically — verify it appears in `sitemap-0.xml`.
- [ ] Build now emits **20** pages.

### Task 12: Descriptive alt text

**Files:** `src/pages/index.astro`, `src/layouts/BaseLayout.astro`

- [ ] Replace generic alts ("Sportinkaart Icon", "Logo", "Sportinkaart") with distinct descriptive Dutch.
- [ ] The showcase overlay logo is decorative → `alt=""`.

### Task 13: IndexNow key file

**Files:** `public/<key>.txt` (new), followups doc

- [ ] Generate a 32-char hex key, write `public/<key>.txt` containing exactly the key.
- [ ] Document the submission endpoint for the owner.

### Task 14: ItemList `numberOfItems` audit

**Files:** `src/pages/sporten-in-[city].astro`

- [ ] Confirm `numberOfItems` === rendered `LocationList` length on every city page (assert against
      built HTML, not by reading the source).
- [ ] City pages show 12 of N locations — the ItemList must describe the 12 that are on the page.
      Make the on-page heading state "12 van de N" so the number is honest to both users and crawlers.

### Task 15: Owner followups doc

**Files:** `docs/SEO-FOLLOWUPS-FOR-OWNER.md` (new)

- [ ] A–F from the brief: store URLs, external privacy/terms + the merge decision, the full legacy 301
      map, Vercel env/DNS verification, off-site/brand collision, per-venue depth (SXO).

---

## Verification checklist (run at the end)

- [ ] `npm run build` → 20 pages, `dist/sitemap-index.xml` present.
- [ ] Every canonical + every sitemap URL uses `https://www.sportinkaart.nl`, no trailing slashes.
- [ ] No `font-awesome` string anywhere in `dist/`.
- [ ] Hero WebP < 150 KB.
- [ ] All JSON-LD blocks in `dist/` parse as valid JSON.
- [ ] Homepage body copy ≥ 500 words; no "duizenden sporters"; counts match the live database.
- [ ] `/steden` links to all 18 city pages and every link resolves to a built file.
