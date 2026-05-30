import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        // Apply COEP/COOP only to non-vibe-studio routes
        source: "/((?!vibe-studio).*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Cloudflare Pages serves built assets at /assets/ instead of /vibe-studio/assets/
        source: "/vibe-studio/assets/:path*",
        destination: "https://bolt-3rv.pages.dev/assets/:path*",
      },
      {
        // Proxy public static files that are served from the root
        source: "/vibe-studio/:path(inspector-script\\.js|favicon\\.ico|favicon\\.svg|apple-touch-icon.*\\.png|logo.*\\.png|logo\\.svg|social_preview_index\\.jpg|icons/.*)",
        destination: "https://bolt-3rv.pages.dev/:path",
      },
      {
        // Proxy all other requests keeping /vibe-studio prefix for Remix router
        source: "/vibe-studio",
        destination: "https://bolt-3rv.pages.dev/vibe-studio/",
      },
      {
        source: "/vibe-studio/:path*",
        destination: "https://bolt-3rv.pages.dev/vibe-studio/:path*",
      },
    ];
  },
};
export default nextConfig;
