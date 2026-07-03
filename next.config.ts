import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        // Apply COEP/COOP only to non-vibe-studio routes
        source: "/((?!vibe-studio).*)",
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { 
            key: 'Content-Security-Policy',
            value: "default-src 'self'; frame-src 'self' https://*.codesandbox.io; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src * data: blob:; media-src * data: blob:; connect-src 'self' ws: wss: https: http://localhost:* http://127.0.0.1:*; worker-src 'self' blob:; frame-ancestors 'none';"
          },
        ],
      },
    ];
  },
  async rewrites() {
    const isDev = process.env.NODE_ENV !== "production";
    const boltUrl = isDev ? "http://127.0.0.1:5173" : "https://bolt-3rv.pages.dev";

    return [
      {
        // Cloudflare Pages serves built assets at /assets/ instead of /vibe-studio/assets/
        source: "/vibe-studio/assets/:path*",
        destination: `${boltUrl}/assets/:path*`,
      },
      {
        // Proxy public static files that are served from the root
        source: "/vibe-studio/:path(inspector-script\\.js|favicon\\.ico|favicon\\.svg|apple-touch-icon.*\\.png|logo.*\\.png|logo\\.svg|social_preview_index\\.jpg|icons/.*)",
        destination: `${boltUrl}/:path`,
      },
      {
        // Proxy all other requests keeping /vibe-studio prefix for Remix router
        source: "/vibe-studio",
        destination: `${boltUrl}/vibe-studio/`,
      },
      {
        source: "/vibe-studio/:path*",
        destination: `${boltUrl}/vibe-studio/:path*`,
      },
    ];
  },
};
export default nextConfig;
