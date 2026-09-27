# Parkway Fabrications — fixed GitHub upload build

This build is intentionally FLAT: all HTML, CSS, JS and image files sit in the repository root.

Why: the previous live build had HTML paths such as `assets/cap-laser.jpg`, while the JPGs had been uploaded into the GitHub repository root. That caused the broken images visible on the live site.

## Upload
Extract the ZIP and upload EVERYTHING inside it together to the root of the GitHub repository.
You do not need to create an `assets` folder.

## Search visibility
The public pages are configured for production indexing on
`https://www.parkwayfabrications.co.uk/`. Utility pages remain `noindex`.
Before deploying to any preview or staging hostname, protect that environment
at the server level and do not expose the production sitemap there.


## Live-domain transition
At production handover:
- deploy to Parkway Fabrications' real domain;
- preserve existing high-value URLs where possible;
- 301 redirect any URLs that change;
- update canonical URLs and sitemap.xml;
- submit/verify the live property in Google Search Console;
- preserve existing ranking signals during migration.

The research boundary, keyword map, outstanding client confirmations,
migration worksheet and launch checklist are maintained in
[`docs/seo-strategy.md`](docs/seo-strategy.md). Run `python
scripts/seo_audit.py` after every content or template change.

## Verified public details used
- Phone: 0114 242 2733
- Address: 4 Colwall Street, Sheffield, S9 3WP
- Parkway's current welding page states EN1090 coded welders.
- Parkway also states that every weld receives a 100% post-weld quality check to meet ISO standards.
- Do not add ISO 9001, CE/UKCA, ISO 3834 or other certification logos unless Parkway supplies current certificates.

## RFQ backend and administration

The production RFQ API, private upload flow and protected administration are in
`backend/`; database and storage migrations are in `supabase/migrations/`.
See [`docs/backend-deployment.md`](docs/backend-deployment.md) for the complete
local, staging and production deployment runbook. No service credentials belong
in this repository; copy `.env.example` locally and use host-managed secrets.
