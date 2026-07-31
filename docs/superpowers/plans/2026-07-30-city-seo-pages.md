# City SEO Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate 9 static, SEO-optimized Dutch city landing pages (`/sporten-in-{city}`) plus a migrated homepage, built from live Supabase data at build time, deployed to Vercel.

**Architecture:** Astro static site (`output: 'static'`). A build-time data layer reads the `regions` table for the 9 active cities and aggregates each city's own table into location counts + normalized sport-category breakdowns. Pages render this data into HTML with full SEO head + JSON-LD. Zero runtime Supabase dependency.

**Tech Stack:** Astro, `@astrojs/sitemap`, `@supabase/supabase-js`, Vitest (unit tests for the pure aggregation logic), TypeScript.

## Global Constraints

- **Language:** All page copy in Dutch (`nl`). `<html lang="nl">`.
- **City scope:** Only `regions.is_active = true` (9 cities). Never render concept cities.
- **Supabase project:** `ytyljpykccckvzitwcpo` — URL `https://ytyljpykccckvzitwcpo.supabase.co`.
- **Supabase key:** publishable/anon (read-only, RLS-guarded) `sb_publishable_GypXMpnAuLb9yNzZ3uhHDA_8WqPiY2i`. Supplied via env vars, never hardcoded in source. Legacy anon JWT also works if the publishable key is rejected by the JS client version.
- **URL pattern:** `/sporten-in-{slug}` (route file `sporten-in-[city].astro`).
- **Production domain:** `https://sportinkaart.nl` — used for `site` in `astro.config.mjs` (confirm/replace before the deploy task if the real domain differs).
- **Data shape reality:** `rating`, `website`, `address` are frequently `null`; `is_featured`/`is_partner` are usually `false`. All templates must render gracefully when these are null/false.
- **Sport casing:** `sport_nl` contains casing duplicates (`Jeu de Boules` vs `Jeu De Boules`). Aggregation MUST canonicalize casing so they merge.
- **Palette/fonts (homepage parity):** Montserrat (400/700/900), teal `#00E6B8`, dark bg `#0a0a0a`.
- Commit after each task. TDD for pure logic; build-output assertions for pages.

---

### Task 1: Scaffold Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.env`, `.env.example`
- Create: `src/pages/placeholder.astro` (temporary, removed in Task 6)

**Interfaces:**
- Produces: a buildable Astro project; env vars `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` available via `import.meta.env`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sportinkaart-site",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^4.15.0",
    "@astrojs/sitemap": "^3.2.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sportinkaart.nl',
  output: 'static',
  integrations: [sitemap()],
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.astro/
.env
.vercel/
```

- [ ] **Step 5: Create `.env` and `.env.example`**

`.env`:
```
PUBLIC_SUPABASE_URL=https://ytyljpykccckvzitwcpo.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_GypXMpnAuLb9yNzZ3uhHDA_8WqPiY2i
```
`.env.example` (same keys, empty values):
```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 6: Create a temporary page so build succeeds**

`src/pages/placeholder.astro`:
```astro
---
---
<html lang="nl"><body><p>placeholder</p></body></html>
```

- [ ] **Step 7: Install and build**

Run: `npm install && npm run build`
Expected: build completes, `dist/placeholder/index.html` exists.

- [ ] **Step 8: Commit**

```bash
git add package.json astro.config.mjs tsconfig.json .gitignore .env.example src/pages/placeholder.astro package-lock.json
git commit -m "chore: scaffold Astro project"
```
(Note: `.env` is gitignored — do not commit it.)

---

### Task 2: Sport aggregation logic (pure, TDD)

**Files:**
- Create: `src/lib/sports.ts`
- Test: `src/lib/sports.test.ts`

**Interfaces:**
- Produces:
  - `interface SportCount { sport: string; count: number; }`
  - `canonicalSport(raw: string): string` — trims + title-cases each word.
  - `normalizeSportCounts(rows: (string[] | null)[]): SportCount[]` — merged, sorted desc by count then Dutch-alpha.

- [ ] **Step 1: Write the failing test**

`src/lib/sports.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { canonicalSport, normalizeSportCounts } from './sports';

describe('canonicalSport', () => {
  it('title-cases and trims', () => {
    expect(canonicalSport('  fitness ')).toBe('Fitness');
  });
  it('merges casing variants', () => {
    expect(canonicalSport('Jeu de Boules')).toBe(canonicalSport('Jeu De Boules'));
  });
  it('returns empty for blank', () => {
    expect(canonicalSport('   ')).toBe('');
  });
});

describe('normalizeSportCounts', () => {
  it('counts and merges casing duplicates', () => {
    const result = normalizeSportCounts([
      ['Fitness', 'Jeu de Boules'],
      ['fitness', 'Jeu De Boules'],
      null,
    ]);
    expect(result).toEqual([
      { sport: 'Fitness', count: 2 },
      { sport: 'Jeu De Boules', count: 2 },
    ]);
  });
  it('sorts by count desc then name', () => {
    const result = normalizeSportCounts([['Yoga'], ['Yoga'], ['Boksen']]);
    expect(result[0]).toEqual({ sport: 'Yoga', count: 2 });
    expect(result[1]).toEqual({ sport: 'Boksen', count: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sports.test.ts`
Expected: FAIL — cannot find module `./sports`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/sports.ts`:
```ts
export interface SportCount {
  sport: string;
  count: number;
}

export function canonicalSport(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function normalizeSportCounts(rows: (string[] | null)[]): SportCount[] {
  const counts = new Map<string, number>();
  for (const arr of rows) {
    if (!arr) continue;
    for (const raw of arr) {
      const sport = canonicalSport(raw);
      if (!sport) continue;
      counts.set(sport, (counts.get(sport) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count || a.sport.localeCompare(b.sport, 'nl'));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sports.test.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sports.ts src/lib/sports.test.ts
git commit -m "feat: sport aggregation with casing normalization"
```

---

### Task 3: Supabase build-time data layer

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/cityData.ts`

**Interfaces:**
- Consumes: `normalizeSportCounts`, `SportCount` from `src/lib/sports.ts`.
- Produces:
  - `interface CityLocation { name: string; address: string | null; sport_nl: string[] | null; website: string | null; rating: number | null; is_featured: boolean | null; is_partner: boolean | null; }`
  - `interface City { slug: string; name: string; latitude: number; longitude: number; locationCount: number; sports: SportCount[]; topLocations: CityLocation[]; }`
  - `getAllCities(): Promise<City[]>`

- [ ] **Step 1: Create the Supabase client**

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(url, key);
```

- [ ] **Step 2: Create the city data layer**

`src/lib/cityData.ts`:
```ts
import { supabase } from './supabase';
import { normalizeSportCounts, type SportCount } from './sports';

export interface CityLocation {
  name: string;
  address: string | null;
  sport_nl: string[] | null;
  website: string | null;
  rating: number | null;
  is_featured: boolean | null;
  is_partner: boolean | null;
}

export interface City {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  locationCount: number;
  sports: SportCount[];
  topLocations: CityLocation[];
}

async function getActiveRegions() {
  const { data, error } = await supabase
    .from('regions')
    .select('region_name, slug, latitude, longitude')
    .eq('is_active', true)
    .order('region_name');
  if (error) throw new Error(`regions query failed: ${error.message}`);
  return data ?? [];
}

async function getCity(
  slug: string,
  name: string,
  latitude: number,
  longitude: number,
): Promise<City> {
  const { data, error } = await supabase
    .from(slug)
    .select('name, address, sport_nl, website, rating, is_featured, is_partner')
    .eq('is_active', true);
  if (error) throw new Error(`city '${slug}' query failed: ${error.message}`);
  const rows = (data ?? []) as CityLocation[];
  const sports = normalizeSportCounts(rows.map((r) => r.sport_nl));
  const topLocations = [...rows]
    .sort(
      (a, b) =>
        Number(b.is_partner) - Number(a.is_partner) ||
        Number(b.is_featured) - Number(a.is_featured) ||
        (b.rating ?? 0) - (a.rating ?? 0) ||
        a.name.localeCompare(b.name, 'nl'),
    )
    .slice(0, 12);
  return { slug, name, latitude, longitude, locationCount: rows.length, sports, topLocations };
}

export async function getAllCities(): Promise<City[]> {
  const regions = await getActiveRegions();
  return Promise.all(
    regions.map((r) => getCity(r.slug, r.region_name, r.latitude, r.longitude)),
  );
}
```

- [ ] **Step 3: Smoke-test the data layer against real Supabase**

Create a throwaway page `src/pages/_datacheck.astro`:
```astro
---
import { getAllCities } from '../lib/cityData';
const cities = await getAllCities();
---
<pre>{JSON.stringify(cities.map(c => ({ slug: c.slug, n: c.locationCount, top: c.sports[0] })), null, 2)}</pre>
```
Run: `npm run build`
Expected: build succeeds; `dist/_datacheck/index.html` shows 9 cities with `utrecht` ~397 and a top sport of `Fitness`.

- [ ] **Step 4: Remove the throwaway page**

```bash
rm src/pages/_datacheck.astro
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/lib/cityData.ts
git commit -m "feat: build-time Supabase city data layer"
```

---

### Task 4: BaseLayout + SEO head component

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/Seo.astro`
- Create: `src/styles/global.css`

**Interfaces:**
- Produces: `BaseLayout` with props `{ title: string; description: string; canonicalPath: string; jsonLd?: object[] }`. Renders `<html lang="nl">`, `<head>` (via `Seo`), site header, `<slot />`, footer.

- [ ] **Step 1: Create global styles (ported palette)**

`src/styles/global.css`:
```css
:root {
  --primary-teal: #00E6B8;
  --dark-bg: #0a0a0a;
  --text-dark: #1a1a1a;
  --text-light: #ffffff;
  --grey-light: #f4f4f4;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Montserrat', sans-serif; color: var(--text-dark); line-height: 1.6; }
a { color: inherit; }
```

- [ ] **Step 2: Create the SEO component**

`src/components/Seo.astro`:
```astro
---
interface Props {
  title: string;
  description: string;
  canonicalPath: string;
  jsonLd?: object[];
}
const { title, description, canonicalPath, jsonLd = [] } = Astro.props;
const canonical = new URL(canonicalPath, Astro.site).href;
---
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:type" content="website" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:locale" content="nl_NL" />
<meta name="twitter:card" content="summary_large_image" />
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet" />
{jsonLd.map((obj) => (
  <script type="application/ld+json" set:html={JSON.stringify(obj)} />
))}
```

- [ ] **Step 3: Create BaseLayout**

`src/layouts/BaseLayout.astro`:
```astro
---
import Seo from '../components/Seo.astro';
import '../styles/global.css';
interface Props {
  title: string;
  description: string;
  canonicalPath: string;
  jsonLd?: object[];
}
const { title, description, canonicalPath, jsonLd } = Astro.props;
---
<!DOCTYPE html>
<html lang="nl">
  <head>
    <Seo title={title} description={description} canonicalPath={canonicalPath} jsonLd={jsonLd} />
  </head>
  <body>
    <header style="background:var(--dark-bg);padding:16px 5%;">
      <a href="/"><img src="/logowittransparant.png" alt="Sportinkaart" style="height:44px;" /></a>
    </header>
    <slot />
    <footer style="background:#000;color:#fff;padding:40px 5%;text-align:center;border-top:5px solid var(--primary-teal);">
      <p style="opacity:.6;font-size:.9rem;">&copy; 2026 Sportinkaart. Alle rechten voorbehouden.</p>
    </footer>
  </body>
</html>
```

- [ ] **Step 4: Verify it builds** (a consuming page is added in Task 6; for now just typecheck)

Run: `npx astro check` (if it reports only "no pages use BaseLayout", that is fine)
Expected: no type errors in `BaseLayout.astro` / `Seo.astro`.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/Seo.astro src/styles/global.css
git commit -m "feat: BaseLayout and SEO head component"
```

---

### Task 5: City page components

**Files:**
- Create: `src/components/SportBreakdown.astro`, `src/components/LocationList.astro`, `src/components/CityNav.astro`

**Interfaces:**
- Consumes: `SportCount` (sports.ts), `CityLocation` (cityData.ts).
- Produces:
  - `SportBreakdown` props `{ sports: SportCount[] }`
  - `LocationList` props `{ locations: CityLocation[] }`
  - `CityNav` props `{ cities: { slug: string; name: string }[]; currentSlug: string }`

- [ ] **Step 1: SportBreakdown**

`src/components/SportBreakdown.astro`:
```astro
---
import type { SportCount } from '../lib/sports';
interface Props { sports: SportCount[]; }
const { sports } = Astro.props;
---
<ul style="list-style:none;display:flex;flex-wrap:wrap;gap:10px;">
  {sports.map((s) => (
    <li style="background:var(--grey-light);border-radius:50px;padding:8px 16px;font-weight:700;">
      {s.sport} <span style="color:var(--primary-teal);">{s.count}</span>
    </li>
  ))}
</ul>
```

- [ ] **Step 2: LocationList (null-safe)**

`src/components/LocationList.astro`:
```astro
---
import type { CityLocation } from '../lib/cityData';
interface Props { locations: CityLocation[]; }
const { locations } = Astro.props;
---
<ul style="list-style:none;display:grid;gap:16px;">
  {locations.map((loc) => (
    <li style="background:var(--grey-light);border-radius:16px;padding:20px;">
      <h3 style="font-weight:700;">{loc.name}</h3>
      {loc.address && <p style="opacity:.8;">{loc.address}</p>}
      {loc.sport_nl && loc.sport_nl.length > 0 && (
        <p style="font-size:.9rem;margin-top:6px;">{loc.sport_nl.join(' · ')}</p>
      )}
      {loc.website && (
        <a href={loc.website} rel="nofollow noopener" target="_blank" style="color:var(--primary-teal);font-weight:700;">Website</a>
      )}
    </li>
  ))}
</ul>
```

- [ ] **Step 3: CityNav (internal linking)**

`src/components/CityNav.astro`:
```astro
---
interface Props { cities: { slug: string; name: string }[]; currentSlug: string; }
const { cities, currentSlug } = Astro.props;
---
<nav aria-label="Steden" style="display:flex;flex-wrap:wrap;gap:12px;">
  {cities.map((c) => (
    c.slug === currentSlug
      ? <span style="font-weight:900;color:var(--primary-teal);">{c.name}</span>
      : <a href={`/sporten-in-${c.slug}`} style="font-weight:700;text-decoration:underline;">{c.name}</a>
  ))}
</nav>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SportBreakdown.astro src/components/LocationList.astro src/components/CityNav.astro
git commit -m "feat: city page components"
```

---

### Task 6: City page route + JSON-LD

**Files:**
- Create: `src/pages/sporten-in-[city].astro`
- Delete: `src/pages/placeholder.astro`

**Interfaces:**
- Consumes: `getAllCities`, `City` (cityData.ts) and all Task 4/5 components.
- Produces: 9 static pages at `/sporten-in-{slug}`.

- [ ] **Step 1: Create the route with getStaticPaths + JSON-LD**

`src/pages/sporten-in-[city].astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SportBreakdown from '../components/SportBreakdown.astro';
import LocationList from '../components/LocationList.astro';
import CityNav from '../components/CityNav.astro';
import { getAllCities, type City } from '../lib/cityData';

export async function getStaticPaths() {
  const cities = await getAllCities();
  const nav = cities.map((c) => ({ slug: c.slug, name: c.name }));
  return cities.map((city) => ({
    params: { city: city.slug },
    props: { city, nav },
  }));
}

interface Props { city: City; nav: { slug: string; name: string }[]; }
const { city, nav } = Astro.props;

const path = `/sporten-in-${city.slug}`;
const topSportNames = city.sports.slice(0, 5).map((s) => s.sport).join(', ');
const title = `Sporten in ${city.name} — ${city.locationCount} sportlocaties op de kaart | Sportinkaart`;
const description = `Ontdek ${city.locationCount} sportlocaties in ${city.name}. Van ${topSportNames} en meer — vind jouw sport in de buurt met Sportinkaart.`;

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: new URL('/', Astro.site).href },
      { '@type': 'ListItem', position: 2, name: `Sporten in ${city.name}`, item: new URL(path, Astro.site).href },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Sportlocaties in ${city.name}`,
    numberOfItems: city.locationCount,
    itemListElement: city.topLocations.map((loc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: loc.name,
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Hoeveel sportlocaties zijn er in ${city.name}?`,
        acceptedAnswer: { '@type': 'Answer', text: `In ${city.name} vind je ${city.locationCount} sportlocaties in ${city.sports.length} sportcategorieën op Sportinkaart.` },
      },
      {
        '@type': 'Question',
        name: `Waar kan ik sporten in ${city.name}?`,
        acceptedAnswer: { '@type': 'Answer', text: `Populaire sporten in ${city.name} zijn ${topSportNames}. Bekijk alle locaties op de kaart via Sportinkaart.` },
      },
    ],
  },
];
---
<BaseLayout title={title} description={description} canonicalPath={path} jsonLd={jsonLd}>
  <main style="max-width:1000px;margin:0 auto;padding:60px 5%;">
    <nav aria-label="Kruimelpad" style="font-size:.9rem;opacity:.7;margin-bottom:20px;">
      <a href="/">Home</a> / <span>Sporten in {city.name}</span>
    </nav>
    <h1 style="font-size:2.6rem;font-weight:900;text-transform:uppercase;">Sporten in {city.name}</h1>
    <p style="font-size:1.2rem;margin:20px 0;">
      In <strong>{city.name}</strong> vind je <strong>{city.locationCount}</strong> sportlocaties
      verdeeld over <strong>{city.sports.length}</strong> sportcategorieën. Ontdek ze allemaal op de kaart.
    </p>

    <h2 style="margin:40px 0 16px;font-weight:900;">Sporten in {city.name}</h2>
    <SportBreakdown sports={city.sports} />

    <h2 style="margin:40px 0 16px;font-weight:900;">Sportlocaties in {city.name}</h2>
    <LocationList locations={city.topLocations} />

    <h2 style="margin:40px 0 16px;font-weight:900;">Sporten in andere steden</h2>
    <CityNav cities={nav} currentSlug={city.slug} />
  </main>
</BaseLayout>
```

- [ ] **Step 2: Remove the placeholder page**

```bash
rm src/pages/placeholder.astro
```

- [ ] **Step 3: Build and assert real content is in the HTML**

Run: `npm run build`
Then verify: `grep -l "Sporten in Utrecht" dist/sporten-in-utrecht/index.html && grep -c "sportlocaties" dist/sporten-in-utrecht/index.html`
Expected: `dist/sporten-in-utrecht/index.html` exists and contains the H1 text and the count; 9 `dist/sporten-in-*/` directories exist (`ls -d dist/sporten-in-*` → 9).

- [ ] **Step 4: Assert JSON-LD rendered**

Run: `grep -c "application/ld+json" dist/sporten-in-utrecht/index.html`
Expected: `3`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/sporten-in-[city].astro
git commit -m "feat: city SEO pages with JSON-LD"
```

---

### Task 7: Migrate homepage into Astro

**Files:**
- Create: `src/pages/index.astro`
- Modify: move image assets into `public/`
- Reference (read for content): existing `index.html` at repo root

**Interfaces:**
- Consumes: `BaseLayout` (Task 4).
- Produces: `/` renders with visual parity to the original `index.html`.

- [ ] **Step 1: Move image assets into `public/`**

```bash
mkdir -p public
git mv "logowittransparant kopie.png" public/logowittransparant.png
git mv "Sportinkaart_logo_1 kopie.png" public/sportinkaart-logo.png
git mv "sportinkaart-banner-kopie.jpg" public/sportinkaart-banner.jpg
git mv "logosportinkaart kopie.jpg" public/logosportinkaart.jpg
git mv "splash-icon kopie.png" public/splash-icon.png
```

- [ ] **Step 2: Create `src/pages/index.astro`**

Port the existing `index.html` body into this file: copy the `<style>` block into a `<style is:global>` tag inside the page, copy the `<nav>`/`<header class="hero">`/`<section>`/`<footer>` markup into the `<main>` slot, and copy the `<script>` block to the end. Update every image `src` to the new `public/` paths (e.g. `logowittransparant kopie.png` → `/logowittransparant.png`, banner url in `#hero-bg` → `/sportinkaart-banner.jpg`). Skeleton:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
const title = 'Sportinkaart — Vind Jouw Sportlocatie in Nederland';
const description = 'Vind direct alle sportlocaties bij jou in de buurt. Van voetbalveldjes tot sportscholen — alles op één overzichtelijke kaart.';
---
<BaseLayout title={title} description={description} canonicalPath="/">
  <!-- paste ported nav/hero/features/showcase/bottom-cta markup here,
       image srcs updated to /public paths -->
</BaseLayout>
<style is:global>
  /* paste the full :root + component CSS from index.html here */
</style>
<script>
  /* paste the scroll + IntersectionObserver script from index.html here */
</script>
```
Note: `BaseLayout` already renders a header/footer. To avoid a double header, either (a) remove `index.astro`'s own `<nav>` and rely on the layout header, or (b) keep the hero's nav and set the layout header to render only on non-home pages. Choose (a) for consistency — delete the ported `<nav>` block and let `BaseLayout`'s header stand.

- [ ] **Step 3: Add a link from homepage to the city pages (internal linking + crawl path)**

Add near the bottom-cta section, before `</BaseLayout>`:
```html
<section style="background:var(--dark-bg);color:#fff;padding:60px 5%;text-align:center;">
  <h2 style="font-weight:900;text-transform:uppercase;margin-bottom:24px;">Sporten in jouw stad</h2>
  <p><a href="/sporten-in-utrecht" style="color:var(--primary-teal);font-weight:700;">Bekijk alle steden &rarr;</a></p>
</section>
```

- [ ] **Step 4: Build and verify homepage + assets**

Run: `npm run build`
Then: `test -f dist/index.html && grep -q "Sporten in" dist/index.html && test -f dist/logowittransparant.png`
Expected: all pass.

- [ ] **Step 5: Visual check**

Run: `npm run preview` and open the served URL; confirm hero, teal palette, Montserrat font, feature cards, and footer match the original `index.html`. Fix CSS path/asset issues if any.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro public/
git commit -m "feat: migrate homepage into Astro with city links"
```

---

### Task 8: Sitemap + robots.txt

**Files:**
- Create: `public/robots.txt`
- (Sitemap already wired via `@astrojs/sitemap` in Task 1.)

**Interfaces:**
- Produces: `dist/sitemap-index.xml` listing homepage + 9 city pages; `robots.txt` referencing it.

- [ ] **Step 1: Create `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://sportinkaart.nl/sitemap-index.xml
```

- [ ] **Step 2: Build and verify sitemap contents**

Run: `npm run build`
Then: `grep -c "sporten-in-" dist/sitemap-0.xml`
Expected: `9` (all city URLs present). Also `test -f dist/sitemap-index.xml`.

- [ ] **Step 3: Verify concept cities are absent**

Run: `grep -E "amersfoort|zeist|veenendaal|urk" dist/sitemap-0.xml || echo "OK: no concept cities"`
Expected: `OK: no concept cities`.

- [ ] **Step 4: Commit**

```bash
git add public/robots.txt
git commit -m "feat: robots.txt and sitemap"
```

---

### Task 9: Vercel deploy

**Files:**
- Create: `vercel.json` (optional, only if defaults need overriding)

**Interfaces:**
- Produces: a live deployment; 9 city URLs + sitemap resolve.

- [ ] **Step 1: Confirm production domain**

Verify the real domain. If not `sportinkaart.nl`, update `site` in `astro.config.mjs` and the `Sitemap:` line in `public/robots.txt`, rebuild, and commit.

- [ ] **Step 2: Final clean build**

Run: `rm -rf dist && npm run build`
Expected: success, no errors; `ls -d dist/sporten-in-*` → 9 directories.

- [ ] **Step 3: Deploy via Vercel MCP**

Use the Vercel MCP `deploy_to_vercel` tool (framework auto-detected as Astro: build `astro build`, output `dist/`). Set the same two env vars in the Vercel project (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`) so the cloud build can read Supabase.

- [ ] **Step 4: Verify live URLs**

Fetch `https://<deployment>/sporten-in-utrecht` and `https://<deployment>/sitemap-index.xml`.
Expected: city page returns 200 with the H1 and counts; sitemap lists 9 city URLs.

- [ ] **Step 5: Commit any config**

```bash
git add astro.config.mjs vercel.json 2>/dev/null; git commit -m "chore: production deploy config" || echo "nothing to commit"
```

---

### Task 10: SEO skill audit (user-assisted)

**Files:** none (analysis + targeted fixes).

- [ ] **Step 1: User installs the SEO skill interactively**

The user runs, in an interactive Claude Code session:
```
/plugin marketplace add AgriciDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo
```
(The `bash install.sh` route is not used — no third-party script execution.)

- [ ] **Step 2: Run the audit**

Run `/seo` against the deployed site (or local `dist/`). Focus: title/meta length, canonical correctness, JSON-LD validity, hreflang (nl), heading structure, Core Web Vitals.

- [ ] **Step 3: Apply findings**

For each valid finding, make the minimal fix in the relevant component/page, rebuild, and re-verify. Commit each fix:
```bash
git add -A && git commit -m "fix(seo): <specific finding>"
```

- [ ] **Step 4: Redeploy**

Re-run the Vercel MCP deploy after fixes.

---

## Self-Review

**Spec coverage:**
- 9 active cities → Task 3 (`getActiveRegions` filters `is_active`), Task 6.
- Astro static + SSG → Tasks 1, 6.
- `/sporten-in-{city}` URL → Task 6 route file.
- Build-time snapshot, no runtime coupling → Task 3 (build-time client), Task 6 (`getStaticPaths`).
- Per-page SEO payload (title/meta/canonical/OG/JSON-LD/internal links) → Tasks 4, 5, 6.
- Sport-category breakdown + casing normalization → Tasks 2, 5.
- Null-safe location rendering → Task 5.
- Sitemap + robots → Tasks 1, 8.
- Homepage migration with parity → Task 7.
- SEO skill install + use → Task 10.
- Vercel deploy via MCP → Task 9.
- RLS/publishable key → Global Constraints + Task 1 env.

**Placeholder scan:** No TBD/TODO left. The only "paste from existing file" step (Task 7) references a concrete in-repo source file rather than reproducing 400 lines; skeleton + explicit transformation rules provided.

**Type consistency:** `SportCount`, `CityLocation`, `City`, `getAllCities`, `normalizeSportCounts`, `canonicalSport` names/signatures match across Tasks 2, 3, 5, 6. Component prop shapes in Task 5 match the interfaces consumed in Task 6.
