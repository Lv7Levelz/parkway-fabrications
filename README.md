# Parkway Fabrications — fixed GitHub upload build

This build is intentionally FLAT: all HTML, CSS, JS and image files sit in the repository root.

Why: the previous live build had HTML paths such as `assets/cap-laser.jpg`, while the JPGs had been uploaded into the GitHub repository root. That caused the broken images visible on the live site.

## Upload
Extract the ZIP and upload EVERYTHING inside it together to the root of the GitHub repository.
You do not need to create an `assets` folder.

## Search visibility
Source and staging pages remain `noindex`; source robots.txt blocks crawling. Use the staging build by default. Only an explicitly approved production build enables indexing on `https://www.parkwayfabrications.co.uk/`. Utility pages remain `noindex`. Deploy only the generated `dist/` directory.


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

The staging RFQ API, private upload flow and protected administration are in
`backend/`; database and storage migrations are in `supabase/migrations/`.
See [`docs/backend-deployment.md`](docs/backend-deployment.md) for the complete
local, staging and production deployment runbook. No service credentials belong
in this repository; copy `.env.example` locally and use host-managed secrets.


## Preservation and backend fixes

The public presentation is based on main at `a58114dd04bceb1a0ff602cb6c7e9cba935f839e`: original public page bodies and CSS are retained. Visible exceptions are the functional enquiry form (drawings, privacy acknowledgement, security challenge and status feedback) and an accurate staging privacy notice. Metadata and image dimensions do not change the intended presentation.

Apply migration `202609270003_finalize_enquiries.sql` before starting this server version. RFQs are finalised and notifications queued in one transaction; only the worker sends claimed jobs. Failed finalisation returns an error and leaves the record for operator investigation rather than falsely reporting receipt. Downloads require scan status `CLEAN`; no scanner is yet connected, so new drawings deliberately remain unavailable to download. Do not mark files clean without a trusted scanner/verifier.

Run `npm test` and `npm run check`. Build staging with `python3 scripts/build_frontend.py --mode staging --api-url https://YOUR-STAGING-API`, then audit it with `python3 scripts/seo_audit.py --root dist --mode staging`. Actual service configuration, migration execution, scanner integration and deployed browser testing are still required before launch.
