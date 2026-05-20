import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "RepoLens — Understand any codebase in minutes",
  description: "Analyze GitHub repos and ZIP archives. Generate dependency graphs, call graphs, architecture diagrams, and chat with an AI that knows your entire codebase.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
