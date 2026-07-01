import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoFantasy Platform",
  description: "Baseline platform for the CryptoFantasy fantasy-crypto contest product.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
