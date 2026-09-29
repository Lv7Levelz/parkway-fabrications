# SEO acquisition strategy and launch gate

_Original strategy: 27 September 2026; architecture review: 29 September 2026_

> 29 September 2026 update: the architecture review and owner-verification register in [seo-architecture-review.md](seo-architecture-review.md) supersede earlier claims of verified machinery or completed content. The owner questionnaire remains incomplete. Existing technical claims are inherited staging copy and still require sign-off.



## Research status and evidence boundary

A live SERP and current-site crawl were attempted in this build environment before the architecture was finalised. Both the browsing service and outbound HTTP were unavailable (401 from the browsing service; HTTP status `000` from the command-line request). Consequently, naming “current ranking competitors”, claiming their exact schema, or producing a reliable legacy URL inventory would be fabricated. The observations below are a **provisional gap model**, based on the recurring page types and buyer information patterns in this market, and must be refreshed with a UK/Sheffield SERP capture and crawl before production launch.

Required evidence pack at handover:

1. Export the top 10 organic results for every query in the keyword map on desktop and mobile from a Sheffield location.
2. Record URL, title, H1, word-count range, capability claims, machinery, materials, FAQs, upload journey, trust evidence, local evidence, contextual links and detected JSON-LD.
3. Crawl the current live domain and combine it with Search Console landing pages, GA organic conversions and a backlink export.
4. Only then approve redirects and any architecture change. Search results, ads and map-pack results must be recorded separately.

## Provisional competitor-gap analysis

| Buyer signal to compare | Common market pattern to verify | Parkway response in this build | Remaining evidence needed |
|---|---|---|---|
| Content depth | Short capability pages often list machines and unsupported superlatives | Each priority page explains inputs, process connections, RFQ details and visible FAQs | Benchmark top-10 depth and missing questions |
| Disclosed capability | Machinery, bed size, tonnage and material lists drive confidence | Only publicly recorded 6kW/3m laser and 4m/200t press brake details are used; unknown limits are explicitly confirmed per job | Client sign-off on materials, thicknesses, tolerances and batch range |
| Page structure | Service hero, benefits, capability list and generic CTA | Intent-specific H1, capability table, four-step buying journey, contextual links, FAQ and drawing CTA | Compare conversion patterns against ranking pages |
| FAQs | Often generic “why choose us” questions | Questions address file handoff, specification, feasibility and inspection | Validate against sales-call and Search Console query data |
| Internal links | Frequently navigation/card-led | Copy links cutting → folding → welding → fabrication → RFQ and screens → perforation → fabrication → RFQ | Run final crawl and calculate orphan/depth reports |
| Trust | Certifications, customer logos and reviews are common but often weakly evidenced | NAP, verified machinery and carefully qualified welding statements only | Obtain legal entity, certificates, GBP URL, legitimate profiles and approved reviews |
| Local relevance | City in headings/title plus address; sometimes doorway location pages | One genuine Sheffield base, South Yorkshire context and consistent NAP; no duplicate town pages | Confirm real service area from customer data |
| Drawing CTA | CAD upload or “email a drawing” is a strong commercial pattern | Every priority service has contextual DXF/STEP/PDF copy and a preselected enquiry route | Replace static mailto with secure storage, retention policy and malware scanning |
| Schema | Organization/LocalBusiness, Service and breadcrumbs are relevant; rating abuse is a risk | WebSite, WebPage, LocalBusiness, Service, BreadcrumbList and visible FAQPage only | Validate deployed URLs in Schema Markup Validator and Rich Results Test |

### Information-gain advantage

The site should win by making the RFQ easier, not by repeating claims such as “quality and service”. Priority content explains what to send, which manufacturing stage follows, and where feasibility depends on the drawing. The granulator page requests curvature, mounting, aperture and feedstock detail and explicitly avoids compatibility claims from a model name alone.

## Keyword-to-URL map

| URL | Primary commercial intent | Secondary terms | Internal-link role |
|---|---|---|---|
| `/laser-cutting.html` | laser cutting Sheffield | fibre laser cutting Sheffield; CNC laser cutting Sheffield; sheet metal laser cutting Sheffield | Entry to folding, welding, fabrication and RFQ |
| `/fabrication.html` | metal fabrication Sheffield | steel fabrication Sheffield; sheet metal fabrication Sheffield; bespoke metal fabrication | Process hub and final assembly destination |
| `/bending-folding.html` | CNC folding Sheffield | sheet metal bending Sheffield; metal folding Sheffield | Connect cut profiles to welded fabrication |
| `/welding.html` | welding Sheffield | MIG welding Sheffield; TIG welding Sheffield; fabrication welding | Connect formed parts to complete fabrication |
| `/perforated-metal.html` | perforated metal | perforated sheet metal; perforated panels | Entry to screens and fabricated products |
| `/granulator-screens.html` | granulator screens | replacement granulator screens; shredder screens; recycling screens; perforated screens for recycling equipment | Specialist resource linking perforation and fabrication |
| `/services.html` | metal fabrication services | cutting, folding, welding and specialist service overview | Discovery hub, not a substitute for service intents |
| `/contact.html` | metal fabrication quote | upload fabrication drawing; fabrication RFQ | Conversion endpoint |
| `/about.html` | Parkway Fabrications | Sheffield metal fabricator | Entity, local trust and service links |
| `/projects.html` | metal fabrication projects | fabrication examples | Future verified case-study hub only |

## Content and cannibalisation rules

- The homepage describes the business entity; it must not be optimised as a second laser or fabrication service page.
- The services page remains a concise discovery hub and links to the canonical detail page for each commercial intent.
- “Bespoke metal fabrication” belongs to the fabrication page, not a second bespoke page.
- Granulator screens owns replacement/shredder/recycling-screen intent. Perforated metal explains sheet and panel specification and links to the specialist screen page.
- Do not publish project detail pages until Parkway supplies a real brief, material, process, result and approved imagery.

## Unverified items requiring client confirmation

- Maximum/minimum material thickness, working envelope beyond published machine dimensions, tolerances and minimum/maximum batch size.
- Complete accepted CAD formats and whether STEP files enter the production workflow directly or are review-only.
- Exact materials, grades, finishing partners, inspection documentation and traceability offered for each process.
- Current certificates, standards scope and expiry; legal company name/number/VAT number.
- Granulator-machine compatibility and all wear-material claims.
- Google Business Profile URL, verified hours, service area, review permissions and legitimate social/company profiles.
- Secure upload processor, maximum file size, retention period, privacy wording and deletion workflow.

## Migration and redirect worksheet

Do not guess redirects. Populate this table from the live crawl, Search Console and backlink export. Every valuable old URL needs one direct `301` to the closest equivalent; never route all retired pages to the homepage.

| Old URL | Evidence (traffic/backlinks/indexed) | New URL | Status | Owner |
|---|---|---|---|---|
| _Await live crawl_ | _Await exports_ | _Map by intent_ | Pending | SEO/developer |

## Production quality gate

- [ ] Refresh competitor research with dated Sheffield SERPs and archive evidence.
- [ ] Crawl the current website; merge URL inventory with Search Console, analytics and backlinks.
- [ ] Approve the keyword map; check every indexable page has one H1, unique title/description and distinct intent.
- [ ] Approve every capability statement and resolve all unverified items above.
- [ ] Implement and test direct server-side 301 redirects; reject chains, loops and soft 404s.
- [ ] Crawl staging with JavaScript on and off: no broken internal links, orphan pages, mixed content or accidental noindex.
- [ ] Confirm self-referencing canonicals and the production hostname/protocol.
- [ ] Compare robots rules, XML sitemap and canonical indexability; exclude admin, APIs, private files and confirmation states.
- [ ] Validate JSON-LD; ensure FAQ markup exactly matches visible content; never add fabricated ratings.
- [ ] Check NAP everywhere: Parkway Fabrications, 4 Colwall Street, Sheffield, S9 3WP, 0114 242 2733.
- [ ] Check descriptive image filenames, useful alt text, intrinsic dimensions, responsive variants and compression using genuine approved images.
- [ ] Run Lighthouse and field-test LCP, CLS and INP; inspect font, image and cache headers at the final host.
- [ ] Test the secure drawing-upload journey, conversion events and privacy/retention behaviour.
- [ ] Verify Google Business Profile consistency and legitimate company/social links.
- [ ] Submit the final sitemap in Google Search Console and Bing Webmaster Tools after DNS/redirect checks.

## Monthly SEO programme

Monitor Search Console and Bing coverage, crawl errors, Core Web Vitals, query/page trends, organic landing-page conversions and drawing/RFQ conversions. Review competitor changes and buyer questions, improve contextual links, refresh decaying pages, and publish only verified case studies. Track Google Business Profile consistency and newly approved reviews without marking up self-serving aggregate ratings.
