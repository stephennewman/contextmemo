import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/tracking/google-analytics";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = 'https://contextmemo.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Context Memo — AI Visibility Platform for B2B Teams',
    template: '%s | Context Memo',
  },
  description: 'Get your brand cited in ChatGPT, Claude, Perplexity, and Gemini. The premium AI visibility platform for B2B marketing teams.',
  keywords: ['AI visibility', 'AI search optimization', 'B2B marketing', 'AI citations', 'ChatGPT visibility', 'Claude visibility', 'Perplexity visibility', 'AI brand monitoring'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Context Memo',
    title: 'Context Memo — AI Visibility Platform for B2B Teams',
    description: 'Get your brand cited in ChatGPT, Claude, Perplexity, and Gemini. The premium AI visibility platform for B2B marketing teams.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Context Memo — AI Visibility Platform for B2B Teams',
    description: 'Get your brand cited in ChatGPT, Claude, Perplexity, and Gemini. The premium AI visibility platform for B2B marketing teams.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        {children}
        <GoogleAnalytics />
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
