import { Metadata } from 'next';
import StaticPageLayout from '@/components/StaticPageLayout';

export const metadata: Metadata = {
  title: 'About ALCOIN - Digital Rewards Platform',
  description: 'Learn about ALCOIN, a digital rewards platform that allows users to earn money by completing tasks, watching ads, referring friends, and trading on the AL Coin Market.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About ALCOIN',
    description: 'Learn about ALCOIN, a digital rewards platform for earning, trading, and growing your funds.',
    url: 'https://alcoinng.com/about',
  },
};

export default function AboutPage() {
  return (
    <StaticPageLayout title="About ALCOIN" description="Learn more about our platform, mission, and how ALCOIN works.">
      <div className="space-y-8">
        {/* Section: Who We Are */}
        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Who We Are</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN is a digital rewards platform designed to create simple and secure earning opportunities for its members. Built with transparency and user experience at its core, ALCOIN provides multiple ways to earn, invest, and withdraw funds through a single, easy-to-use platform.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our platform is tailored for users who want to make the most of their spare time. Whether you are a student, a professional, or anyone looking for additional income, ALCOIN offers accessible tools to help you achieve your financial goals.
          </p>
        </section>

        {/* Section: Our Mission */}
        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our mission is to empower individuals by providing a reliable, transparent, and user-friendly platform where they can earn real rewards through everyday activities. We believe that everyone deserves access to simple earning opportunities, and we are committed to making that a reality through ALCOIN.
          </p>
        </section>

        {/* Section: How It Works */}
        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">How ALCOIN Works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center shrink-0 text-sm font-bold text-gold-foreground">1</div>
              <div>
                <h3 className="font-medium mb-1">Create Your Account</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Sign up by providing your basic information to create your free ALCOIN account. The registration process is quick and straightforward.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center shrink-0 text-sm font-bold text-gold-foreground">2</div>
              <div>
                <h3 className="font-medium mb-1">Activate Your Account</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Request an activation code through WhatsApp, complete the required payment, receive your unique code from the administrator, and activate your account.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center shrink-0 text-sm font-bold text-gold-foreground">3</div>
              <div>
                <h3 className="font-medium mb-1">Start Earning</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">After activation, watch advertisements for rewards, complete available tasks, invite friends using your referral link, and participate in the ALCOIN Market.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center shrink-0 text-sm font-bold text-gold-foreground">4</div>
              <div>
                <h3 className="font-medium mb-1">Withdraw Your Earnings</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Submit a withdrawal request from an eligible wallet. Once approved by the administrator, your earnings will be processed and sent to your bank account.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Features */}
        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Platform Features</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass-strong rounded-xl p-4">
              <h3 className="font-medium text-gold mb-2">Watch &amp; Earn</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Watch curated video advertisements and earn AL Coin rewards directly credited to your wallet.</p>
            </div>
            <div className="glass-strong rounded-xl p-4">
              <h3 className="font-medium text-gold mb-2">Task Rewards</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Complete simple tasks such as following social media accounts or downloading apps to earn instant rewards.</p>
            </div>
            <div className="glass-strong rounded-xl p-4">
              <h3 className="font-medium text-gold mb-2">Referral Program</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Share your unique referral code or link with friends. When they sign up and activate, you earn a bonus reward.</p>
            </div>
            <div className="glass-strong rounded-xl p-4">
              <h3 className="font-medium text-gold mb-2">AL Coin Market</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Predict whether the AL Coin price will go up or down within a selected duration. Correct predictions earn you a profit on your investment.</p>
            </div>
          </div>
        </section>

        {/* Section: Wallets */}
        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Wallet System</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN uses three dedicated wallets to help you manage your earnings clearly and securely:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 glass-strong rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">
                <span className="text-gold font-bold text-sm">R</span>
              </div>
              <div>
                <h3 className="font-medium">Reward Wallet</h3>
                <p className="text-sm text-muted-foreground">Receives earnings from watching ads, completing tasks, and referral bonuses.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 glass-strong rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-alcoin-blue/15 flex items-center justify-center shrink-0">
                <span className="text-alcoin-blue font-bold text-sm">D</span>
              </div>
              <div>
                <h3 className="font-medium">Deposit Wallet</h3>
                <p className="text-sm text-muted-foreground">Used for funding your account through admin-generated deposit codes.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 glass-strong rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <span className="text-emerald-400 font-bold text-sm">P</span>
              </div>
              <div>
                <h3 className="font-medium">Profit Wallet</h3>
                <p className="text-sm text-muted-foreground">Receives profits earned from successful trades on the AL Coin Market.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  );
}
