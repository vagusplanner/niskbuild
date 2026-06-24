# Vagus Planner — Apple App Store Submission Guide

Step-by-step guide to export Vagus Planner from NiskBuild and submit it to the App Store using the Capacitor/Xcode export pipeline.

---

## Master checklist

Use this checklist to track progress across all phases.

### Requirements (before you start)

- [ ] **Apple Developer Program** membership ($99/year) — [developer.apple.com/programs](https://developer.apple.com/programs)
- [ ] **Mac with Xcode** installed (latest stable from Mac App Store)
- [ ] **NiskBuild account** with an **active Agency plan or above** (required for App Store export)
- [ ] **Privacy policy URL** hosted publicly (HTTPS)
- [ ] **App screenshots** prepared:
  - [ ] 5.5" display (1242 × 2208 px) — e.g. iPhone 8 Plus
  - [ ] 6.5" display (1284 × 2778 px or 1242 × 2688 px) — e.g. iPhone 11 Pro Max / 14 Plus
- [ ] **App icon** 1024 × 1024 px (no transparency, no rounded corners — Apple applies the mask)
- [ ] **Support URL** and **marketing URL** (optional but recommended)

### Phase 1 — Export from NiskBuild

- [ ] Production Supabase + VP configured (see [production-deployment.md](./production-deployment.md))
- [ ] Local dev environment on **macOS** with Xcode Command Line Tools
- [ ] Signed in to NiskBuild with Agency+ subscription
- [ ] Open `/builder/vagus-planner/export` and run export (or use CLI)
- [ ] Download **Xcode project (.zip)** and/or **.ipa** if signing succeeded
- [ ] Unzip and open `App.xcworkspace` in Xcode

### Phase 2 — Xcode setup

- [ ] Set unique **Bundle ID** (default: `com.niskbuild.vagusplanner`)
- [ ] Configure **Signing & Capabilities** with your Apple Developer team
- [ ] Set **Version** and **Build** numbers
- [ ] Add **App Icon** in Assets.xcassets
- [ ] Verify **Info.plist** permissions (camera, notifications, etc. if used)
- [ ] Archive build (**Product → Archive**)
- [ ] Validate archive before upload

### Phase 3 — App Store Connect

- [ ] Create app record in App Store Connect
- [ ] Fill metadata: name, subtitle, description, keywords
- [ ] Add **Privacy Policy URL**
- [ ] Complete **App Privacy** questionnaire (data collection)
- [ ] Upload screenshots (5.5" and 6.5" required minimum)
- [ ] Upload build via Xcode Organizer (or Transporter)
- [ ] Select build on the version page
- [ ] Submit for review

---

## Important: where export runs

App Store export **does not run on Vercel**. The API executes `scripts/export-app-store.js` on the **machine hosting the Next.js server**.

| Environment | Export works? |
|-------------|---------------|
| **Local Mac** (`npm run dev`) | Yes — recommended |
| **Vercel production** | No — Linux, no Xcode |

For submission, run export **locally on your Mac** with Xcode installed, either via the UI or CLI (see below).

---

## Phase 1 — Export from NiskBuild

### 1.1 Prerequisites

1. **Subscription:** App Store export requires an **active Agency plan or above** (`canExportNative` in `lib/tier-config.ts`).
2. **macOS + Xcode:** Full Xcode from the App Store (not only Command Line Tools).
3. **Node.js:** Same version you use for NiskBuild development.
4. **Repo cloned** locally with dependencies installed:
   ```bash
   npm install
   cd apps/vagus-planner && npm install && cd ../..
   ```

### 1.2 Optional — signing env vars (for automatic .ipa)

Set these in your shell **before** export if you want the pipeline to produce a signed `.ipa`:

```bash
export APPLE_TEAM_ID=XXXXXXXXXX          # 10-char Team ID from Apple Developer
export VP_XCODE_ALLOW_PROVISIONING=1     # Allow Xcode to manage profiles
export VP_EXPORT_METHOD=app-store      # Use "app-store" for App Store / TestFlight (default is "development")
```

Find your Team ID: [Apple Developer → Membership](https://developer.apple.com/account) → Team ID.

### 1.3 Export via NiskBuild UI (recommended)

1. Start the dev server on your Mac:
   ```bash
   npm run dev
   ```
2. Sign in with an Agency+ account.
3. Open **[http://localhost:3000/builder/vagus-planner/export](http://localhost:3000/builder/vagus-planner/export)**.
4. Export starts automatically when eligible. It runs these steps:
   - Build Next.js (NiskBuild shell)
   - Build Vagus Planner Vite app (`CAPACITOR_BUILD=1`)
   - Create/sync Capacitor iOS project
   - Package **Xcode project zip**
   - Attempt **.ipa** build (if signing env vars are set)
5. When complete, download:
   - **Download Xcode project (.zip)** — always use this if `.ipa` failed
   - **Download .ipa** — only if signing succeeded
6. Click **Re-run export** after code changes before each new submission.

### 1.4 Export via CLI (alternative)

From the repo root on macOS:

```bash
# Full App Store export (zip + ipa attempt)
npm run export:app-store

# Xcode project only (opens workspace when done)
npm run export:xcode
```

Output locations:

| Artifact | Path |
|----------|------|
| Xcode workspace | `mobile/vagus-planner/ios/App/App.xcworkspace` |
| iOS project zip | `mobile/vagus-planner/export/vagus-planner-ios.zip` |
| IPA (if built) | `mobile/vagus-planner/export/vagus-planner.ipa` |
| Manifest | `mobile/vagus-planner/export/export-manifest.json` |

### 1.5 Unzip and open in Xcode

```bash
cd mobile/vagus-planner/export
unzip -o vagus-planner-ios.zip -d ../
open ../ios/App/App.xcworkspace
```

Always open **`.xcworkspace`**, not `.xcodeproj` (CocoaPods/Capacitor).

### 1.6 Default Capacitor config

The export sets (see `mobile/vagus-planner/capacitor.config.json`):

| Setting | Default value |
|---------|---------------|
| App ID (Bundle ID) | `com.niskbuild.vagusplanner` |
| App name | `Vagus Planner` |
| Web bundle | `www/` (built from `apps/vagus-planner/dist`) |

Change the Bundle ID **before** creating the App Store Connect record if you use a custom ID (see Phase 2).

---

## Phase 2 — Xcode setup

### 2.1 Configure Bundle ID

1. Open `App.xcworkspace` in Xcode.
2. Select the **App** target → **Signing & Capabilities**.
3. Set **Bundle Identifier** to a unique reverse-DNS string, e.g.:
   - `com.yourcompany.vagusplanner`
   - Must match the Bundle ID you register in App Store Connect **exactly**.
4. To change it permanently for future exports, edit `mobile/vagus-planner/capacitor.config.json`:
   ```json
   {
     "appId": "com.yourcompany.vagusplanner",
     "appName": "Vagus Planner",
     "webDir": "www"
   }
   ```
   Then re-run export so `cap sync` applies the change.

### 2.2 Signing certificates & provisioning

1. **Signing & Capabilities** tab:
   - Enable **Automatically manage signing**
   - Select your **Team** (Apple Developer account)
2. Xcode creates:
   - **Apple Development** certificate (local testing)
   - **Apple Distribution** certificate (App Store)
   - Provisioning profiles for your Bundle ID
3. First-time setup in [Apple Developer → Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources):
   - **Identifiers → +** → App IDs → register your Bundle ID
   - Enable capabilities you need (Push Notifications, Sign in with Apple, etc.)
4. If CLI export failed with an IPA error, archiving in Xcode with automatic signing usually fixes it.

### 2.3 Version and build numbers

1. Target **App** → **General**:
   - **Version** (e.g. `1.0.0`) — user-visible, marketing version
   - **Build** (e.g. `1`) — must **increment** for every App Store upload
2. Rule: each upload to App Store Connect needs a **unique, higher** build number.

### 2.4 App icons

1. In Xcode: **App** → **Assets.xcassets** → **AppIcon**.
2. Drag a **1024 × 1024 px** PNG into the App Store slot.
3. Xcode can generate smaller sizes from the 1024 asset, or add all required sizes manually.
4. Requirements:
   - PNG or JPEG
   - No alpha/transparency for App Store icon
   - No rounded corners (iOS applies the mask)

### 2.5 Screenshots (capture before Connect upload)

Capture in **Simulator** or on device:

| Display | Simulator device | Size (portrait) |
|---------|------------------|-----------------|
| **5.5"** | iPhone 8 Plus | 1242 × 2208 |
| **6.5"** | iPhone 11 Pro Max | 1242 × 2688 |
| **6.5"** (newer) | iPhone 14 Plus | 1284 × 2778 |

**Simulator steps:**

1. Xcode → **Window → Devices and Simulators** → boot iPhone 8 Plus and iPhone 14 Plus (or 11 Pro Max).
2. Run the app (**⌘R**) on each simulator.
3. Navigate to key screens: Dashboard, Calendar, Tasks, Account.
4. **File → Save Screen** or `⌘S` in Simulator — saves PNG to Desktop.
5. Apple requires **3–10 screenshots** per device size; show core value in the first 2–3.

Suggested screens for Vagus Planner:

- Home / dashboard
- Task or calendar view
- Islamic Edition or planner feature (if applicable)
- Account / settings

### 2.6 Archive and validate

1. Select destination: **Any iOS Device (arm64)** (not a simulator).
2. **Product → Archive**.
3. When Organizer opens: select the archive → **Validate App**.
4. Fix any errors (signing, missing icons, entitlement issues).
5. **Distribute App** → **App Store Connect** → **Upload** (Phase 3).

---

## Phase 3 — App Store Connect

### 3.1 Create the app listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**.
2. Fill in:
   | Field | Example |
   |-------|---------|
   | Platform | iOS |
   | Name | Vagus Planner |
   | Primary language | English (U.S.) |
   | Bundle ID | Same as Xcode (e.g. `com.niskbuild.vagusplanner`) |
   | SKU | Unique string, e.g. `vagus-planner-001` |
   | User access | Full access |

### 3.2 Metadata

Under **App Information** and the **1.0 Prepare for Submission** version:

| Field | Guidance |
|-------|----------|
| **Subtitle** | Up to 30 chars — e.g. "Plan, focus, and reflect daily" |
| **Description** | Up to 4000 chars — features, audience, what makes VP unique |
| **Keywords** | Up to 100 chars, comma-separated — e.g. `planner,tasks,calendar,productivity,islamic` |
| **Support URL** | Required — e.g. `https://niskbuild.com/dashboard/support` |
| **Marketing URL** | Optional — landing page |
| **Privacy Policy URL** | **Required** — public HTTPS link (see below) |

**Privacy policy URL options:**

- Host on NiskBuild: e.g. `https://yourdomain.com/privacy` (if you publish a policy page)
- In-app route on production VP: ensure a stable public URL that resolves to your Privacy Policy content
- Vagus Planner includes `/PrivacyPolicy` in the web app — for App Store you still need a **standalone HTTPS URL** Apple can open without login

**Category:** Productivity (primary); Lifestyle or Health & Fitness (secondary, if applicable).

**Age rating:** Complete the questionnaire honestly (data collection, user-generated content, etc.).

### 3.3 App Privacy

1. **App Privacy** → **Get Started**.
2. Declare data types collected (e.g. email, user content, identifiers if using Supabase auth/analytics).
3. Match declarations to your privacy policy and Supabase/VP behavior.
4. Inaccurate privacy labels are a common rejection reason.

### 3.4 Upload screenshots

1. Version page → **App Previews and Screenshots**.
2. Upload for **5.5" Display** and **6.5" Display** (minimum set you prepared).
3. Add optional **6.7"** if targeting latest iPhones (1290 × 2796).
4. First screenshot is the most visible in search — use your strongest hero screen.

### 3.5 Upload build via Xcode

1. After **Product → Archive** → **Distribute App**:
   - **App Store Connect** → **Upload**
   - Default options (include bitcode/symbols as Xcode recommends)
2. Wait for processing (15 minutes to several hours) in Connect → **TestFlight** or **Activity**.
3. When status is **Ready to Submit**, go to the version page → **Build** → select the build.

**Alternative:** Export `.ipa` from Organizer and upload with [Transporter](https://apps.apple.com/app/transporter/id1450874784) (macOS).

### 3.6 Submit for review

1. Complete all required fields (screenshots, description, privacy, build, export compliance).
2. **Export compliance:** If the app only uses standard HTTPS (Supabase, no custom encryption), typically answer **No** to proprietary encryption or use the exemption for standard encryption.
3. **Content rights / advertising identifier** — answer as applicable.
4. Click **Add for Review** → **Submit to App Review**.

Review usually takes **24–48 hours** (can be longer). You’ll get email for approval, rejection, or metadata issues.

---

## Requirements reference

### Apple Developer account

- **Cost:** $99 USD / year (individual or organization)
- Enroll at [developer.apple.com/programs](https://developer.apple.com/programs)
- Needed for: signing, TestFlight, App Store Connect, push notification production certs

### Privacy policy URL

- Must be **publicly accessible** over HTTPS
- Must describe what data Vagus Planner collects (account email, tasks, settings, etc.)
- Linked in App Store Connect and ideally in-app (VP has a Privacy Policy page)

### App screenshots

| Size class | Pixel size (portrait) | Device example |
|------------|----------------------|----------------|
| 5.5" | 1242 × 2208 | iPhone 8 Plus |
| 6.5" | 1284 × 2778 or 1242 × 2688 | iPhone 14 Plus / 11 Pro Max |

Apple may add requirements for iPad or 6.7" iPhone — check [App Store Connect Help](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications) before submission.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Export button disabled / 403 | Upgrade to **Agency+** and ensure subscription is **active** |
| "App Store export must run on macOS" | Run `npm run dev` locally on a Mac, not on Vercel |
| IPA download missing | Set `APPLE_TEAM_ID` + `VP_XCODE_ALLOW_PROVISIONING=1`; archive manually in Xcode |
| Signing failed in Xcode | Enable automatic signing; register Bundle ID in Developer portal |
| Build not appearing in Connect | Wait for processing; check email for compliance/upload errors |
| Rejection: Guideline 2.1 ( crashes ) | Test archive on real device via TestFlight first |
| Rejection: Guideline 5.1.1 ( privacy ) | Fix privacy policy URL and App Privacy labels |

---

## Quick command reference

```bash
# Local dev + UI export
npm run dev
# → http://localhost:3000/builder/vagus-planner/export

# CLI export (macOS)
export APPLE_TEAM_ID=YOUR_TEAM_ID
export VP_XCODE_ALLOW_PROVISIONING=1
export VP_EXPORT_METHOD=app-store
npm run export:app-store

# Open Xcode workspace
open mobile/vagus-planner/ios/App/App.xcworkspace
```

---

## Related docs

- [Production deployment](./production-deployment.md) — Supabase, Vercel, VP production URL
- VP Studio — `/builder/vagus-planner` — edit app before export
- Export UI — `/builder/vagus-planner/export`
