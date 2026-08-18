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
  keywords: ["ALCOIN", "digital rewards", "earn money online", "AL Coin Market", "watch and earn", "referral program", "Nigeria", "make money online", "task rewards", "ad rewards"],
  authors: [{ name: 'ALCOIN' }],
  creator: 'ALCOIN',
  publisher: 'ALCOIN',
  metadataBase: new URL('https://alcoinng.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://alcoinng.vercel.app',
    siteName: 'ALCOIN',
    title: 'ALCOIN - Digital Rewards Platform',
    description: 'Earn rewards by watching ads, completing tasks, referring friends, and trading on the AL Coin Market. Join ALCOIN today!',
    images: [
      {
        url: '/alcoin-logo.jpg',
        width: 512,
        height: 512,
        alt: 'ALCOIN Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'ALCOIN - Digital Rewards Platform',
    description: 'Earn rewards by watching ads, completing tasks, referring friends, and trading on the AL Coin Market.',
    images: ['/alcoin-logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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