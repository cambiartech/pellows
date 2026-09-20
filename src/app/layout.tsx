import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "Pellows — shortlets you can book from chat",
    template: "%s · Pellows",
  },
  description:
    "Search live shortlets from onboarded agencies. Book on web or WhatsApp. Pay with card, bank, or crypto. Built for guests and AI agents.",
  openGraph: {
    title: "Pellows — from chat to keys",
    description:
      "Agency shortlets · fast search · book via WhatsApp or AI agents · pay in-app.",
    type: "website",
    siteName: "Pellows",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pellows — from chat to keys",
    description:
      "Search live shortlets. Book from chat. Pay in-app.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased text-[var(--ink)] bg-[var(--canvas)]">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
