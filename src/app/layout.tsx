import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SECURE_TERM // AI_SYSTEM",
  description: "Secure terminal interface for advanced AI interactions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="crt-effect">{children}</body>
    </html>
  );
}
