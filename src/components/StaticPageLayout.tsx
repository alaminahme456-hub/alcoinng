import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  title: string;
  description: string;
}

export default function StaticPageLayout({ children, title, description }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/alcoin-logo.jpg" alt="ALCOIN" className="w-9 h-9 rounded-lg" />
            <span className="text-lg font-bold gradient-gold-text">ALCOIN</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/"
              className="text-sm font-medium px-4 py-2 rounded-lg gradient-gold text-gold-foreground hover:opacity-90 transition-opacity"
            >
              Join Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors mb-8"
          >
            &larr; Back to Home
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            <span className="gradient-gold-text">{title}</span>
          </h1>
          <p className="text-muted-foreground mb-10">{description}</p>

          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/alcoin-logo.jpg" alt="ALCOIN" className="w-6 h-6 rounded" />
                <span className="text-sm font-semibold gradient-gold-text">ALCOIN</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A digital rewards platform that turns your spare time into earning.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Platform</h4>
              <div className="space-y-2">
                <Link href="/" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Home</Link>
                <Link href="/about" className="block text-sm text-muted-foreground hover:text-gold transition-colors">About Us</Link>
                <Link href="/contact" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Legal</h4>
              <div className="space-y-2">
                <Link href="/terms" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Terms &amp; Conditions</Link>
                <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Privacy Policy</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Get Started</h4>
              <div className="space-y-2">
                <Link href="/" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Sign Up</Link>
                <Link href="/" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Sign In</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ALCOIN. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-gold transition-colors">Terms</Link>
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-gold transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
