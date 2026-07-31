# SEO followups that need the owner

Written 31 July 2026, alongside the automated fixes on `claude/city-pages-seo-162413`
(see `docs/superpowers/plans/2026-07-31-seo-improvements.md` for what *was* done).

Since then you have closed several of these yourself. Updated after `56a87c8` (B(i), part of E,
the asset/dead-code cleanup), `0d3fd53` (the per-sport-pages half of F) and `f0784d8` (B(ii) —
privacy policy merged onto the main domain, which leaves two new points of its own).

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

## B. Privacy policy & terms

The audit flagged missing `/privacy` and `/voorwaarden`. No draft policy was ever written here —
you already had one on a separate project, and two competing versions of a legal document is worse
than one. Both original actions are now resolved:

1. ~~**Short term.** Link the existing privacy policy from the footer.~~ **DONE** — first as an
   external link in `56a87c8`, then superseded by the merge below.
   Still open: **terms/voorwaarden**, if they live at a separate URL — send it and it gets linked too.
2. ~~**Decision needed.** Should that separate privacy/legal project be merged into this site?~~
   **DECIDED AND DONE** in `f0784d8` — the policy now lives at `/privacy` on the primary domain
   (legal text ported verbatim) and the footer links there on all 183 pages. No link to the old
   subdomain remains anywhere in the build.

**Two things this merge leaves open:**

- **Redirect `privacy.sportinkaart.nl` → `https://www.sportinkaart.nl/privacy` (301).** Flagged in
  your own commit message, and it matters: until it is done the same policy is served from two
  hostnames, which is textbook duplicate content. Whichever one Google picks is out of your hands,
  and any inbound links to the subdomain currently pass nothing to the main domain. A 301 at the
  DNS/hosting level for the subdomain is the clean fix. If the subdomain has to stay live for some
  other reason, the fallback is a `<link rel="canonical" href="https://www.sportinkaart.nl/privacy">`
  on the subdomain page — but the redirect is strictly better.
- **The policy body is English on a `lang="nl"` page.** `/privacy` has ~716 words of English text
  (`"Privacy Policy"`, `"Last updated: January 2026"`, `"Information we collect"`) inside
  `<html lang="nl">`, with no `lang` override anywhere in the body — while its own `<title>` and
  meta description are Dutch. Two consequences: screen readers will read English words using Dutch
  pronunciation rules, and it is the only mixed-language page on an otherwise wholly-Dutch site.
  This was deliberately **not** changed here, because it is your call and it touches a legal
  document:
  - *Translate it to Dutch* — best for users and consistency, but the Dutch text then becomes the
    operative policy, so it needs to be reviewed as legal text, not just translated.
  - *Keep it English and label it* — add `lang="en"` to the `<main class="legal">` element in
    `src/pages/privacy.astro`. One attribute, no legal wording touched, fixes the accessibility
    and language-signal problem immediately. Sensible as an interim step even if you plan to
    translate later.

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
2. ~~**Pagination or filtering for the city pages?** Showing 12 of 391 is the immediate, much
   cheaper win — per-sport pages like `/sporten-in-utrecht/fitness`.~~ **DONE** in `0d3fd53`:
   **162 per-sport pages**, gated at ≥3 locations so none of them is thin, each listing *all*
   venues for that sport (no 12-cap), with Breadcrumb + ItemList JSON-LD and related-sport links.
   The build now emits **182 pages**. This answers the audit's "12 of 391" and "wrong page type"
   findings directly.
3. **Who maintains it?** More pages means more stale data. The current per-city model is
   maintainable by one person; a venue-level directory probably is not, without a claim/edit flow.

**What is left of item F:** only (1), the per-venue detail pages, and (3), the maintenance
question. The cheap, high-intent win has been taken. Before building venue pages, note the
thin-content risk in (1) is unchanged — a venue still has only a name, an address and a sport list.

Two things worth watching now that the per-sport pages exist:
- **Slug collisions.** `sportSlug()` strips accents and non-alphanumerics, so two distinct
  categories could in principle collapse to the same URL. None do today (verified: all 162
  canonicals are unique), but it is worth re-checking whenever a new sport category is added.
- **The stated count matches the list** because no venue currently repeats a sport within its
  `sport_nl` array (verified against the live database, 0 rows). If duplicate or casing-variant
  tags are ever introduced on one venue, the "vind je N locaties" line would overcount relative
  to the list below it. Cheap guard if you want one: derive the heading count from
  `locations.length` rather than from the aggregated tag count.

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
