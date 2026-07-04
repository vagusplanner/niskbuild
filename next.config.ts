import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // VP deploy runs `npm ci` + Vite in /tmp. Ship app source + lockfile only —
  // never apps/vagus-planner/node_modules (that alone was ~280MB and blew the
  // 250MB serverless limit). No VERCEL_SUPPORT_LARGE_FUNCTIONS required.
  outputFileTracingIncludes: {
    "/api/builder/*/deploy": [
      "./apps/vagus-planner/package.json",
      "./apps/vagus-planner/package-lock.json",
      "./apps/vagus-planner/vite.config.js",
      "./apps/vagus-planner/jsconfig.json",
      "./apps/vagus-planner/index.html",
      "./apps/vagus-planner/postcss.config.js",
      "./apps/vagus-planner/tailwind.config.js",
      "./apps/vagus-planner/components.json",
      "./apps/vagus-planner/eslint.config.js",
      "./apps/vagus-planner/src/**/*",
      "./apps/vagus-planner/public/**/*",
    ],
    // Admin artifact build/status needs lockfile hash + sources for npm ci.
    "/api/admin/vp-deploy-artifact": [
      "./apps/vagus-planner/package.json",
      "./apps/vagus-planner/package-lock.json",
      "./apps/vagus-planner/vite.config.js",
      "./apps/vagus-planner/jsconfig.json",
      "./apps/vagus-planner/index.html",
      "./apps/vagus-planner/postcss.config.js",
      "./apps/vagus-planner/tailwind.config.js",
      "./apps/vagus-planner/components.json",
      "./apps/vagus-planner/src/**/*",
      "./apps/vagus-planner/public/**/*",
    ],
  },
  outputFileTracingExcludes: {
    "/api/builder/*/deploy": [
      "./apps/vagus-planner/node_modules/**/*",
      "./apps/vagus-planner/dist/**/*",
    ],
    "/api/admin/vp-deploy-artifact": [
      "./apps/vagus-planner/node_modules/**/*",
      "./apps/vagus-planner/dist/**/*",
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "niskbuild",
  project: "nextjs-app",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
