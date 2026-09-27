# RFQ backend deployment runbook

## Architecture and trust boundary

The approved static frontend remains framework-free. Only `contact.html` loads the small RFQ integration in `script.js`; no admin code is shipped on public pages. A Node 20 HTTP API is deployed on Render. It talks to Supabase REST, Auth and a **private** Storage bucket with the service-role key, which never enters browser code. Resend sends transactional mail. Cloudflare Turnstile protects public submissions. The admin application is served by the API at `/admin/`, authenticates against Supabase Auth, and uses signed, `HttpOnly`, `SameSite=Strict`, production-secure cookies.

The API always returns `X-Robots-Tag: noindex, nofollow`. Static staging builds replace public robots metadata with `noindex,nofollow` and block crawling. A production build requires an explicit approval flag.

## Local development

1. Install Node.js 20 or newer. There are no runtime npm dependencies; run `npm test` immediately.
2. Copy `.env.example` to `.env` and enter development project values. Never commit `.env`.
3. Apply migrations using `supabase db push` from a linked Supabase CLI project, or paste the files in `supabase/migrations/` into the Supabase SQL editor in filename order.
4. Load environment values in the shell (`set -a; . ./.env; set +a`) and run `npm start`.
5. Serve the static site separately, for example `python -m http.server 8000`. Set `FRONTEND_ORIGIN=http://127.0.0.1:8000`, `APP_URL=http://127.0.0.1:3000`, then build the static configuration with `python scripts/build_frontend.py --mode staging --api-url http://127.0.0.1:3000` and serve `dist/`.

## Supabase database and private storage

1. Create separate Supabase projects for staging and production.
2. Apply `202609270001_initial_rfq.sql`, then `202609270002_retention.sql`.
3. Confirm `enquiries`, `enquiry_files`, `enquiry_audit` and `notification_jobs` have RLS enabled and no policies accessible to `anon` or ordinary `authenticated` users.
4. In Storage, confirm bucket `rfq-private` exists, **Public bucket is off**, the 10 MB object limit is present and no public read policy exists. If a different bucket name is required, change the migration bucket id and `SUPABASE_STORAGE_BUCKET` together before deployment.
5. The `create_enquiry` RPC obtains references from a PostgreSQL sequence inside the insert. The unique constraint is the final guard. PostgreSQL sequences do not roll back, so a failed/deleted enquiry cannot cause a reference to be reused.
6. The retention migration only identifies expired, archived records. Deletion is intentionally not automatic: approve a retention period and backup policy, then implement a scheduled worker that removes private objects before deleting returned database rows. `DATA_RETENTION_DAYS` is the configured policy input, not an active deletion promise.

## Supabase authentication and first administrator

1. In Authentication settings, disable open public sign-ups unless Parkway has a separate requirement for them.
2. Create an admin user from **Authentication → Users → Add user**, using an individual Parkway-controlled address and a strong temporary password.
3. Add the admin role from a secure SQL Editor session, substituting the actual email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'approved-admin@example.com';
```

4. Require the user to set a unique password. Add and remove administrators through Supabase Auth; never put credentials in source or browser storage.
5. Test that a user without `app_metadata.role = admin` receives `401` from `/admin/api/enquiries`.

## Resend email

1. Verify Parkway's sending domain in Resend and add the required DNS records.
2. Create a restricted production API key and set `RESEND_API_KEY` only in Render.
3. Set `EMAIL_FROM` to the verified sender and `NOTIFICATION_EMAIL` to the Parkway mailbox that receives RFQs.
4. Submit a test RFQ and verify both the customer confirmation and Parkway notification. The email contains no storage URL; the Parkway message links to authenticated admin.
5. Failed sends remain in `notification_jobs` as `RETRY`. The in-process worker atomically claims due jobs and retries them. For multi-instance scale, move the same claim RPC to a dedicated Render worker or scheduled job.

## Cloudflare Turnstile

1. Create separate Turnstile widgets for staging and production with only their respective frontend hostnames.
2. Put the site key in `TURNSTILE_SITE_KEY` and secret in `TURNSTILE_SECRET_KEY` on the API service.
3. The browser receives only the site key through `/api/public-config`; verification occurs server-side with the requester IP.
4. Do not launch with the secret blank. Blank keys are supported only to keep automated/local development deterministic.

## Render backend

1. Create the service from `render.yaml` or use Node runtime, build command `echo "No dependency build required"`, start command `npm start`, and health check `/api/health`.
2. Configure every value in `.env.example`. Use comma-separated exact origins in `FRONTEND_ORIGIN` if both an approved staging and production frontend must call one temporary API. Do not add `*`.
3. Set `APP_URL` to the exact HTTPS API origin. Keep `TRUST_PROXY=true` on Render so rate limiting and Turnstile use the forwarded client IP.
4. Confirm Render health, then request `/api/health`, `/api/public-config`, `/admin/`, and an unauthenticated `/admin/api/enquiries`. The final request must be `401`; all responses must include `X-Robots-Tag: noindex`.
5. Keep one instance unless the notification worker is separated; the database claim is safe across workers, but operational logs and rate limiting should move to shared infrastructure before high-volume horizontal scaling.

## Static frontend and indexation

1. For GitHub Pages staging, run `python scripts/build_frontend.py --mode staging --api-url https://STAGING-API.example` and deploy only `dist/`. Verify the generated pages contain `noindex,nofollow` and generated `robots.txt` contains `Disallow: /`.
2. Preserve password/access controls on staging where the host supports them. Robots directives are not access control.
3. After explicit launch approval, run `python scripts/build_frontend.py --mode production --approve-production-indexing --api-url https://PRODUCTION-API.example` and deploy only `dist/` to the production host.
4. If frontend and API share an origin through a reverse proxy, use that origin for `apiBase` (or an empty value) and route `/api/*` to Render. Otherwise the explicit CORS origin must exactly match the static origin.
5. Re-run `python scripts/seo_audit.py` against source and crawl the deployed result before switching DNS.

## WhatsApp

Set `WHATSAPP_NUMBER` to a verified business-owned number in international digits with no `+` or spaces. The API creates the `wa.me` URL and approved prefilled message. If the value is blank, the contact control remains hidden. No number is present in source.

## Deployment order and acceptance

1. Create staging Supabase; apply migrations; inspect private bucket and RLS.
2. Create a staging Auth administrator.
3. Configure/verify Resend and Turnstile staging resources.
4. Deploy the Render API with staging secrets and exact CORS origin.
5. Build and deploy the noindex staging frontend.
6. Test valid and rejected files, success reference, both emails, admin filters/detail/status/download, logout, CORS and rate limiting in a real browser.
7. Obtain privacy wording, retention-period and production-indexation approval.
8. Repeat with separate production Supabase/Auth/Resend/Turnstile credentials.
9. Build production only with the approval flag, deploy, run the SEO launch gate, then submit the sitemap.

## Required environment values

See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY` and `SESSION_SECRET` are server-only secrets. `SUPABASE_ANON_KEY` is also kept server-side here because login is brokered by the backend. `WHATSAPP_NUMBER` may be blank. For production, `RESEND_API_KEY`, email settings and both Turnstile keys are operationally required even though local tests can run without them.

## Not yet production-ready

The code is ready for staging browser/backend testing, not a production-readiness claim. Production still requires real service provisioning, migration execution, storage/RLS inspection, administrator creation, sender-domain verification, Turnstile hostname configuration, end-to-end file tests, privacy/retention approval, monitoring/alerting, backup confirmation and a deployed security review. A malware scanner is an explicit future hook: new objects are isolated under the private `unscanned/` prefix, file rows have scan status fields, and downloads are forced as attachments, but content scanning and quarantine promotion are not yet connected. At larger scale, use Redis/managed edge rate limiting and a dedicated notification worker.
