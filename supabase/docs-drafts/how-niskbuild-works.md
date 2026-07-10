# How NiskBuild Works

## What NiskBuild is

NiskBuild is an AI app builder: describe what you want in plain English, and NiskBuild generates real, working code — HTML, CSS, and JavaScript — that you can preview instantly, refine, and export. Unlike platforms that keep your app locked inside their system, NiskBuild gives you the actual source code, so what you build is genuinely yours.

## The build process

**1. You describe your app**
Type a prompt describing what you want — a business website, a booking page, a dashboard. The more specific you are, the more tailored the result, but even a short prompt is enough to get started.

**2. AI generates real code**
NiskBuild streams working code live as it's generated, so you can watch your app take shape. Generation runs on cloud AI by default, with automatic fallback across multiple providers if one is temporarily unavailable — so your build doesn't fail just because one provider is having issues.

**3. You get a live preview**
As code streams in, a live preview updates so you can see your app rendering in real time, not just read code.

**4. You iterate**
Add pages, request changes, or start over. Each successful save creates a version, so you can always go back to an earlier point if you want.

**5. You export or deploy**
When you're ready, export your code as a ZIP, deploy a shareable live preview link, or take it further with App Store/native app export options (see "Exporting Your App" below for exactly what each option includes).

## What "own your code forever" actually means

When you export a NiskBuild project, you get:
- A complete, cleaned HTML/CSS/JavaScript codebase
- A `niskbuild.config.json` file recording your project's prompt history and file structure
- A README explaining how to re-import the project back into NiskBuild if needed
- All pages of a multi-page project, not just the homepage

This is real, standalone code — it will run in any browser or web host, independent of NiskBuild, whether or not you keep your subscription.

*(Free/Sandbox tier exports include a visible watermark; paid tiers export a clean, unwatermarked version.)*

## Multi-page projects

NiskBuild supports multi-page apps — add a Contact page, an About page, or custom pages as your project grows. Once you save a project, all pages are stored together and restored exactly as you left them when you reopen the project. Version history also captures every page, not just the one you were last editing, so restoring an older version brings back your whole project as it was.

**One important note:** version history and multi-page saving apply after you've saved a project at least once. Before that first save, unsaved drafts may not fully persist if you leave and come back — save early if a project matters to you.

## Exporting your app

| Export type | What you get | Available on |
|---|---|---|
| Code ZIP | Full HTML/CSS/JS, config file, README, all pages | All tiers (watermarked on free; clean on paid) |
| PWA ZIP | Installable web-app package (manifest, service worker, offline support) | Paid tiers |
| Native starter ZIP | PWA package plus Capacitor configuration for wrapping as a mobile app | Agency tier and above |

*(Native starter ZIPs provide the configuration and instructions to build a native app yourself using standard developer tools — they are a starting point, not a finished App Store submission package.)*

## Version history

Every saved project keeps a version history you can browse, preview, and restore from. How many past versions are kept depends on your plan — higher tiers retain more history. Restoring an older version takes a snapshot of your current state first, so you never lose your latest work by going back.
