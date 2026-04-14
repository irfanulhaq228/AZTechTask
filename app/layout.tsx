import type { Metadata } from "next";

import { NavBar } from "@/components/NavBar";

import "./globals.css";

export const metadata: Metadata = {
  title: "CSV Product Processing System",
  description: "Upload CSV files, process products in the background, and review insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
