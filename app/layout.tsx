import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://niskbuild.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "NiskBuild - Build Apps with AI",
  description:
    "The AI app builder that gives you the code. Build locally. Own forever.",
  applicationName: "NiskBuild",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/logo/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/logo/icon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
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

export const viewport: Viewport = {
  themeColor: BRAND_COLORS.bgBase,
};

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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo/icon-180.png" />
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
          <UmamiAnalytics />
          <SentryErrorBoundary>{children}</SentryErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
