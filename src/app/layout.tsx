import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#d4af37',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "ALCOIN - Digital Rewards Platform",
  description: "Earn rewards, invest, and withdraw with ALCOIN. Activate your account, complete tasks, watch ads, and trade on the AL Coin Market.",
  keywords: ["ALCOIN", "rewards", "earn money", "digital rewards", "AL Coin Market"],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ALCOIN',
  },
  icons: {
    icon: '/alcoin-logo.jpg',
    apple: '/icon-192x192.jpg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.jpg" />
        <meta name="google-adsense-account" content="ca-pub-9016878264107871" />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9016878264107871"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          async
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ClerkProvider>
          {children}
          <Toaster
            richColors
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e8e8ed',
              },
            }}
          />
        </ClerkProvider>
      </body>
    </html>
  );
}