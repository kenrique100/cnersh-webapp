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

            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",

            "style-src 'self' 'unsafe-inline'",

            "img-src 'self' data: blob: https://lh3.googleusercontent.com https://fonts.gstatic.com https://static.licdn.com",

            "font-src 'self' data: https://fonts.gstatic.com",

            "connect-src 'self' https://api.resend.com",

            "media-src 'self' data: blob:",

            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",

            "frame-src 'self'",

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
