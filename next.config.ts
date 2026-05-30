import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
