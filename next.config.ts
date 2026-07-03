import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // VP deploy API runs Vite from apps/vagus-planner/node_modules at runtime (symlinked into /tmp).
  outputFileTracingIncludes: {
    "/api/builder/*/deploy": ["./apps/vagus-planner/**/*"],
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
