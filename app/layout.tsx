import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GrammarMaster — Learn English Grammar the Smart Way",
  description: "Master English grammar with clear lessons, interactive exercises, and real examples. From tenses to punctuation — your complete grammar guide.",
  keywords: "English grammar, learn grammar, tenses, parts of speech, sentence structure, grammar exercises",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-slate-950 text-white">{children}</body>
    </html>
  );
}
