import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CommandPalette from "./components/CommandPalette";
import SessionHeartbeat from "./components/SessionHeartbeat";
import UmamiAnalytics from "./components/UmamiAnalytics";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CommandPalette />
        <SessionHeartbeat />
        <UmamiAnalytics />
        {children}
      </body>
    </html>
  );
}
