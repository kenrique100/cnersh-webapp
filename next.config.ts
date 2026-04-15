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
      // Files now served from /api/files/[fileId] — no external blob storage
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
        // ❌ X-Frame-Options: DENY removed — it unconditionally blocks ALL framing,
        //    including Google Translate's iframe wrapper. Frame security is now
        //    handled exclusively by the CSP frame-ancestors directive below,
        //    which is more granular and lets Google Translate work properly.
        { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
        { key: "X-XSS-Protection",          value: "1; mode=block" },
        { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",

            // Google Translate injects scripts at runtime — unsafe-eval + unsafe-inline required
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://*.google.com",

            "style-src 'self' 'unsafe-inline' https://translate.googleapis.com https://www.gstatic.com https://*.google.com",

            // img-src: all Google Translate image/icon CDNs
            "img-src 'self' data: blob: https://lh3.googleusercontent.com https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://fonts.gstatic.com https://static.licdn.com https://*.google.com",

            "font-src 'self' data: https://fonts.gstatic.com",

            // connect-src: Vercel Blob removed; Google Translate APIs kept
            "connect-src 'self' https://api.resend.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://*.google.com",

            // media-src: blob: + data: for in-browser file preview
            "media-src 'self' data: blob:",

            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",

            // frame-src: origins this page may embed in iframes
            "frame-src 'self' https://translate.google.com https://translate.googleapis.com https://*.google.com",

            // frame-ancestors: who may embed THIS page.
            // Google Translate wraps translated pages in its own iframe — must be allowed here.
            // Every other origin is blocked to prevent clickjacking.
            "frame-ancestors https://translate.google.com https://translate.googleapis.com https://*.google.com",

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
      // Cache served files for 1 hour; ETag handles revalidation
      source: "/api/files/:fileId",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
    },
  ],
};

export default nextConfig;
