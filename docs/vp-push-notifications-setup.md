# Vagus Planner — Push & Email Notifications Setup

Infrastructure for scheduled reminders via **Resend (email)** and **APNs (iOS push)** before App Store / Capacitor export.

---

## Overview

| Component | Purpose |
|-----------|---------|
| `firstparty.vp_reminders` | Scheduled reminder queue (title, body, type, scheduled_at) |
| `firstparty.vp_device_tokens` | APNs device tokens from Capacitor |
| `firstparty.vp_user_settings` | Push/email toggles + per-type prefs |
| `/api/notifications/register-device` | Stores push token on app launch |
| `/api/cron/vp-send-reminders` | Processes due reminders (Resend + APNs) |
| `supabase/functions/vp-send-reminders` | Cron trigger → delegates to Next.js cron |

**Email service:** Reuses platform **Resend** (`RESEND_API_KEY`, `EMAIL_FROM`) — same as NiskBuild auth/support mail. No new provider.

---

## 1. Database migration

Run in Supabase SQL editor:

```bash
supabase/vp-notifications-infrastructure-migration.sql
```

---

## 2. Environment variables (server)

Add to Vercel / production env:

```env
# Existing — already used by NiskBuild
RESEND_API_KEY=re_...
EMAIL_FROM="Vagus Planner <notifications@yourdomain.com>"

# Cron auth (shared by edge function + /api/cron/vp-send-reminders)
CRON_SECRET=<random-long-secret>
VP_REMINDER_CRON_URL=https://your-domain.com/api/cron/vp-send-reminders

# APNs (Apple Developer → Keys → create APNs Auth Key .p8)
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=XXXXXXXXXX
APNS_BUNDLE_ID=com.niskbuild.vagusplanner
APNS_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APNS_PRODUCTION=false   # true for App Store builds
```

**Never** put `APNS_KEY` in client code or the Capacitor bundle.

---

## 3. Supabase Edge Function cron

Deploy `supabase/functions/vp-send-reminders` and set secrets:

- `CRON_SECRET`
- `VP_REMINDER_CRON_URL`

Schedule: **every 5 minutes** (`*/5 * * * *`) in Supabase Dashboard → Edge Functions.

---

## 4. Capacitor push plugin

Already added to `mobile/vagus-planner` and export template:

```bash
cd mobile/vagus-planner
npm install
npx cap sync ios
```

For the web bundle source (`apps/vagus-planner`):

```bash
cd apps/vagus-planner
npm install   # includes @capacitor/core + @capacitor/push-notifications
```

Set `VITE_NISKBUILD_ORIGIN=https://your-domain.com` in the Capacitor build env so device registration hits the correct API.

---

## 5. Xcode (manual, one-time)

Open `mobile/vagus-planner/ios/App/App.xcworkspace`:

1. **Signing & Capabilities** → **+ Capability** → **Push Notifications**
2. **+ Capability** → **Background Modes** → check **Remote notifications**
3. Confirm **Bundle Identifier** matches `APNS_BUNDLE_ID` (`com.niskbuild.vagusplanner`)

---

## 6. APNs authentication key (Apple Developer)

1. [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles** → **Keys**
2. Create key with **Apple Push Notifications service (APNs)** enabled
3. Download `.p8` file (one-time download)
4. Store contents in `APNS_KEY` server secret; note **Key ID** and **Team ID**

Use **sandbox** APNs (`APNS_PRODUCTION=false`) for TestFlight/dev builds; **production** for App Store.

---

## 7. Notification preferences UI

Vagus Planner settings (separate from main NiskBuild platform settings):

- **Next.js:** `/vagus-planner/settings`
- API: `GET/PATCH /api/vagus-planner/notification-preferences`

Toggles: push, email, prayer / task due / event reminder types.

---

## 8. Physical device test (required before App Store export)

Push **does not deliver on the iOS Simulator**. Complete this checklist on a real iPhone:

- [ ] Migration applied; env vars set (Resend, CRON_SECRET, APNs)
- [ ] Export or open Capacitor iOS project; Xcode capabilities enabled
- [ ] Install dev/TestFlight build on **physical device**
- [ ] Sign in; grant notification permission on first launch
- [ ] Confirm row in `firstparty.vp_device_tokens` for your user
- [ ] Create test reminder via API or SQL:

```sql
insert into firstparty.vp_reminders (user_id, title, body, reminder_type, scheduled_at)
values (
  '<your-user-uuid>',
  'Test reminder',
  'If you see this, notifications work.',
  'general',
  now() + interval '2 minutes'
);
```

- [ ] Trigger cron manually:

```bash
curl -X POST https://your-domain.com/api/cron/vp-send-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

- [ ] Verify email received (if email enabled)
- [ ] Verify push banner on device (if push enabled and app backgrounded)
- [ ] Check `vp_reminders.sent_at` and `channel` updated

Only proceed to [app-store-submission.md](./app-store-submission.md) after this loop passes.

---

## Reuse for future first-party apps

Copy the pattern:

- New reminders table (or shared with `app_id` column)
- Reuse `vp_device_tokens` + APNs sender with per-app `APNS_BUNDLE_ID`
- Same `/api/notifications/register-device` with optional `appSlug` param (extend as needed)
