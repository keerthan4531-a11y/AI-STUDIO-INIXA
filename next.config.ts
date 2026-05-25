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
        // Proxy all /vibe-studio requests to the Bolt dev server
        source: "/vibe-studio",
        destination: "http://127.0.0.1:5173/vibe-studio/",
      },
      {
        source: "/vibe-studio/:path*",
        destination: "http://127.0.0.1:5173/vibe-studio/:path*",
      },
    ];
  },
};
export default nextConfig;
