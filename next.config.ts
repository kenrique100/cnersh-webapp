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
      // Vercel Blob removed — files now served from /api/files/[fileId]
    ],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: {
      // 10 MB limit is sufficient for DB-stored files
      bodySizeLimit: "10mb",
    },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Google Translate needs unsafe-eval for its runtime JS injection
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://*.google.com",
            "style-src 'self' 'unsafe-inline' https://translate.googleapis.com https://www.gstatic.com https://*.google.com",
            // img-src must include translate.google.com and gstatic for Google Translate UI images
            "img-src 'self' data: blob: https://lh3.googleusercontent.com https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://fonts.gstatic.com https://static.licdn.com https://*.google.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            // connect-src: removed Vercel Blob, kept Google Translate endpoints
            "connect-src 'self' https://api.resend.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://*.google.com",
            // media-src: blob: and data: for locally uploaded files rendered as object URLs
            "media-src 'self' data: blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            // frame-src: Google Translate requires both translate.google.com AND *.google.com
            // because the iframe src varies by locale (e.g. translate.google.com/translate_c?...)
            "frame-src https://translate.google.com https://translate.googleapis.com https://*.google.com",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
          ].join("; "),
        },
      ],
    },
    {
      source: "/api/auth/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store",
        },
      ],
    },
    {
      // Allow browser to cache served files for 1 hour, revalidate with ETag
      source: "/api/files/:fileId",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=3600, must-revalidate",
        },
      ],
    },
  ],
};

export default nextConfig;
