# SEO followups that need the owner

Written 31 July 2026, alongside the automated fixes on `claude/city-pages-seo-162413`.
Updated after `56a87c8`, which closed items B(i), part of E, and the asset/dead-code cleanup
(see `docs/superpowers/plans/2026-07-31-seo-improvements.md` for what *was* done).

Everything below was deliberately **not** done, because it needs information, credentials or a
product decision that only you have. They are ordered roughly by impact.

---

## A. Real App Store / Play Store URLs — blocks two things

The two download CTAs on the homepage are currently a non-clickable "binnenkort" state
(`<span class="btn ... btn-soon" aria-disabled="true">`), which is correct while there is nothing to
link to. No store URLs were invented.

Once the listings are live, send the two URLs and:

1. Turn each `<span class="btn btn-… btn-soon" aria-disabled="true">` in
   `src/pages/index.astro` back into an `<a href="…">`, drop `btn-soon` and `aria-disabled`,
   and remove the "— binnenkort" suffix plus the explanatory note under the bottom CTA.
2. Add `MobileApplication` (or `SoftwareApplication`) JSON-LD to the homepage. This was left out on
   purpose: the schema requires a real `installUrl`/`downloadUrl`, and a fabricated one is worse
   than no structured data at all.

**Impact:** this is the audit's single CRITICAL item that is still open. The homepage's primary
conversion action currently cannot be completed.

---

## B. Privacy policy & terms — link the existing ones, then decide about merging

The audit flagged missing `/privacy` and `/voorwaarden`. **No draft pages were scaffolded here**,
because you already have these on a separate website/project — two competing versions of a legal
document is worse than one.

Two separate things to action:

1. ~~**Short term (do this soon).** Send the canonical URL of the existing privacy policy so it can
   be linked from the site footer.~~ **DONE** in `56a87c8` — the footer now links
   `https://privacy.sportinkaart.nl/` on all 20 pages. That also unblocks the app-store
   requirement for a public privacy-policy URL (item A).
   Still open: **terms/voorwaarden**, if they live at a separate URL — send it and it gets linked too.
2. **Decision needed.** Should that separate privacy/legal project be **merged into this site**?
   Arguments for merging: link equity stays on `sportinkaart.nl`, one deploy, one domain in the
   store listings, no cross-domain trust gap for users. Arguments against: the other project may
   serve more than just Sportinkaart, and merging means migrating its URLs (and any inbound links)
   properly. This is your call — it affects information architecture, so it is worth deciding
   before more pages are added here.

---

## C. The complete 301 map of the old, deleted site

An older, deeper version of the site (per-venue pages, paginated category listings) was removed and
those URLs now 404 with no redirects. That is a real ranking loss: any accumulated link equity and
any still-indexed URL is currently dead.

`vercel.json` now contains **best-effort redirects for the two documented example patterns only**:

| Old pattern | Redirects to | Status |
| --- | --- | --- |
| `/{stad}/{bedrijf}` | `/sporten-in-{stad}` | guessed from the audit's example — **verify** |
| `/{stad}` | `/sporten-in-{stad}` | guessed — **verify** |
| `/organisaties/*` | `/steden` | guessed from the audit's example — **verify** |

The city segment is **enumerated explicitly** (`almere|amersfoort|…`) rather than matched as a
wildcard. This matters: Vercel evaluates redirects *before* the filesystem, so a bare `/:a/:b`
rule would also swallow `/_astro/*` and break every stylesheet and script on the site.

**What is needed from you:** the actual list of old URLs. Best sources, in order:

1. Google Search Console → Indexing → Pages → "Not found (404)", and the Performance report
   filtered to the last 16 months (shows URLs that still get impressions/clicks).
2. Any backup, sitemap, or database dump of the old site.
3. Bing Webmaster Tools / Ahrefs / Semrush "best pages by links" if you have access.

Then the patterns above can be confirmed or replaced with a real map. **Any old URL that had inbound
links and does not map to something sensible should redirect to the closest city page, not to the
homepage** — a blanket homepage redirect gets treated as a soft 404 by Google.

---

## D. Deployment / environment — please verify in the Vercel dashboard

These could not be checked from here (the Vercel MCP connector is not authorised in this
environment, and Supabase is not reachable from the build sandbox — see the note at the bottom).

- [ ] **Env vars set for the Production environment**, not just Preview/Development:
      `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`. The build calls Supabase at build time,
      so if these are missing the deploy fails outright.
- [ ] **`www.sportinkaart.nl` is the primary domain** in the Vercel project, with the apex
      `sportinkaart.nl` attached and redirecting. `vercel.json` now also enforces apex → www at the
      application layer, but the domain-level setting is what should do the work.
- [ ] **DNS**: apex `A`/`ALIAS` and `www` `CNAME` both pointing at Vercel.
- [ ] After the first deploy of this branch, spot-check the response headers on
      `https://www.sportinkaart.nl/` — the CSP added in `vercel.json` is deliberately permissive
      (it allows `'unsafe-inline'` because the site ships inline JSON-LD, inline styles and an
      inline module script), but confirm nothing is blocked in the browser console.
- [ ] Confirm `https://www.sportinkaart.nl/favicon.ico` and `/site.webmanifest` return 200 (both
      were 404 in the audit; the files now exist in `public/`).

---

## E. Off-site work — nothing in this repo can do these

- **Store submission.** Nothing gets indexed for "sportinkaart app" until the listings exist.
- **IndexNow.** The key file is live at `public/d8b0cde5c21dfde2825a13f69c7e6ce9.txt`
  (it will be served at `https://www.sportinkaart.nl/d8b0cde5c21dfde2825a13f69c7e6ce9.txt`).
  After the deploy, ping Bing/Yandex on each publish:
  ```
  https://api.indexnow.org/indexnow?url=https://www.sportinkaart.nl/steden&key=d8b0cde5c21dfde2825a13f69c7e6ce9
  ```
  Worth wiring into a post-deploy step later; it is a no-op for Google, which ignores IndexNow.
- **Submit the sitemap** (`https://www.sportinkaart.nl/sitemap-index.xml`) in Google Search Console
  and Bing Webmaster Tools, and request re-indexing of the homepage once this branch is deployed.
- **Backlinks.** The city pages are the natural asset here: local sports federations, gemeente
  sportloketten, and the clubs themselves all have reason to link to a page listing local venues.
- **Brand-name collision: "Sportkaart".** There is an existing, similarly-named entity. You will
  keep losing navigational searches to it until the brand is disambiguated.
  **Partly done** in `56a87c8`: the `Organization` JSON-LD now carries `sameAs` for the Facebook,
  LinkedIn and Instagram profiles, which is what lets Google bind the brand name to this domain.
  Still worth doing: claim a **Google Business Profile**, and keep the name/description consistent
  across all three social profiles so they reinforce each other.

---

## F. Per-venue detail pages / real directory depth — a product decision, not a task

The audit's SXO recommendation is that the homepage is the wrong page type to rank for its target
queries, and that the site is thin: 18 city pages, each showing 12 of up to 391 venues, with no
venue-level pages and no pagination. With 1.902 venues in the database, the theoretical page count
is large.

This is genuinely the highest-ceiling SEO opportunity available and also the biggest piece of work,
so it was left alone deliberately. The main decisions before anyone builds it:

1. **Do venue pages have enough unique content to not be doorway pages?** Right now a venue has a
   name, an address and a sport list. That is thin. Google actively penalises mass-generated pages
   with no added value. Opening hours, descriptions, photos or reviews would need to come from
   somewhere first.
2. **Pagination or filtering for the city pages?** Showing 12 of 391 is the immediate, much cheaper
   win — either `/sporten-in-utrecht/pagina/2` or per-sport pages like
   `/sporten-in-utrecht/fitness`. The per-sport split is probably the better bet: it matches how
   people actually search ("sportschool Utrecht", "yoga Amersfoort") and each page has a genuine
   reason to exist. Roughly 18 cities × their top categories ≈ a few hundred pages of real intent
   coverage, without the thin-content risk of one page per venue.
3. **Who maintains it?** More pages means more stale data. The current per-city model is
   maintainable by one person; a venue-level directory probably is not, without a claim/edit flow.

Recommendation: do (2) before (1). Per-sport city pages are lower risk, reuse the existing data
layer, and would answer the audit's "wrong page type" finding directly.

---

## Minor / optional

- ~~Four unreferenced images and the two pre-Astro root HTML files are still deployed.~~ **DONE**
  in `56a87c8` — `splash-icon.png`, `sportinkaart-banner.jpg`, `sportinkaart-logo.png`,
  `logosportinkaart.jpg`, `index.html` and `waarom-section.html` were all removed. The whole
  `dist/` is now **800 KB**. Verified afterwards that no page references any deleted file and that
  every asset still referenced resolves. Note the deleted banner JPG was the source the 142 KB WebP
  hero was generated from — it remains recoverable from git history at `62c1248` if you ever need
  to re-encode it.
- `hreflang` is absent, which is correct for a Dutch-only site. Do not add empty hreflang tags.

---

### Note on how this was verified

The build sandbox could not reach `ytyljpykccckvzitwcpo.supabase.co` — the host is blocked by the
environment's network egress policy (the gateway returns 403 on CONNECT). Rather than working
around that, the real per-city counts and sport distributions were read through the authorised
Supabase MCP connection and replayed from a local fixture so `npm run build` could be verified.
Only the gitignored `.env` pointed at that fixture; no committed code was changed for it, and the
production build on Vercel talks to Supabase directly as before.

All numbers used in the site copy are the live values as of 31 July 2026: **1.902** active
locations, **18** cities, **36** sport categories. (The audit brief quoted ~1.940 and Utrecht 397;
the database says 1.902 and Utrecht 391, so the lower, real figures were used.)
