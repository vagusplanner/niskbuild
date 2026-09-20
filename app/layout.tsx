import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CheckoutHeadGuard from "./components/CheckoutHeadGuard";
import CommandPalette from "./components/CommandPalette";
import DocsQuickPanel from "./components/DocsQuickPanel";
import GlobalKeyboardShortcuts from "./components/GlobalKeyboardShortcuts";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import SessionHeartbeat from "./components/SessionHeartbeat";
import SentryErrorBoundary from "./components/SentryErrorBoundary";
import UmamiAnalytics from "./components/UmamiAnalytics";
import { ThemeProvider } from "./components/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { BRAND_COLORS } from "@/lib/brand-colors";
import { isSuperEduc8Request } from "@/lib/supereduc8-request";
import { getSuperEduc8Origin } from "@/lib/supereduc8-host";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const niskSiteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.niskbuild.com";

const SUPEREDUC8_ICONS: Metadata["icons"] = {
  icon: [
    { url: "/brand/supereduc8/favicon.ico", sizes: "any" },
    { url: "/brand/supereduc8/icon-32.png", sizes: "32x32", type: "image/png" },
    { url: "/brand/supereduc8/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/brand/supereduc8/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  apple: [{ url: "/brand/supereduc8/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  shortcut: "/brand/supereduc8/favicon.ico",
};

const NISKBUILD_ICONS: Metadata["icons"] = {
  icon: [
    { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    { url: "/logo/icon-16.png", sizes: "16x16", type: "image/png" },
    { url: "/logo/icon-32.png", sizes: "32x32", type: "image/png" },
    { url: "/logo/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/logo/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  apple: [{ url: "/logo/icon-180.png", sizes: "180x180", type: "image/png" }],
  shortcut: "/favicon.ico",
};

export async function generateMetadata(): Promise<Metadata> {
  if (await isSuperEduc8Request()) {
    const origin = getSuperEduc8Origin();
    return {
      metadataBase: new URL(origin),
      title: {
        default: "SuperEduc8",
        template: "%s · SuperEduc8",
      },
      description:
        "AI tutoring for students ages 7–17 — homework help, essay feedback, and exam prep with parent visibility.",
      applicationName: "SuperEduc8",
      icons: SUPEREDUC8_ICONS,
      openGraph: {
        type: "website",
        locale: "en_US",
        url: origin,
        siteName: "SuperEduc8",
        title: "SuperEduc8 — Your child's personal AI tutor",
        description:
          "AI tutoring for students ages 7–17 — homework help, essay feedback, and exam prep with parent visibility.",
        images: [
          {
            url: "/brand/supereduc8/icon-512.png",
            width: 512,
            height: 512,
            alt: "SuperEduc8",
          },
        ],
      },
      twitter: {
        card: "summary",
        title: "SuperEduc8 — Your child's personal AI tutor",
        description:
          "AI tutoring for students ages 7–17 — homework help, essay feedback, and exam prep with parent visibility.",
        images: ["/brand/supereduc8/icon-512.png"],
      },
    };
  }

  return {
    metadataBase: new URL(niskSiteUrl),
    title: "NiskBuild - Build Apps with AI",
    description:
      "The AI app builder that gives you the code. Build locally. Own forever.",
    applicationName: "NiskBuild",
    icons: NISKBUILD_ICONS,
    manifest: "/site.webmanifest",
    openGraph: {
      type: "website",
      locale: "en_US",
      url: niskSiteUrl,
      siteName: "NiskBuild",
      title: "NiskBuild — Build Apps with AI",
      description:
        "The AI app builder that gives you the code. Build locally. Own forever.",
      images: [
        {
          url: "/logo/icon-512.png",
          width: 512,
          height: 512,
          alt: "NiskBuild — copper forge logo",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: "NiskBuild — Build Apps with AI",
      description:
        "The AI app builder that gives you the code. Build locally. Own forever.",
      images: ["/logo/icon-512.png"],
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  if (await isSuperEduc8Request()) {
    return { themeColor: "#2b7de8" };
  }
  return { themeColor: BRAND_COLORS.bgBase };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Favicons come from generateMetadata (host-aware). Do not hardcode
            NiskBuild /favicon.ico here — it overrides SuperEduc8 on shared hosts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)},'light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <CommandPalette />
          <DocsQuickPanel />
          <GlobalKeyboardShortcuts />
          <KeyboardShortcutsModal />
          <SessionHeartbeat />
          <CheckoutHeadGuard />
          <UmamiAnalytics />
          <SentryErrorBoundary>{children}</SentryErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
