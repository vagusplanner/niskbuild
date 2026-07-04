import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/** VP sources needed for deploy + admin artifact build (no node_modules). */
const VP_BUILD_TRACE_FILES = [
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
];

const VP_BUILD_TRACE_EXCLUDES = [
  "./apps/vagus-planner/node_modules/**/*",
  "./apps/vagus-planner/dist/**/*",
];

// Route keys are picomatch-matched (contains:true) against the normalized app
// path. Include several patterns so GET and POST on the same route always match
// across Next/Turbopack versions (/api/... vs /app/api/...).
const VP_ADMIN_ARTIFACT_ROUTE_KEYS = [
  "/api/admin/vp-deploy-artifact",
  "/app/api/admin/vp-deploy-artifact",
  "**/vp-deploy-artifact",
] as const;

const nextConfig: NextConfig = {
  // VP deploy + admin artifact build need VP sources/lockfile at runtime.
  // Never ship apps/vagus-planner/node_modules (blows the 250MB function limit).
  outputFileTracingIncludes: {
    "/api/builder/*/deploy": VP_BUILD_TRACE_FILES,
    ...Object.fromEntries(
      VP_ADMIN_ARTIFACT_ROUTE_KEYS.map((key) => [key, VP_BUILD_TRACE_FILES])
    ),
  },
  outputFileTracingExcludes: {
    "/api/builder/*/deploy": VP_BUILD_TRACE_EXCLUDES,
    ...Object.fromEntries(
      VP_ADMIN_ARTIFACT_ROUTE_KEYS.map((key) => [key, VP_BUILD_TRACE_EXCLUDES])
    ),
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
