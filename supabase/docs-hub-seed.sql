-- Auto-generated from lib/docs/seed-articles.ts — run after docs-hub-migration.sql
delete from public.doc_feedback;
delete from public.doc_articles;

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('welcome-to-niskbuild', 'Welcome to NiskBuild', 'Getting Started', '# Welcome to NiskBuild

NiskBuild is where you **describe an app in plain language** and get a working project you can preview, refine, and ship.

This guide uses everyday language. When we mention a product term for the first time, we explain it right away.

## What you can do here

- **Build** — open the **Builder** (your design workspace) and describe what you want. NiskBuild generates pages, layout, and starter logic.
- **Preview** — see the app in your browser before you export or publish.
- **Export** — download a clean code package, a **PWA** (Progressive Web App — installable from the browser), or — on eligible plans — an **Xcode project** for the App Store.
- **Marketplace** — browse starter templates and clone projects to save time.

## Your first 15 minutes

1. Sign in and open **Dashboard**.
2. Click **New project** or open the **Builder**.
3. Describe your app in one or two sentences — who it is for and what it should do.
4. Click **Generate** and wait for the preview to load.
5. Tweak the prompt or use the visual editor (on supported plans) and generate again if needed.

## Where to go next

- **Your Plan** (in this sidebar) — a step-by-step path matched to your subscription.
- **Importing Apps** — bring in an app you started on Base44.
- **Exporting to App Store** — available on Agency Studio and above when you are ready for iPhone packaging.

## Need help?

Use the **?** icon in the top bar from any page to search docs without leaving your work. You can also visit **Dashboard → Support** to open a ticket.
', '{all}'::text[], 10);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('submitting-to-app-store', 'Submitting Your App to the App Store', 'Exporting to App Store', '# Submitting Your App to the App Store

This walkthrough covers exporting a NiskBuild app (for example **Vagus Planner**) to a real **Xcode project** and submitting it to Apple’s App Store.

**Xcode** is Apple’s app for building iPhone apps. **Capacitor** is the tool NiskBuild uses to wrap your web app so it runs natively on iOS.

> **Plan requirement:** App Store export needs an active **Agency Studio** plan or higher.

## Before you start

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs) ($99/year).
2. Use a **Mac** with **Xcode** installed from the Mac App Store.
3. Confirm push notifications are tested on a **physical iPhone** if your app uses them (simulators cannot receive Apple push).
4. Prepare a **privacy policy URL** (public HTTPS link), app icon (1024×1024 px), and screenshots for 5.5" and 6.5" iPhone displays.

## Phase 1 — Export from NiskBuild

Export runs on **your Mac**, not on NiskBuild’s cloud servers (Apple tooling requires macOS).

1. Clone the repo and run `npm install`.
2. Start the dev server: `npm run dev`.
3. Sign in with an Agency+ account.
4. Open **Builder → your app → Export** (e.g. `/builder/vagus-planner/export`).
5. Wait for the pipeline to finish: web build → Capacitor sync → Xcode project zip.
6. Download the **Xcode project (.zip)** and unzip it.
7. Open `App.xcworkspace` (always the `.xcworkspace`, not `.xcodeproj`).

**CLI alternative:** from the repo root, run `npm run export:app-store`.

## Phase 2 — Xcode setup

1. Select the **App** target → **Signing & Capabilities**.
2. Enable **Automatically manage signing** and choose your Apple **Team**.
3. Set a unique **Bundle ID** (e.g. `com.yourcompany.yourapp`) — it must match App Store Connect exactly.
4. Add capabilities your app needs: **Push Notifications**, **Background Modes → Remote notifications**, etc.
5. Set **Version** (marketing, e.g. 1.0.0) and **Build** (must increase every upload).
6. Add your **App Icon** in Assets.xcassets.
7. Select **Any iOS Device (arm64)** → **Product → Archive**.
8. In Organizer, **Validate App**, then **Distribute App → App Store Connect → Upload**.

## Phase 3 — App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Apps → + → New App**.
2. Enter name, Bundle ID, SKU, and primary language.
3. Fill metadata: subtitle, description, keywords, support URL, **privacy policy URL**.
4. Complete **App Privacy** questions honestly — mismatches cause rejections.
5. Upload screenshots (3–10 per required device size).
6. Select your uploaded build on the version page and **Submit for Review**.

## Common issues

| Problem | What to do |
|---------|------------|
| Export fails on Vercel | Run export locally on a Mac with Xcode |
| No .ipa file | Open the Xcode project and archive with automatic signing |
| Push not working | Test on a real device; verify APNs keys and Xcode capabilities |
| Build rejected for privacy | Align App Privacy labels with your policy and app behavior |

## Re-exporting after changes

Each App Store submission needs a **new build number**. Re-run export after code changes, archive again in Xcode, and upload the new build.
', '{agency,scale,white_label,team_enterprise,sovereign}'::text[], 20);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('importing-from-base44', 'Importing an App from Base44', 'Importing Apps', '# Importing an App from Base44

**Base44** is a platform some NiskBuild apps (including Vagus Planner) were originally built on. NiskBuild can host those apps on **Supabase** (your database and auth provider) instead of Base44 cloud functions.

This guide is for teams moving an existing Base44 project into the NiskBuild monorepo.

## What “import” means here

You are not clicking a single magic button. Import means:

1. Bringing the **source code** into `apps/your-app`.
2. Pointing the app at **your Supabase project** instead of Base44 APIs.
3. Running **database migrations** so tables exist in the `firstparty` schema.
4. Verifying auth, data, and exports in the NiskBuild Builder.

## Step-by-step import process

### 1. Export your Base44 app source

1. Download or clone your Base44 app repository.
2. Copy it into this monorepo under `apps/<app-slug>` (e.g. `apps/vagus-planner`).
3. Keep the Vite/React structure — NiskBuild’s export pipeline expects a standard web app build.

### 2. Replace Base44 SDK calls with Supabase

NiskBuild apps use a **compatibility layer** (`base44-compat.js`) that maps Base44 entity names to Supabase tables:

- `Task` → `firstparty.vp_tasks`
- `UserSettings` → `firstparty.vp_user_settings`
- And similar mappings for events, goals, notifications, etc.

1. Set build-time env vars on the app:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Remove dependency on `VITE_BASE44_APP_ID` once all routes use Supabase.
3. Run the app locally: `npm run dev --prefix apps/your-app`.

### 3. Run database migrations

1. Open the Supabase SQL editor for your project.
2. Run migrations in order (see `supabase/` in the repo): firstparty schema, RLS grants, app-specific tables.
3. Confirm tables exist under **firstparty** in the Table Editor.

### 4. Register the app in NiskBuild

1. Add the app to the builder registry so it appears in **Builder** navigation.
2. Configure export settings (`lib/builder-export/config.ts`) if you need Capacitor / App Store export.
3. Test sign-in, CRUD operations, and one export path.

### 5. Retire Base44 credentials

Once Supabase is verified in staging and production:

1. Rotate any keys that were shared with Base44.
2. Remove Base44 env vars from Vercel/hosting.
3. Update team documentation to point to NiskBuild URLs only.

## Troubleshooting

- **Auth loops** — confirm Supabase redirect URLs include your production domain.
- **Empty data** — check RLS policies; users must be authenticated to read `firstparty` rows.
- **Build errors** — ensure `@base44/vite-plugin` settings match whether you still need legacy imports.

## Vagus Planner reference

Vagus Planner is the reference import in this repo. Compare your app’s `base44-compat.js` and migrations to `apps/vagus-planner` when in doubt.
', '{all}'::text[], 30);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('getting-started-free', 'Getting Started on Sandbox (Free)', 'Your Plan', '# Getting Started on Sandbox

Your **Sandbox** plan lets you explore NiskBuild and build locally without a paid subscription.

## What Sandbox includes

- Access to the **Builder** and project dashboard
- **Local AI generation** via your own Ollama setup (you run the model on your machine)
- **Visual editor** for quick layout tweaks
- One concurrent browser session

## What Sandbox does not include

- NiskBuild **cloud AI credits** (paid plans bill generation to included credits)
- **PWA / ZIP export** of production-ready packages
- **Google Places import**, App Store export, and other Pro+ features

## Your first week — step by step

1. **Create a project** from Dashboard and open the Builder.
2. **Install Ollama** locally if you want AI generation without upgrading.
3. Write a clear prompt: audience, main screens, and one “must-have” feature.
4. Generate, preview, and iterate — save versions you like.
5. When you need cloud AI or export, visit **Pricing** to upgrade to Basic or Pro Worker.

## Tips for Sandbox builders

- Keep prompts focused — one feature per generation pass works best.
- Use version history to compare iterations before upgrading.
- Verify your phone number in Settings so paid features unlock smoothly after upgrade.
', '{free}'::text[], 100);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('getting-started-pro', 'Getting Started on Pro Worker', 'Your Plan', '# Getting Started on Pro Worker

**Pro Worker** is for solo builders and freelancers who want cloud AI, exports, and optional **BYOC** (Bring Your Own Cloud — use your own API keys).

## What Pro Worker unlocks

- **600 cloud credits** per month for NiskBuild-hosted generation
- **Clean ZIP export** and **PWA export**
- **Google Places business import** in the Builder
- **Stripe one-click inject** for payments in generated apps
- **Game templates** (Phaser.js)
- **Mobile project export** pipeline (Capacitor shell)
- Up to **5 concurrent sessions**
- **BYOC** — connect OpenAI or Anthropic keys in Settings

## Recommended workflow

1. **Start from a template** in Marketplace or describe your client’s app in the Builder.
2. Turn on **Google Places import** for local business sites — NiskBuild enriches listings with AI.
3. Use **cloud generate** for speed; switch to **local Ollama** when experimenting for free.
4. Export a **PWA** for client review before native packaging.
5. Connect **GitHub** in Settings if you want version control outside NiskBuild.

## Upgrade when you need

Move to **Agency Studio** when you need App Store export, competitor intel, team seats, or Stripe revenue dashboards.
', '{pro,basic}'::text[], 101);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('getting-started-agency', 'Getting Started on Agency Studio', 'Your Plan', '# Getting Started on Agency Studio

**Agency Studio** is for agencies shipping client apps — web, PWA, and **native iOS via Capacitor**.

## What Agency Studio unlocks

- **2,500 cloud credits** monthly
- **App Store / Xcode export** for supported first-party apps
- **Competitor intel** and **social proof** modules in Google import
- **Visual editor** with mobile overrides and undo
- **JSON-LD SEO schema** editor
- **Stripe revenue dashboard**
- **3 team seats** included
- Up to **10 concurrent sessions**

## Your agency launch checklist

1. **Standardize client intake** — use Google Places import + AI enrichment for local businesses.
2. **Set up export on a Mac** with Xcode for iOS deliverables (see *Submitting Your App to the App Store*).
3. Enable **push notifications** and test on a physical iPhone before client handoff.
4. Use **preview links** to share builds before export.
5. Track billing in **Dashboard → Settings** and client discounts via support if applicable.

## Team tips

- Assign one seat per developer; revoke sessions from Settings if devices change.
- Document each client’s Bundle ID and Apple Team ID before export.
', '{agency}'::text[], 102);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('getting-started-scale', 'Getting Started on Scale Team', 'Your Plan', '# Getting Started on Scale Team

**Scale Team** is for growing product teams that need high credit volume, scheduling, and unlimited team seats.

## What Scale Team unlocks

- **10,000 cloud credits** monthly
- Everything in Agency Studio, plus:
- **Scheduled social posts** (or with Social Pro add-on)
- **Unlimited team seats**
- Up to **20 concurrent sessions**

## Recommended operating model

1. **Split environments** — use separate Supabase projects for staging and production.
2. **Template library** — clone Marketplace starters into team projects for consistent architecture.
3. **Export pipeline** — designate one Mac build machine for iOS archives to avoid Vercel/Linux limitations.
4. **Usage review** — monitor credit burn weekly; top up or adjust tier before client deadlines.

## When to consider White-Label

Upgrade when you need **custom domains**, full **white-label branding**, and client-facing deployments on your own hostname.
', '{scale}'::text[], 103);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('getting-started-white-label', 'Getting Started on White-Label', 'Your Plan', '# Getting Started on White-Label

**White-Label** lets you present NiskBuild-powered apps under **your brand** and **your domain**.

## What White-Label unlocks

- **15,000 cloud credits** monthly
- Everything in Scale Team, plus:
- **Custom domain mapping** for client apps
- **Full white-label rebrand** (logo, colors, remove NiskBuild chrome where configured)
- **Unlimited team seats** and sessions

## Launch checklist

1. Configure **tenant routing** — map subdomains or custom domains to deployed app runtimes.
2. Prepare **SSL** — Vercel or your host must issue certificates for each client domain.
3. Set **NEXT_PUBLIC_APP_URL** and client-specific URLs in production env vars.
4. Publish a **privacy policy** and support URL on each client domain for App Store compliance.
5. Use **admin tenant tools** (platform owner) to suspend or restore client nodes if billing lapses.

## Client handoff

Deliver login instructions, support channel, and export artifacts (PWA + optional iOS) from a consistent runbook your team repeats per client.
', '{white_label}'::text[], 104);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('getting-started-team-enterprise', 'Getting Started on Team Enterprise', 'Your Plan', '# Getting Started on Team Enterprise

**Team Enterprise** is for organizations that need high volume, broad team access, and enterprise-style operations.

## What Team Enterprise unlocks

- **25,000 cloud credits** monthly
- Unlimited team seats and sessions
- Full White-Label capabilities (domains, branding, tenant routing)
- Priority consideration for support escalations

## Recommended setup

1. **Identity** — document which Supabase project owns production auth for each brand.
2. **Access control** — use platform owner tools to audit tenants and marketplace listings quarterly.
3. **Compliance** — align privacy policy, analytics opt-in, and App Store privacy labels across brands.
4. **Build infrastructure** — maintain dedicated Mac builders for iOS CI if you ship native apps weekly.

## Working with NiskBuild support

Open tickets from **Dashboard → Support** with repro steps, project ID, and tier. For billing or discount questions, reference your account email.
', '{team_enterprise}'::text[], 105);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('getting-started-sovereign', 'Getting Started on Sovereign', 'Your Plan', '# Getting Started on Sovereign

**Sovereign** is the highest NiskBuild tier — maximum credits and full platform capabilities for large-scale or multi-brand operators.

## What Sovereign unlocks

- **50,000 cloud credits** monthly
- Unlimited team seats and sessions
- All White-Label and enterprise features
- Highest priority for platform capacity and support routing

## Operating at Sovereign scale

1. **Partition by brand** — separate Supabase projects or schemas per major brand when isolation is required.
2. **Automate exports** — script Capacitor sync and Xcode archive on dedicated Mac hardware.
3. **Monitor usage_events** (if analytics opt-in applies) for aggregate demand trends without end-user PII.
4. **Document runbooks** — App Store submission, Base44 migration, and tenant onboarding should be repeatable by any team member.

## Strategic upgrades within Sovereign

You already have top-tier access. Focus on operational excellence: SLAs for clients, backup Supabase projects, and staged rollouts for marketplace template updates.
', '{sovereign}'::text[], 106);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('what-is-niskbuild', 'What is NiskBuild?', 'Getting Started', '# What is NiskBuild?

NiskBuild is an **AI-powered app builder** for freelancers, agencies, and product teams who need to ship client-ready web apps without starting from a blank repo.

Describe what you want in plain language — pages, branding, flows — and NiskBuild generates a working project you can preview, refine, and export.

## Who NiskBuild is for

| Client type | How NiskBuild helps |
|-------------|---------------------|
| **Freelancers** | Deliver landing pages, PWAs, and small apps faster; one prompt to a preview clients can approve |
| **Agencies & studios** | Standardize delivery: HTML builder, branded exports, optional App Store packaging on higher plans |
| **In-house product teams** | Prototype internal tools and customer portals; upgrade when you need team seats or white-label |
| **Local businesses** | Import Google Business listings (Pro+) to auto-fill brand, services, and social proof |
| **Game & interactive studios** | Phaser game templates and AI-assisted logic on Pro Worker and above |

Every company — from solo founders to enterprise — gets the same core workflow: **prompt → preview → export**. Plans unlock credits, exports, integrations, and support depth.

## What you can build

- **Marketing & brochure sites** — multi-page HTML with live preview
- **Client dashboards & tools** — React/Vite apps (e.g. Vagus Planner) with page-level AI edits
- **PWAs** — installable mobile web apps without an app store
- **Native iOS (Agency+)** — Capacitor/Xcode export for App Store submission
- **2D games (Pro+)** — Phaser.js templates with AI-generated game logic

## Services by plan

### Sandbox (Free)

- 1 project, browser preview
- Optional local Ollama on your machine
- Watermarked / locked export
- Contact form support

**Best for:** Trying NiskBuild before you commit.

### Basic ($69/mo)

- 5 projects
- Clean ZIP + **PWA export**
- 150 cloud AI credits / month
- Docs hub + brand kit downloads

**Best for:** Freelancers shipping PWAs and static sites for clients.

### Pro Worker ($129/mo)

- Everything in Basic, plus:
- **600 credits** / month
- **BYOC** — bring your own API keys
- **Google Places** import + competitor intel
- **Phaser game builder**
- **Support tickets** with priority replies
- Local Ollama in the cloud builder

**Best for:** Power users and small agencies who need integrations and human support.

### Agency Studio ($299/mo+)

- **2,500+ credits**, team seats
- **Live preview links** for client review
- **App Store / Xcode export** (Capacitor)
- Social publishing (Buffer), SEO schema tools
- Higher session limits

**Best for:** Agencies delivering multiple client apps per month.

### Scale, White Label, Team Enterprise, Sovereign

- 10,000–50,000+ credits
- White-label branding, unlimited seats (tier-dependent)
- Dedicated ops patterns for multi-brand and enterprise isolation

**Best for:** Platforms, resellers, and large teams standardizing on NiskBuild.

## How NiskBuild helps every company

1. **Speed to first preview** — minutes, not weeks, from idea to something stakeholders can click through
2. **Consistent exports** — ZIP, PWA, or native packaging depending on plan
3. **Tiered cost** — start free, upgrade only when credits, exports, or support matter
4. **Human + AI support** — in-app help, support agent, and Pro+ tickets with admin-backed confirmations
5. **Docs & brand kit** — self-serve assets so your team stays on-brand

## Next steps

- **Welcome to NiskBuild** — your first 15 minutes in the builder
- **Your Plan** — step-by-step path for your subscription tier
- **Progressive Web Apps (PWA)** — fastest mobile delivery without the App Store
', '{all}'::text[], 12);

insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)
values ('progressive-web-apps-pwa', 'Progressive Web Apps (PWA)', 'Using NiskBuild', '# Progressive Web Apps (PWA)

A **PWA** (Progressive Web App) lets your NiskBuild app install on iPhone and Android like a native app — without the App Store. Host once, share a link, and clients tap **Add to Home Screen**.

## What is a PWA?

A Progressive Web App is a website with superpowers: it can run full-screen from the home screen, work offline (with a service worker), and feel like a native app. For agencies and freelancers, PWAs are the fastest way to deliver mobile apps to clients — no Apple developer account required for distribution.

## How to export from NiskBuild

1. Save your project in the **Builder**.
2. Open **Dashboard** → Saved Projects.
3. Click **Export as Mobile App** (Pro plan or above).
4. Choose **PWA Export** and download the ZIP.
5. Upload the ZIP contents to any HTTPS host (Vercel, Netlify, etc.).

## Share with clients

Send clients your live HTTPS URL. They install once from Safari or Chrome — no app review, no store listing. When you redeploy updates, users get the new version on their next visit.

## Test on iPhone (Safari)

1. Open your hosted URL in Safari (not Chrome on iOS).
2. Tap Share → **Add to Home Screen**.
3. Launch from the new icon — full-screen, no browser chrome.

## Test on Android (Chrome)

1. Open your hosted URL in Chrome.
2. Menu → **Install app** or Add to Home screen.
3. Open from the app drawer or home screen.

## PWA vs native (Capacitor)

**PWA** — instant delivery, any phone, browser install. Best for MVPs, client demos, and internal tools.

**Native (Agency+)** — Capacitor wraps your app for Xcode / Android Studio and App Store / Play Store submission. Use when you need store presence or deep OS APIs.

See **Exporting to App Store** in the sidebar when you are ready for native packaging.
', '{all}'::text[], 15);
