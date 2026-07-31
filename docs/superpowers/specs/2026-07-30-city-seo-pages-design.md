# Design: City SEO Pages for Sportinkaart

**Date:** 2026-07-30
**Status:** Approved (design), pending spec review
**Branch:** claude/city-pages-seo-162413

## Goal

Generate a dedicated, SEO-optimized landing page for every city where Sportinkaart
operates, to rank for Dutch "sporten in {city}" search intent. Each page presents
real data (location counts, sport-category breakdowns) pulled from Supabase at build
time. Also install and use an SEO analysis skill to audit the result.

## Decisions (locked with user)

| Decision | Choice |
|----------|--------|
| City scope | 9 **active** regions only (`regions.is_active = true`) |
| Framework | **Astro** (static output) |
| Homepage | **Migrate** existing `index.html` into Astro |
| URL pattern | `/sporten-in-{slug}` (keyword-rich Dutch) |
| Data freshness | **Build-time snapshot** (zero runtime Supabase dependency) |
| Hosting | Vercel (via Vercel MCP) |

## Data source (verified)

- **Project:** `Sportinkaart2026` — `ytyljpykccckvzitwcpo` (ACTIVE_HEALTHY, eu-west-1)
- **API URL:** `https://ytyljpykccckvzitwcpo.supabase.co`
- **Publishable key (read-only, safe for build):** `sb_publishable_GypXMpnAuLb9yNzZ3uhHDA_8WqPiY2i`
- **RLS:** every relevant table has `Enable read access for all users` (public `SELECT`).
  No service-role key needed; the publishable key can read all tables at build time.

### Schema (unusual: one table per city)

- `regions` (18 rows) is the authoritative city index. Columns:
  `id, region_name, slug, is_active, is_concept, latitude, longitude`.
- Each city has its **own table** named by slug (e.g. `utrecht`, `almere`). Location
  columns include: `id, name, sport_nl (text[]), address, target_groups, website,
  cost_range, description_nl, is_featured, is_partner, is_active, main_image_url,
  facilities_nl (text[]), latitude, longitude, rating`.
- Sport category = elements of the `sport_nl` text array (a location can have several).

### The 9 active cities (with current active-location counts)

| Slug | City | Locations | Distinct sports |
|------|------|-----------|-----------------|
| utrecht | Utrecht | 397 | 34 |
| almere | Almere | 242 | 28 |
| hilversum | Hilversum | 107 | 22 |
| lelystad | Lelystad | 102 | 24 |
| bussum | Bussum | 74 | 20 |
| dronten | Dronten | 57 | 18 |
| huizen | Huizen | 52 | 18 |
| zeewolde | Zeewolde | 45 | 18 |
| emmeloord | Emmeloord | 38 | 17 |

*(9 "concept" cities — Amersfoort, Zeist, Nieuwegein, Houten, Veenendaal, Woerden,
Ede, Harderwijk, Urk — are intentionally excluded. Adding one later = flip
`regions.is_active` and rebuild.)*

### Top sport categories overall (for template design)

Fitness (534), Yoga (272), Dansen (153), Multisport (124), Vechtsporten (98),
Zwemmen (83), Voetbal (76), Tennis (71), Basketbal (47), Atletiek (46), Pilates (45),
Padel (30), Golf (30), Crossfit (30), Boksen (28), Volleybal (28)…

**Data-quality note:** `sport_nl` has casing duplicates (`Jeu de Boules` 18 vs
`Jeu De Boules` 5). The aggregation MUST normalize casing (e.g. `initcap(lower())`
or a canonical map) so a sport does not split into two rows on the page.

## Architecture

```
astro.config.mjs                  # site URL + @astrojs/sitemap integration
package.json                      # astro, @astrojs/sitemap, @supabase/supabase-js
.env                              # PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY (build only)
src/
  lib/supabase.ts                 # build-time Supabase client (publishable key)
  lib/cityData.ts                 # fetch regions + per-city aggregation, casing normalize
  data/sportMeta.ts               # canonical sport name map + optional icons
  layouts/BaseLayout.astro        # <head> SEO block, header, footer, CityNav
  components/
    SportBreakdown.astro          # sport categories + counts
    LocationList.astro            # top locations (featured/partner first)
    CityNav.astro                 # cross-links all 9 city pages
    Seo.astro                     # meta, canonical, OG, JSON-LD helper
  pages/
    index.astro                   # ported homepage (visual parity with index.html)
    sporten-in-[city].astro       # getStaticPaths → 9 static pages
public/
  robots.txt                      # points at sitemap
  <logos/images migrated from repo root>
```

### Data flow

1. `getStaticPaths()` in `sporten-in-[city].astro` calls `cityData.ts`.
2. `cityData.ts` reads `regions` where `is_active = true` → 9 rows.
3. For each city, query its table: `select ... where is_active = true`.
4. Aggregate `sport_nl` into normalized `{sport, count}` pairs; sort desc.
5. Return one static path per city with its data baked into props.
6. `astro build` emits static HTML — **no Supabase calls at runtime**.

## Per-page content (SEO payload)

- **`<title>`**: `Sporten in {City} — {N} sportlocaties op de kaart | Sportinkaart`
- **meta description**: templated, includes city + count + top sports.
- **`<h1>`**: `Sporten in {City}`
- **Intro paragraph**: real total locations + distinct sport count, Dutch copy.
- **Sport-category breakdown**: normalized categories + counts; each links to the
  app (deep link / filter by sport where available).
- **Top locations list**: featured + partner first, then by rating; name, address,
  sports, website link.
- **JSON-LD** (`Seo.astro`): `BreadcrumbList`, `ItemList` of locations, and a
  `FAQPage` ("Waar kan ik sporten in {City}?", "Hoeveel sportlocaties…?").
- **Internal linking**: `CityNav` links all 9 cities + link to homepage.
- **Head hygiene**: canonical URL, `lang="nl"`, Open Graph + Twitter tags,
  viewport, favicon.

## Sitemap & robots

- `@astrojs/sitemap` generates `sitemap-index.xml` (homepage + 9 city pages) with
  `site` set to the production URL.
- `public/robots.txt`: `Allow: /` + `Sitemap:` line.

## Homepage migration

Port `index.html` into `index.astro` using `BaseLayout`. Requirement: **visual
parity** — same Montserrat font, teal `#00E6B8` palette, hero, feature cards,
showcase, footer, and the scroll/IntersectionObserver scripts. Move root-level
images (`logowittransparant kopie.png`, banner, etc.) into `public/` and fix paths.

## SEO skill (install + use)

- **Install (user runs interactively — not this session):**
  ```
  /plugin marketplace add AgriciDaniel/claude-seo
  /plugin install claude-seo@agricidaniel-claude-seo
  ```
  The `bash install.sh` manual route is **not** used (executing a third-party
  script). Plugin-marketplace path only.
- **Use:** after the site builds, run `/seo` against the generated pages to audit
  schema markup, meta tags, hreflang, and Core Web Vitals. Fix findings, then do
  the final deploy.

## Deploy (Vercel MCP)

- Astro `output: 'static'`; Vercel auto-detects Astro (build `astro build`, output
  `dist/`).
- Set production `site` URL in `astro.config.mjs` for correct canonical + sitemap.
- Deploy via Vercel MCP; verify the 9 city URLs and `sitemap-index.xml` resolve.

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| RLS blocks build reads | Verified public SELECT; publishable key works. |
| Sport casing duplicates | Normalize in aggregation (canonical map). |
| Homepage visual regression | Port CSS verbatim; visual diff before deploy. |
| Concept cities leaking into sitemap | Only `is_active` cities generate paths. |
| Runtime Supabase coupling | None — data baked at build; key is read-only. |
| Key in client bundle | Publishable key is read-only + RLS-guarded; used only at build, not shipped. |

## Out of scope (YAGNI)

- Concept-city pages / "coming soon" treatment.
- Runtime/live data fetching.
- Per-sport pages (`/sporten-in-utrecht/fitness`) — possible future iteration.
- Multilingual (`sport_en`) pages — Dutch only for now.

## Success criteria

- 9 static city pages build from live Supabase data with correct counts.
- Each page has valid title/meta/canonical/OG + JSON-LD that passes validation.
- `sitemap-index.xml` lists homepage + 9 cities; `robots.txt` references it.
- Homepage visually matches the current `index.html`.
- Site deploys to Vercel and all URLs resolve.
- `/seo` audit run and its findings addressed.
