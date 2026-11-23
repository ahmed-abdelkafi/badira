import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/**
 * Deployed to Cloudflare Workers with OpenNext. Cache Components are NOT
 * enabled: OpenNext does not fully support them yet (opennextjs-cloudflare
 * PR #1318). Pages render per request from D1 instead.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    authInterrupts: true,
    serverActions: { bodySizeLimit: "50mb" },
  },
  images: {
    // R2 media is resized by /media/[...key] via the Cloudflare Images binding.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920, 2400],
    imageSizes: [96, 160, 256, 384, 512],
    qualities: [60, 75, 85],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      { source: "/admin-sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;

// Local D1 / R2 / Images bindings (Miniflare) during `next dev`.
initOpenNextCloudflareForDev();
