import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// All Google domains required by the Translate widget
const GOOGLE_TRANSLATE_DOMAINS = [
  "https://www.google.com",
  "https://translate.google.com",
  "https://translate.googleapis.com",
  "https://translate-pa.googleapis.com",
  "https://www.gstatic.com",
].join(" ");

// All UploadThing domains required for file uploads and serving
// - uploadthing.com       → API / presign endpoint
// - ingest.uploadthing.com → wildcard ingest nodes (sea1, iad1, etc.)
// - utfs.io / ufs.sh     → CDN domains that serve uploaded files
const UPLOADTHING_DOMAINS = [
  "https://uploadthing.com",
  "https://*.ingest.uploadthing.com",
  "https://utfs.io",
  "https://*.utfs.io",
  "https://ufs.sh",
  "https://*.ufs.sh",
].join(" ");

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  transpilePackages: ["@exodus/bytes"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // UploadThing CDN — serves all uploaded files
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.utfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ufs.sh",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
        pathname: "/**",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // instrumentationHook: true, // REMOVE THIS LINE - not needed
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options",   value: "nosniff" },
        { key: "X-Frame-Options",           value: "DENY" },
        { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
        { key: "X-XSS-Protection",          value: "1; mode=block" },
        { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",

            `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${GOOGLE_TRANSLATE_DOMAINS}`,

            `style-src 'self' 'unsafe-inline' ${GOOGLE_TRANSLATE_DOMAINS}`,

            // UploadThing CDN (utfs.io / ufs.sh) must be in img-src so uploaded images render
            "img-src 'self' data: blob:"
            + " https://lh3.googleusercontent.com"
            + " https://fonts.gstatic.com"
            + " https://static.licdn.com"
            + " https://utfs.io"
            + " https://*.utfs.io"
            + " https://ufs.sh"
            + " https://*.ufs.sh"
            + ` ${GOOGLE_TRANSLATE_DOMAINS}`,

            `font-src 'self' data: https://fonts.gstatic.com ${GOOGLE_TRANSLATE_DOMAINS}`,

            // UploadThing requires connect-src for:
            //   1. uploadthing.com       — presign + route handler API calls
            //   2. *.ingest.uploadthing.com — the actual multipart PUT upload
            //   3. utfs.io / ufs.sh      — HEAD checks after upload completes
            "connect-src 'self'"
            + " https://api.resend.com"
            + ` ${UPLOADTHING_DOMAINS}`
            + ` ${GOOGLE_TRANSLATE_DOMAINS}`
            // Add Sentry domains to connect-src
            + " https://*.sentry.io"
            + " https://sentry.io",

            "media-src 'self' data: blob: https://utfs.io https://*.utfs.io https://ufs.sh https://*.ufs.sh",

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
    {
      source: "/api/auth/:path*",
      headers: [{ key: "Cache-Control", value: "no-store" }],
    },
    {
      source: "/api/files/:fileId",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
    },
  ],
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "akentech",

  project: "cnersh-webapp",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
