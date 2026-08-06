import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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

export const metadata: Metadata = {
  title: "ALCOIN - Digital Rewards Platform",
  description: "Earn rewards, invest, and withdraw with ALCOIN. Activate your account, complete tasks, watch ads, and trade on the AL Coin Market.",
  keywords: ["ALCOIN", "rewards", "earn money", "digital rewards", "AL Coin Market"],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪙</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
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
                background: 'rgba(255,255,255,0.80)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.85)',
                color: '#e8e8ed',
              },
            }}
          />
        </ClerkProvider>
      </body>
    </html>
  );
}