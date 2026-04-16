import type { NextConfig } from "next";

// All Google domains required by the Translate widget (including the newer
// translate-pa.googleapis.com endpoint used for supported-language lookups)
const GOOGLE_TRANSLATE_DOMAINS = [
  "https://translate.google.com",
  "https://translate.googleapis.com",
  "https://translate-pa.googleapis.com",
  "https://www.gstatic.com",
].join(" ");

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  // Tell Next.js (and next/jest) to transpile these ESM-only packages
  transpilePackages: ["@exodus/bytes"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
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

            // translate-pa.googleapis.com is a newer Google Translate endpoint
            // that loads supported-language metadata as a JSONP <script> tag
            // inside the widget iframe (about:srcdoc). All four domains are needed.
            `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${GOOGLE_TRANSLATE_DOMAINS}`,

            `style-src 'self' 'unsafe-inline' ${GOOGLE_TRANSLATE_DOMAINS}`,

            "img-src 'self' data: blob:"
              + " https://lh3.googleusercontent.com"
              + " https://fonts.gstatic.com"
              + " https://static.licdn.com"
              + ` ${GOOGLE_TRANSLATE_DOMAINS}`,

            `font-src 'self' data: https://fonts.gstatic.com ${GOOGLE_TRANSLATE_DOMAINS}`,

            "connect-src 'self'"
              + " https://api.resend.com"
              + ` ${GOOGLE_TRANSLATE_DOMAINS}`,

            "media-src 'self' data: blob:",

            // Web worker loaded by the translate widget
            `worker-src 'self' blob: ${GOOGLE_TRANSLATE_DOMAINS}`,

            // The widget itself runs inside an iframe sourced from these domains
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

export default nextConfig;
