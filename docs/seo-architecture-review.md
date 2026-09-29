# Parkway SEO architecture — review handover

Date: 29 September 2026. Base: `f8f14f418595e218b7c373a85e7ac9e229891ae6`.
Branch: `codex/parkway-seo-architecture`. Review only; do not merge or publish without approval.

## Repository findings

The repository is a flat static frontend with a separate Node RFQ API and Supabase migrations. The static build copies root HTML/CSS/JS and assets; no framework or new runtime dependency is needed. Existing CI runs backend tests, source checks and a staging build audit. There is no AGENTS.md in the checkout.

Six dedicated service pages already existed, but their headers differed from the main site and hub/footer links mostly targeted Services anchors. Sectors consisted of unlinked image cards. Projects already described concept imagery, but individual cards could still be mistaken for completed work. A capabilities hub was absent. Several inline grid column declarations overrode the intended mobile breakpoints.

The actual repository's navy/blue/white design is authoritative; conflicting historic design descriptions were not applied. Existing logos, images, homepage sections, colours and animations are retained. Changes to navigation, descriptive service H1s and the removal of internal SEO commentary are limited to discoverability, accessibility and buyer clarity. Browser checks also justified narrow-screen fixes for inherited homepage grid overflow, large headings and Contact grid sizing. These are responsive presentation changes only; RFQ behaviour and form markup remain untouched.

## Implemented hierarchy

- Home (`index.html`)
- Services (`services.html`, independently clickable)
  - Laser Cutting (`laser-cutting.html`)
  - CNC Bending & Folding (`bending-folding.html`)
  - Welding (`welding.html`)
  - Granulator Screens (`granulator-screens.html`)
  - Perforated Metal (`perforated-metal.html`)
  - Bespoke Fabrication (`fabrication.html`)
- Sectors (`sectors.html`): anchored enquiry guides for the eight existing categories
- Capabilities (`capabilities.html`): six anchored verification registers
- Our Work (`projects.html`): explicitly illustrative gallery and an unfilled case-study structure
- About, Contact and the existing Get a Quote destination

There is one service URL per intent. No separate bespoke/metal-fabrication duplicate, URL migration or new location pages. Existing Services anchors remain valid for inbound links. Breadcrumbs express Home → Services → Service without changing established filenames.

## Relationship model

These are proposed enquiry routes, not assertions of sector experience or process suitability.

| Service | Sector guide | Capability record | Project evidence |
|---|---|---|---|
| Laser Cutting | Manufacturing | `capabilities.html#laser` | Case-study template, pending real evidence |
| CNC Bending & Folding | Manufacturing | `capabilities.html#folding` | Same |
| Welding | Construction | `capabilities.html#welding` | Same |
| Granulator Screens | Recycling | `capabilities.html#granulator` | Same |
| Perforated Metal | Architectural | `capabilities.html#perforated` | Same |
| Bespoke Fabrication | General Industry | `capabilities.html#bespoke` | Same |

Each service links in its main content to its sector guide, capability record and project template. Capability records link back to their services and sectors. Sector guides link to services, capabilities and project evidence. Projects link to all three hubs. Other existing sector categories route to bespoke-fabrication discussions pending owner confirmation.

When genuine evidence arrives, add a substantive case study, link it from the relevant service, sector and capability, and replace the template links for that relationship. Do not generate a case-study URL merely to fill a card.

## New and changed files

New: `capabilities.html`, `navigation.js`, `scripts/check_architecture.py`, this handover.

Updated: shared navigation/footer links and skip targets across all 14 existing public HTML files; Services, Sectors and Projects content structures; six service H1s, breadcrumbs and contextual relationships; `styles.css`; `sitemap.xml`; `scripts/seo_audit.py`.

`script.js` remains unchanged, including its existing mobile toggle and all RFQ behaviour. `navigation.js` adds native disclosure handling, Escape/outside-click/focus-leave behaviour, accessible toggle labels and viewport reset. Navigation remains usable without JavaScript. Native details/summary supplies the service disclosure's expanded state.

## Owner verification register

New content does not assert machinery, tolerances, thickness capacity, lead times, certifications, customer names or completed projects. Existing claims have not been independently verified during this work. Service pages and hubs explicitly flag their inherited claims as awaiting owner approval.

Resolve before publication:

- Service scope, accepted materials/grades, in-house versus partner processes and finishing options.
- Machine identity, power, bed length, tonnage, operating envelope, thickness, tolerance and batch limits. Existing 6kW/3m and 4m/200t wording is inherited staging content, not newly verified evidence.
- Existing granulator claims: 15mm panels, wearplate grades, machine-make compatibility, extended wear life and call-off availability.
- Welding process scope, EN1090/ISO references, inspection claims and current certificate scope/expiry. Do not infer certification from wording about coded welders.
- CAD/design scope and existing SOLIDWORKS references; approved file-handling guidance.
- Actual sector experience and approval of the proposed relationships above.
- Real case-study brief, services delivered, technical requirements, outcome, project photography, customer consent and publication rights.
- Photo provenance: existing concept images must never become evidence of actual Parkway machinery or completed jobs.
- Homepage/About inherited marketing claims, service-area claims, company history and all existing structured-data business details.

The verification notices are staging review aids. Replace them with approved factual content before any production-indexing approval; do not simply remove the notices and retain unverified claims. The case-study template has no invented example values.

## SEO opportunities and deferred work

1. Complete owner evidence first, then improve technical service copy with distinct, useful answers and approved specifications.
2. Publish substantive sector pages only when real sector problems, relevant processes and evidence justify them. Anchor sections avoid thin pages now.
3. Build genuine case studies with reciprocal contextual links and approved photography.
4. Audit the existing live-domain URL inventory and Search Console before changing filenames or creating redirects. Existing canonicals/URLs remain unchanged; the new capability URL follows the same convention.
5. Create responsive derivatives of approved imagery. Several existing large WebPs and tiny project thumbnails need an image-quality/performance pass; this change preserves imagery and lazy-loads hub images below text heroes.
6. Measure LCP, CLS and INP on the actual staging host and with field data where available. No Core Web Vitals score is claimed from source inspection.
7. Existing service-detail bodies contain older layout class names not covered by the current stylesheet. A coordinated visual consistency pass can address these after explicit design review; this task standardises navigation only.

No competitor/ranking claims are made: this is a repository architecture review, not fresh SERP research. No schema for invented projects, reviews, certificates or machinery is added. Breadcrumb JSON-LD matches the visible hierarchy.

## Protected scope

No changes to `backend/`, `supabase/`, `render.yaml`, `public-config.js`, `script.js`, environment configuration or RFQ form markup. The Contact page changes only its shared navigation/footer, main ID and skip link. No requests were submitted, no Render settings changed, no live services reconfigured, and no deployment or merge was performed.

## Validation

- `npm test`: all 35 existing tests passed.
- `npm run check`: passed, including the extended architecture audit.
- Staging build plus `python scripts/seo_audit.py --root dist --mode staging`: passed.
- New audit checks all 15 root HTML pages, including utility pages, for exact staging `noindex,nofollow`, six service dropdown links, primary navigation, a main/skip landmark, duplicate IDs and broken fragments. It also checks reciprocal hub/service links and the service → sector → capability → project routes.
- The original audit covers 13 non-utility pages for unique title/description, one H1, canonicals, sitemap coverage, image dimensions/alt text, internal targets and JSON-LD syntax.
- `node --check navigation.js` and `git diff --check`: passed.
- Complete RFQ form markup and protected scripts/config compared byte-for-byte against the base commit; unchanged.
- Browser validation: recovered headless Chromium through a temporary package after the standard browser download failed. All 15 public pages were checked at 1440, 1100, 768, 390 and 320px widths with no horizontal overflow or JavaScript page errors. Verified six visible dropdown links, mobile toggle state, Escape dismissal and no-JavaScript navigation. Inspected desktop/mobile navigation and the full capabilities-page screenshots. This is local browser QA, not measured field Core Web Vitals.

## Review checklist

- Open Services on desktop and a narrow mobile viewport; the label must navigate and the adjacent arrow must independently disclose six links.
- Tab to the disclosure and open it using Enter/Space; Escape closes it and restores focus. Escape again closes an open mobile menu.
- Check outside-click and focus-leave dismissal, orientation changes, no-JavaScript navigation and absence of horizontal scrolling.
- Review Services/Sectors/Capabilities/Our Work on mobile, confirm all sector anchors and evidence links work, and confirm there are no implied completed projects.
- Obtain owner approval and complete the existing production launch gates before removing staging indexing restrictions.
