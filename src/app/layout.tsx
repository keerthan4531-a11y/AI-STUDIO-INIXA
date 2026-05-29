import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inixa AI Studio — The Future of AI, Reimagined",
  description: "A unified AI workspace for visionaries, engineers, and creators. Chat with GPT-4, Gemini, Claude. Generate images, videos, code, and more — all in one premium platform.",
  keywords: "AI, ChatGPT, Gemini, Claude, AI Studio, Image Generation, Video AI, Code Generation, Vibe Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon-512x512.png" />
        <meta name="theme-color" content="#030712" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="bg-[#030712]">{children}</body>
    </html>
  );
}
