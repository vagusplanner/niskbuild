import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CommandPalette from "./components/CommandPalette";
import GlobalKeyboardShortcuts from "./components/GlobalKeyboardShortcuts";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import SessionHeartbeat from "./components/SessionHeartbeat";
import SentryErrorBoundary from "./components/SentryErrorBoundary";
import UmamiAnalytics from "./components/UmamiAnalytics";
import { ThemeProvider } from "./components/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NiskBuild - Build Apps with AI",
  description:
    "The AI app builder that gives you the code. Build locally. Own forever.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/logo/niskbuild-n-icon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo/icon-180.png",
  },
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var p=s==='light'||s==='dark'||s==='system'?s:'dark';var r=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.setAttribute('data-theme',r);document.documentElement.style.colorScheme=r;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <CommandPalette />
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
