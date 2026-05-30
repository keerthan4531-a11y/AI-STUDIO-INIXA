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
        // Proxy all /vibe-studio requests to the deployed Cloudflare Pages app
        source: "/vibe-studio",
        destination: "https://bolt-3rv.pages.dev/",
      },
      {
        source: "/vibe-studio/:path*",
        destination: "https://bolt-3rv.pages.dev/:path*",
      },
    ];
  },
};
export default nextConfig;
