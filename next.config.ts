import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Documents get their Content Security Policy from src/proxy.ts, which
 * mints a per-request nonce. It must NOT be set here as well: when two CSP
 * headers are present a browser enforces both, and a static `script-src 'self'`
 * would reject the nonced scripts the middleware just authorised - which is
 * exactly the failure that stopped React from hydrating in production.
 *
 * API routes are excluded from that middleware, so they get a deliberately
 * minimal policy of their own below.
 */
const API_CSP = ["default-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"].join("; ");

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  transpilePackages: ["@exodus/bytes"],
  serverExternalPackages: ["jsdom", "html-encoding-sniffer", "isomorphic-dompurify", "pdf-page-counter"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "*.ufs.sh", pathname: "/**" },
      { protocol: "https", hostname: "utfs.io", pathname: "/**" },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      ],
    },
    { source: "/api/:path*", headers: [{ key: "Content-Security-Policy", value: API_CSP }] },
    { source: "/api/auth/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    { source: "/api/files/:fileId", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
  ],
};

export default withSentryConfig(nextConfig, {
  org: "akentech",
  project: "cnersh-webapp",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: { automaticVercelMonitors: true, treeshake: { removeDebugLogging: true } },
});
