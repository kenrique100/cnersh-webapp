import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
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
        { key: "X-Content-Type-Options",  value: "nosniff" },
        { key: "X-Frame-Options",          value: "DENY" },
        { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
        { key: "X-XSS-Protection",         value: "1; mode=block" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",

            // Google Translate needs translate.google.com, translate.googleapis.com, www.gstatic.com
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
            + " https://translate.google.com"
            + " https://translate.googleapis.com"
            + " https://www.gstatic.com",

            "style-src 'self' 'unsafe-inline'"
            + " https://translate.googleapis.com"
            + " https://www.gstatic.com",

            "img-src 'self' data: blob:"
            + " https://lh3.googleusercontent.com"
            + " https://fonts.gstatic.com"
            + " https://static.licdn.com"
            + " https://translate.googleapis.com"
            + " https://translate.google.com"
            + " https://www.gstatic.com",

            "font-src 'self' data: https://fonts.gstatic.com https://www.gstatic.com",

            "connect-src 'self'"
            + " https://api.resend.com"
            + " https://translate.googleapis.com"
            + " https://translate.google.com"
            + " https://www.gstatic.com",

            "media-src 'self' data: blob:",

            // Google Translate runs a web worker from gstatic
            "worker-src 'self' blob: https://www.gstatic.com",

            // Google Translate widget iframe lives on translate.googleapis.com & gstatic
            "frame-src 'self'"
            + " https://translate.google.com"
            + " https://translate.googleapis.com"
            + " https://www.gstatic.com",

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
