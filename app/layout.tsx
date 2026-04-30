import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AF Regional OS",
  description: "Anytime Fitness Regional Operations Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
