import 'server-only';

import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';
import { compileToMobile, generateCapacitorConfig } from '@/lib/blueprint-compiler';

export type PwaProjectInput = {
  id: string;
  title: string;
  prompt: string;
  generated_code: string;
  blueprint_json?: ComponentBlueprint | null;
};

export type PwaManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: 'standalone';
  background_color: string;
  theme_color: string;
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
};

const BACKGROUND_COLOR = '#0D0F1E';
const THEME_COLOR = '#00F2FE';

export function generateManifest(project: PwaProjectInput): PwaManifest {
  const name = project.title?.trim() || 'NiskBuild App';
  const description =
    project.blueprint_json?.meta?.description?.trim() ||
    project.prompt?.trim().slice(0, 160) ||
    'A Progressive Web App built with NiskBuild';

  return {
    name,
    short_name: name.slice(0, 12),
    description,
    start_url: '/',
    display: 'standalone',
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
}

export function generateServiceWorker(): string {
  return `const CACHE_NAME = 'niskbuild-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match('/offline.html'));
    })
  );
});
`;
}

export function generateOfflinePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #0D0F1E; color: #94A3B8; font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
    h1 { color: #fff; font-size: 1.25rem; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <div>
    <h1>You are offline</h1>
    <p>Your app will load when you reconnect.</p>
  </div>
</body>
</html>`;
}

export function generateReadmePwa(projectName: string): string {
  return `# ${projectName} — PWA Export

This bundle is a **Progressive Web App (PWA)**. Users can install it on iPhone and Android from the browser — no App Store required.

## What is a PWA?

A PWA is a website that behaves like a native app: full-screen icon on the home screen, offline support, and fast loading. You host it on any HTTPS domain and share the link with clients.

## How to host

1. Upload all files in this ZIP to your web host (Vercel, Netlify, Cloudflare Pages, or any static host).
2. Serve over **HTTPS** (required for install prompts).
3. Ensure \`index.html\`, \`manifest.json\`, and \`service-worker.js\` are at the site root.

## Test on iPhone (Safari)

1. Open your hosted URL in **Safari**.
2. Tap the **Share** button.
3. Tap **Add to Home Screen**.
4. Launch the app from your home screen — it opens full-screen like a native app.

## Test on Android (Chrome)

1. Open your hosted URL in **Chrome**.
2. Tap the menu (⋮) → **Install app** or **Add to Home screen**.
3. Confirm install and open from the launcher.

## Share with clients

Send clients your HTTPS link. They install once via Add to Home Screen — updates deploy when you redeploy your host (service worker refreshes on revisit).

## Icons

Replace \`icon-192.png\` and \`icon-512.png\` with your brand assets for a polished install icon.

---
Built with [NiskBuild](https://www.niskbuild.com) — Build anything. Own everything.
`;
}

export function generateReadmeNative(projectName: string): string {
  return `# ${projectName} — Native App Export (Capacitor)

This bundle includes a PWA plus Capacitor configuration for **true native** iOS and Android builds.

## Requirements

- **Agency plan or above** on NiskBuild
- **Xcode** (macOS) for iOS App Store builds
- **Android Studio** for Google Play builds
- Node.js 18+

## Quick start

\`\`\`bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "${projectName}" com.niskbuild.app --web-dir .
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios    # or android
\`\`\`

Use the included \`capacitor.config.json\` as your starting config.

## PWA vs native

- **PWA**: instant — host and share a link; Add to Home Screen on any phone.
- **Native (Capacitor)**: App Store / Play Store distribution, push notifications, deeper OS integration.

---
Built with [NiskBuild](https://www.niskbuild.com)
`;
}

export function injectPwaTags(html: string): string {
  const pwaHead = `
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="${THEME_COLOR}">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/service-worker.js').catch(function () {});
      });
    }
  </script>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${pwaHead}\n</head>`);
  }
  return `<!DOCTYPE html><html><head>${pwaHead}</head><body>${html}</body></html>`;
}

function resolveAppHtml(project: PwaProjectInput): string {
  if (project.blueprint_json) {
    return injectPwaTags(compileToMobile(project.blueprint_json));
  }
  return injectPwaTags(project.generated_code || '');
}

async function loadIcon(relativePath: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(process.cwd(), 'public', relativePath);
    return await readFile(fullPath);
  } catch {
    return null;
  }
}

export async function buildPwaZip(project: PwaProjectInput): Promise<Buffer> {
  const manifest = generateManifest(project);
  const zip = new JSZip();
  const appHtml = resolveAppHtml(project);

  zip.file('index.html', appHtml);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('service-worker.js', generateServiceWorker());
  zip.file('offline.html', generateOfflinePage());
  zip.file('README-PWA.md', generateReadmePwa(manifest.name));

  const icon192 = (await loadIcon('logo/icon-180.png')) || (await loadIcon('logo/icon-512.png'));
  const icon512 = await loadIcon('logo/icon-512.png');

  if (icon192) zip.file('icon-192.png', icon192);
  if (icon512) zip.file('icon-512.png', icon512);

  return zip.generateAsync({ type: 'nodebuffer' });
}

export async function buildNativeZip(project: PwaProjectInput): Promise<Buffer> {
  const pwaBuffer = await buildPwaZip(project);
  const zip = await JSZip.loadAsync(pwaBuffer);
  const manifest = generateManifest(project);

  if (project.blueprint_json) {
    zip.file('capacitor.config.json', JSON.stringify(generateCapacitorConfig(project.blueprint_json), null, 2));
  } else {
    zip.file(
      'capacitor.config.json',
      JSON.stringify(
        {
          appId: `com.niskbuild.${project.id.replace(/-/g, '').slice(0, 12)}`,
          appName: manifest.name,
          webDir: '.',
          server: { androidScheme: 'https' },
        },
        null,
        2
      )
    );
  }

  zip.file('README-NATIVE.md', generateReadmeNative(manifest.name));
  return zip.generateAsync({ type: 'nodebuffer' });
}

export function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'niskbuild-app'
  );
}
