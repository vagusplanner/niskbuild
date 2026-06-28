# NiskBuild Production Deployment Guide

Deploy the NiskBuild Next.js app to **Vercel** with a **production Supabase** project. This guide covers environment variables, Vercel setup, database migrations, and post-deploy verification.

---

## Prerequisites

- A [Supabase](https://supabase.com) **production** project (separate from local/dev)
- A [Vercel](https://vercel.com) account
- GitHub repo access for `nisk-build-core`
- (Optional) Stripe account with live-mode keys for billing and marketplace
- (Optional) A separate deployment for **Vagus Planner** (`apps/vagus-planner`) — see [Vagus Planner in production](#vagus-planner-in-production)

---

## 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. Use **Production** (and Preview/Development if you want parity).

### Required — Supabase

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Supabase project URL, e.g. `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Supabase **anon** public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only | Supabase **service role** key — server-only; never expose to the client |

> **Security:** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Mark it **Production** only in Vercel; do not prefix with `NEXT_PUBLIC_`.

### Required — Admin access

| Variable | Scope | Description |
|----------|-------|-------------|
| `SUPPORT_EMAIL` | Production | Inbox for support ticket notifications (not used for admin auth) |

Admin access is controlled by **`is_platform_owner()`** in Supabase — register your user in `firstparty.platform_owners` (see migrations). No admin email env vars are required for authentication.

### Required — App URL

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_APP_URL` | Production | Canonical site URL, e.g. `https://niskbuild.com` — used for Stripe redirects, emails, preview links |

### Required — Vagus Planner embed (if VP is deployed)

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_VAGUS_PLANNER_URL` | Production | Public URL of the built Vagus Planner app, e.g. `https://vp.niskbuild.com` |

Without this, `/vagus-planner` and the builder preview default to `http://localhost:5175`.

### Optional — Base44 legacy (Vagus Planner only)

Only needed if Vagus Planner still calls Base44 cloud functions. For the Supabase-backed setup in this repo, these are **usually not required**.

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_BASE44_APP_ID` | VP build env | Base44 app ID (set on the **Vagus Planner** Vercel project, not NiskBuild) |
| `VITE_BASE44_APP_BASE_URL` | VP build env | Base44 API base URL |
| `VITE_BASE44_FUNCTIONS_VERSION` | VP build env | Functions version string |

Vagus Planner **does** need these at **build time** on its own deployment:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Same as `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

### Recommended — Billing & marketplace

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe **live** secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `POST /api/webhooks` |
| `NEXT_PUBLIC_STRIPE_*` | Price IDs per tier (see `lib/stripe-price-ids.ts`) |

Configure the Stripe webhook endpoint:

```
https://<your-domain>/api/webhooks
```

Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`.

### Recommended — AI & email

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Cloud AI generation |
| `ANTHROPIC_API_KEY` | Cloud AI generation |
| `TOGETHER_API_KEY` | Fallback AI provider |
| `RESEND_API_KEY` | Transactional email |
| `EMAIL_FROM` | Sender, e.g. `NiskBuild <support@niskbuild.com>` |
| `CRON_SECRET` | Bearer secret for `/api/cron/email-lifecycle` and VP reminders (Vercel Cron) |
| `RESEND_WEBHOOK_SECRET` | Resend webhook **Signing secret** (`whsec_...`) from Resend → Webhooks — used for Svix verification on `/api/webhooks/resend` |

### Optional — Observability & integrations

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Error tracking |
| `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics |
| `GOOGLE_PLACES_API_KEY` | Google Business import |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub integration |

---

## 2. Vercel deployment steps

### 2.1 Connect GitHub

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import the **nisk-build-core** repository.
3. **Root directory:** leave as repo root (where `package.json` and `app/` live).
4. **Framework preset:** Next.js (auto-detected).
5. **Build command:** `npm run build` (default).
6. **Output:** Next.js default (no custom output directory).

### 2.2 Set environment variables

1. Vercel project → **Settings → Environment Variables**.
2. Add all [required variables](#1-environment-variables) for **Production**.
3. Add Stripe, AI, and email keys before enabling paid features.

### 2.3 Configure Supabase Auth for production

In **Supabase → Authentication → URL configuration**:

| Setting | Value |
|---------|-------|
| Site URL | `https://<your-domain>` |
| Redirect URLs | `https://<your-domain>/auth/callback`, `https://<your-domain>/**` |

### 2.4 Deploy

1. Click **Deploy** (or push to the connected production branch, usually `main`).
2. After deploy, set a custom domain under **Settings → Domains**.
3. Update `NEXT_PUBLIC_APP_URL` to match the final domain and redeploy if needed.

### 2.5 (Optional) Deploy Vagus Planner separately

See [Vagus Planner in production](#vagus-planner-in-production).

---

## 3. Production Supabase setup

Use a **dedicated production** Supabase project. Do not point production Vercel at your local/dev database.

### 3.1 Run migrations

Open **Supabase → SQL Editor** and run migrations **in order**. Each file is in `supabase/`.

#### Layer foundation (run first)

1. `firstparty-marketplace-layers-migration.sql` — creates `firstparty` + `marketplace` schemas, RLS, `is_platform_owner()`

#### Vagus Planner follow-ups (after layer foundation)

2. `vp-user-settings-edition-migration.sql`
3. `vp-billing-notifications-migration.sql`
4. `vp-reflections-expenses-prayer-chats-migration.sql`
5. `vp-rls-grants-fix-migration.sql`
6. `vp-deployments-storage-migration.sql`

#### NiskBuild platform (public schema — additive)

7. `profiles-settings-migration.sql`
8. `profile-preferences-migration.sql`
9. `security-layers-migration.sql`
10. `monetization-guards-migration.sql`
11. `support-tickets-migration.sql`
12. `retention-conversion-migration.sql`
13. `visual-edit-migration.sql`
14. `analytics-region-migration.sql`
15. `public-analytics-telemetry-migration.sql`
16. `project-versions-migration.sql`
17. `project-seo-migration.sql`
18. `project-integrations-migration.sql`
19. `compiled-applications-migration.sql`
20. `pwa-export-migration.sql`
21. `blueprint-migration.sql`
22. `google-places-migration.sql`
23. `agent-conversations-migration.sql`
24. `agent-escalations-migration.sql`
25. `app-import-pipeline-migration.sql` — external app import registry (`firstparty.app_imports`)
26. `niskbuild-platform-storage-migration.sql` — `imported-apps` + `project-exports` buckets, storage paths on import/export jobs
27. `docs-hub-migration.sql` — in-app documentation tables (`doc_articles`, `doc_feedback`)
28. `docs-hub-seed.sql` — documentation article content (run after #27)
29. `retention-email-churn-migration.sql` — lifecycle email log, NPS, churn tracking (`last_build_at`)
30. `admin-email-hub-migration.sql` — email send history columns, open/click tracking, `feature_usage`

> If a migration fails with “already exists”, it is safe to skip that statement — migrations are written to be idempotent where possible.

### 3.2 Expose schemas

**Supabase → Project Settings → API → Exposed schemas**

Enable:

- `public`
- `firstparty`
- `marketplace`

Save and wait a minute for API cache to refresh.

### 3.3 Register platform owner

Platform admin pages (`/admin/tenants`, `/admin/apps`, `/admin/marketplace`, `/admin/layer-overview`) use `is_platform_owner()`, not email alone.

Run in SQL Editor (replace email):

```sql
insert into firstparty.platform_owners (user_id)
select id from auth.users where lower(email) = lower('your-admin@example.com')
on conflict (user_id) do nothing;
```

The user must **sign up once** in production so a row exists in `auth.users` before this insert.

### 3.4 Verify storage

Confirm the **`vp-deployments`** bucket exists (created by `vp-deployments-storage-migration.sql`) under **Storage** if you use VP deploy from the builder.

### 3.5 Schedule email lifecycle cron

Daily POST to `/api/cron/email-lifecycle` with header `Authorization: Bearer $CRON_SECRET`. Options:

- **Vercel Cron** — add to `vercel.json` (or Vercel dashboard → Cron Jobs): `0 9 * * *` → `https://your-domain.com/api/cron/email-lifecycle`
- **Supabase Edge Function** — mirror the VP reminders pattern in `supabase/functions/vp-send-reminders`

Also enable Stripe webhook event **`invoice.payment_failed`** on the production endpoint.

---

## 4. Post-deployment checks

### 4.1 Verify admin access

| Check | How |
|-------|-----|
| Platform owner pages | Sign in → `/admin/layer-overview` — should load, not redirect to login |
| Layer admin links | `/admin/tenants`, `/admin/apps`, `/admin/marketplace` |
| NavBar VP Studio link | Visible only for platform owners |

### 4.2 Test Vagus Planner

| Check | How |
|-------|-----|
| VP app loads | `/vagus-planner` — iframe should load `NEXT_PUBLIC_VAGUS_PLANNER_URL`, not localhost |
| Auth | Sign in; VP should receive Supabase session via shared project |
| Edition toggle | Account → Standard / Islamic Edition saves without error |
| Builder studio | Admin → `/builder/vagus-planner` — preview and deploy |
| Data | Tasks/settings read/write against `firstparty.*` tables |

### 4.3 Test marketplace

| Check | How |
|-------|-----|
| Browse | `/marketplace` — listings load (DB or in-memory fallback) |
| Purchase | Stripe checkout → webhook → `marketplace.purchases` + `profiles.purchased_templates` |
| My Purchases | Marketplace → **My Purchases** tab |
| Admin | `/admin/marketplace` — approve/feature listings |

### 4.4 Smoke test core platform

- Sign up / login / logout
- `/builder` — generate a project
- `/pricing` — Stripe checkout (test mode first, then live)
- `/dashboard` — profile and settings load
- `/admin/churn` — churn risk table (platform owner only); badge on Admin nav when users are inactive 14+ days
- NPS survey at `/nps` (linked from day-14 drip email)

---

## Vagus Planner in production

NiskBuild (Next.js) and Vagus Planner (Vite) are **separate apps**.

### Option A — Separate Vercel project (recommended)

1. New Vercel project → root directory: `apps/vagus-planner`.
2. Build command: `npm run build`  
   Output directory: `dist`
3. Set build env:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy to e.g. `vp.niskbuild.com`.
5. Set on **NiskBuild** production:
   - `NEXT_PUBLIC_VAGUS_PLANNER_URL=https://vp.niskbuild.com`

### Option B — Builder deploy to Supabase Storage

Use **VP Studio → Deploy** to upload a static bundle to the `vp-deployments` bucket. Preview URL is returned by the deploy API — suitable for staging, not always ideal as the primary production URL.

### Base44 variables

Skip `VITE_BASE44_*` unless you rely on Base44-hosted functions. This repo uses `base44-compat.js` with Supabase for data.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| `is_platform_owner()` always false | Run platform owner insert; confirm signed-in user UUID |
| VP iframe blank / localhost | Set `NEXT_PUBLIC_VAGUS_PLANNER_URL` and redeploy NiskBuild |
| VP API errors on `firstparty` | Expose `firstparty` schema in Supabase API settings |
| Marketplace empty | Seed `marketplace.listings` or rely on in-memory fallback |
| Stripe webhook 400 | Match `STRIPE_WEBHOOK_SECRET` to the endpoint signing secret |
| Auth redirect loop | Add production URL to Supabase redirect allow list |

---

## Quick reference — minimum production env

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Admin access via platform owner registration in Supabase (see §3.3)

# Site
NEXT_PUBLIC_APP_URL=https://niskbuild.com

# Vagus Planner (if deployed separately)
NEXT_PUBLIC_VAGUS_PLANNER_URL=https://vp.niskbuild.com
```

After first deploy: run migrations → expose schemas → register platform owner → run post-deployment checks above.
