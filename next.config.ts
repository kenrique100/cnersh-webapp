import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const GOOGLE_TRANSLATE_DOMAINS = [
  "https://www.google.com",
  "https://translate.google.com",
  "https://translate.googleapis.com",
  "https://translate-pa.googleapis.com",
  "https://www.gstatic.com",
].join(" ");

const UPLOADTHING_DOMAINS = ["https://*.ufs.sh", "https://utfs.io"].join(" ");

const isProd = process.env.NODE_ENV === "production";
const cspScriptSrc = ["'self'", ...(isProd ? [] : ["'unsafe-eval'", "'unsafe-inline'"]), GOOGLE_TRANSLATE_DOMAINS].join(" ");
const cspStyleSrc = ["'self'", "'unsafe-inline'", GOOGLE_TRANSLATE_DOMAINS].join(" ");

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
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            `script-src ${cspScriptSrc}`,
            `style-src ${cspStyleSrc}`,
            `img-src 'self' data: blob: https://lh3.googleusercontent.com https://fonts.gstatic.com https://static.licdn.com ${UPLOADTHING_DOMAINS} ${GOOGLE_TRANSLATE_DOMAINS}`,
            `font-src 'self' data: https://fonts.gstatic.com ${GOOGLE_TRANSLATE_DOMAINS}`,
            `connect-src 'self' https://api.resend.com ${UPLOADTHING_DOMAINS} ${GOOGLE_TRANSLATE_DOMAINS} https://*.sentry.io https://sentry.io`,
            `media-src 'self' data: blob: ${UPLOADTHING_DOMAINS}`,
            `worker-src 'self' blob: ${GOOGLE_TRANSLATE_DOMAINS}`,
            `frame-src 'self' ${GOOGLE_TRANSLATE_DOMAINS}`,
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
          ].join("; "),
        },
      ],
    },
    { source: "/api/auth/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    { source: "/api/files/:fileId", headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }] },
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
