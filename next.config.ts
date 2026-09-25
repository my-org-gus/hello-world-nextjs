import type { NextConfig } from "next";

const basePath = process.env.BASE_URL || "";

// CSP en modo Report-Only: registra violaciones en la consola sin bloquear.
// `data:` y `blob:` en img-src los usa el troquelado en canvas.
// Webflow Cloud sirve los assets desde otro origen (ASSETS_PREFIX) y agrega
// su badge desde un CDN propio.
const assetsOrigin = /^https?:\/\//.test(process.env.ASSETS_PREFIX ?? "") ? new URL(process.env.ASSETS_PREFIX!).origin : "";
const self = ["'self'", assetsOrigin].filter(Boolean).join(" ");
const csp = [
  "default-src 'self'",
  `script-src ${self} 'unsafe-inline'`,
  `style-src ${self} 'unsafe-inline'`,
  `img-src ${self} data: blob: https://d3e54v103j8qbb.cloudfront.net`,
  `font-src ${self}`,
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  ...(basePath && {
    basePath,
    assetPrefix: process.env.ASSETS_PREFIX || basePath,
  }),
};

export default nextConfig;

// Enable getCloudflareContext() in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
