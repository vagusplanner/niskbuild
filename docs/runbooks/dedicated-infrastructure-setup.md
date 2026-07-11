# Runbook: Dedicated infrastructure for a Sovereign customer

**Internal only** — not customer-facing. Use when a signed Sovereign deal needs an isolated stack. Do not start this for “interest” alone; see `organizations.dedicated_infra_interest` for demand tracking only.

## When to use this

- Customer has an active Sovereign (or equivalent contracted) subscription.
- Contract explicitly requires dedicated tenancy (separate Auth/DB and/or separate deploy).
- You have a named technical contact and a cutover window.

## Goal

Give the customer an isolated NiskBuild deployment + Supabase project so their data and traffic do not share the multi-tenant production pool — without rewriting the product.

## High-level shape

| Concern | Shared production | Dedicated |
| --- | --- | --- |
| App | `niskbuild.com` (Vercel) | Separate Vercel project (or project + preview alias) |
| Auth + DB | Primary Supabase project | New Supabase project |
| Domains | Custom domains on shared app | Customer domain(s) pointed at dedicated deploy |
| Billing | Shared Stripe | Usually still shared Stripe unless contract says otherwise |

## Checklist

### 1. Preflight

- [ ] Confirm org id, billing owner email, and contract scope (data residency? SSO? uptime language?).
- [ ] Confirm whether they need **full** isolation (Auth+DB+app) or **app-only** (rare; prefer full).
- [ ] Snapshot current multi-tenant footprint: projects, custom domains, org members, SSO provider id if any.
- [ ] Agree freeze window: no builder deploys / domain edits during cutover.

### 2. Provision Supabase (dedicated)

- [ ] Create a new Supabase project (same region as contract, or as close as offered).
- [ ] Apply the same migrations as production (organizations, tickets, custom domains, SSO columns, etc.) — treat this as a greenfield schema, not a fork of prod data unless migrating.
- [ ] Create service role + anon keys; store in a dedicated secrets store (1Password / Vercel env), never in chat.
- [ ] Enable Auth providers required by the customer (Google, email, **SAML SSO** if contracted).
- [ ] If SSO: register their IdP against **this** project’s ACS/Entity ID (not production’s).

### 3. Provision app (dedicated Vercel)

- [ ] Clone/deploy the same NiskBuild git ref as production (pin a release commit).
- [ ] Set env: `NEXT_PUBLIC_SUPABASE_URL`, anon key, service role, Stripe keys (shared or dedicated), Resend, etc.
- [ ] Set Site URL + redirect allow-list in the **dedicated** Supabase Auth settings to the dedicated hostname.
- [ ] Smoke-test: signup/login, create project, deploy preview, settings, SSO if applicable.

### 4. Data migration (only if leaving shared)

Prefer **forward-only** for new Sovereign logos (start empty). If migrating an existing org:

- [ ] Export org + members + invites + projects (+ versions) for that org only.
- [ ] Import into dedicated DB with new UUIDs or preserved IDs (pick one strategy and stick to it).
- [ ] Remap `auth.users` — users must exist in the dedicated Auth project; password/Google identities do **not** copy automatically. Plan password reset or SSO-first login.
- [ ] Re-point `custom_domains` rows and re-verify DNS/TLS on the dedicated deploy.
- [ ] Disable or soft-delete the org on shared production after cutover verification (avoid dual-write).

### 5. DNS / routing

- [ ] Customer CNAME (or ALIAS) → dedicated Vercel hostname.
- [ ] Verify TLS; update any white-label branding / ACS URLs communicated to their IdP.
- [ ] Leave a temporary redirect or status note on shared if they previously used a niskbuild custom domain path.

### 6. Ops after cutover

- [ ] Document project refs (Supabase project id, Vercel project id, org id) in the internal CRM note / `dedicated_infra_notes`.
- [ ] Clear `dedicated_infra_interest` or leave it set with a note “provisioned YYYY-MM-DD”.
- [ ] Monitoring: at minimum, bookmark dedicated status + Vercel/Supabase dashboards. Automated multi-region uptime is out of scope for this runbook.
- [ ] Support: tickets may still land in shared admin unless you also isolate support — call that out in the contract.

## Explicit non-goals (do not build from this doc)

- Automated fleet provisioning / one-click “spin dedicated”
- Guaranteed SLA percentages on the marketing site
- Automated uptime probes as a product feature
- Automatic account merging across shared ↔ dedicated Auth

## Related code / scaffolding

- `organizations.dedicated_infra_interest` / `dedicated_infra_notes` — demand flag only
- Public `/status` — manually set operational flag + incident text
- Support `first_response_at` — observational TTFR in admin tickets
