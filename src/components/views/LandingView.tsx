'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  UserPlus,
  ShieldCheck,
  Wallet,
  Eye,
  Users,
  TrendingUp,
  Banknote,
  BarChart3,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const steps = [
  {
    num: 1,
    title: 'Create Your Account',
    desc: 'Sign up by providing your basic information to create your free ALCOIN account.',
    icon: UserPlus,
  },
  {
    num: 2,
    title: 'Activate Your Account',
    desc: 'Request an activation code through WhatsApp, complete the required payment, receive your unique code from the administrator, and activate your account by entering the code.',
    icon: ShieldCheck,
  },
  {
    num: 3,
    title: 'Start Earning',
    desc: 'After activation, you can watch advertisements for rewards, complete available tasks, invite friends using your referral link, and participate in the ALCOIN Market.',
    icon: Coins,
    highlights: ['Watch advertisements for rewards', 'Complete available tasks', 'Invite friends using your referral link', 'Participate in the ALCOIN Market'],
  },
  {
    num: 4,
    title: 'Fund Your Deposit Wallet',
    desc: 'Choose the amount you want to deposit, request a deposit code through WhatsApp, receive your code from the administrator after payment, and redeem it to credit your Deposit Wallet.',
    icon: Wallet,
  },
  {
    num: 5,
    title: 'Trade in the ALCOIN Market',
    desc: 'Select the wallet you want to use, choose Buy or Sell, enter your investment amount, select a trade duration, and place your trade. If your prediction is correct, you\'ll receive your investment back along with the calculated profit according to the selected wallet\'s rules.',
    icon: BarChart3,
  },
  {
    num: 6,
    title: 'Withdraw Your Earnings',
    desc: 'Submit a withdrawal request from an eligible wallet. Once approved by the administrator, your earnings will be processed according to the platform\'s withdrawal policy.',
    icon: Banknote,
  },
];

const features = [
  { icon: Eye, label: 'Watch Ads', desc: 'Earn rewards by watching curated advertisements.' },
  { icon: Coins, label: 'Complete Tasks', desc: 'Finish simple tasks and get paid instantly.' },
  { icon: Users, label: 'Refer Friends', desc: 'Grow your earnings through referral bonuses.' },
  { icon: TrendingUp, label: 'ALCOIN Market', desc: 'Predict market movements and multiply your gains.' },
];

export default function LandingView() {
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <img src="/alcoin-logo.jpg" alt="ALCOIN" className="w-9 h-9 rounded-lg" />
            <span className="text-lg font-bold gradient-gold-text">ALCOIN</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setView('login')}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Button>
            <Button
              onClick={() => setView('register')}
              className="gradient-gold text-[#0a0a0f] font-semibold hover:opacity-90 transition-opacity"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Decorative glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#d4af37]/[0.06] blur-[120px] pointer-events-none" />

        <motion.div
          initial="hidden"
          animate="visible"
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <motion.div custom={0} variants={fadeUp}>
            <img
              src="/alcoin-logo.jpg"
              alt="ALCOIN"
              className="w-20 h-20 rounded-2xl gold-glow mx-auto mb-6"
            />
          </motion.div>
          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4"
          >
            Welcome to{' '}
            <span className="gradient-gold-text">ALCOIN</span>
          </motion.h1>
          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-xl sm:text-2xl text-gold font-medium mb-6"
          >
            Turn your spare time into earning.
          </motion.p>
          <motion.p
            custom={3}
            variants={fadeUp}
            className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed mb-10"
          >
            ALCOIN is a digital rewards platform that allows users to earn money by completing
            simple tasks, watching advertisements, referring friends, and participating in the
            ALCOIN Market. With secure wallets and a user-friendly experience, ALCOIN provides
            multiple ways to grow your earnings from one platform.
          </motion.p>
          <motion.div custom={4} variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => setView('register')}
              className="gradient-gold text-[#0a0a0f] font-semibold h-12 px-8 hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Sign Up
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView('login')}
              className="border-gold/30 text-gold hover:bg-gold/10 h-12 px-8"
            >
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── About ─── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-bold text-center mb-12"
            >
              About <span className="gradient-gold-text">ALCOIN</span>
            </motion.h2>
            <motion.div
              custom={1}
              variants={fadeUp}
              className="glass rounded-2xl p-8 sm:p-10 space-y-5 text-muted-foreground text-sm sm:text-base leading-relaxed"
            >
              <p>
                ALCOIN is designed to create earning opportunities through a simple and secure digital
                platform. Members can complete approved activities to earn rewards, fund their account
                using admin-generated deposit codes, and participate in the ALCOIN Market prediction
                feature.
              </p>
              <p>
                The platform uses three dedicated wallets — 
                <span className="text-foreground font-medium">Reward Wallet</span>,{' '}
                <span className="text-foreground font-medium">Deposit Wallet</span>, and{' '}
                <span className="text-foreground font-medium">Profit Wallet</span>
                — to help users manage their earnings and investments clearly. Every transaction is
                securely recorded, and important actions such as account activation, deposits, and
                withdrawals are managed through a controlled verification process.
              </p>
              <p>
                Whether you're a new user or an active member, ALCOIN provides an easy-to-use
                experience with transparent features and a modern interface.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Feature Cards ─── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.label}
                  custom={i}
                  variants={fadeUp}
                  className="glass rounded-2xl p-6 text-center hover:gold-glow transition-shadow duration-300"
                >
                  <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-[#0a0a0f]" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{f.label}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold text-center mb-14"
          >
            How <span className="gradient-gold-text">ALCOIN</span> Works
          </motion.h2>

          <div className="relative space-y-8">
            {/* Vertical line */}
            <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent hidden sm:block" />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                  custom={i}
                  variants={fadeUp}
                  className="relative flex gap-5 sm:gap-8"
                >
                  {/* Step circle */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center shadow-lg">
                      <Icon className="w-5 h-5 text-[#0a0a0f]" />
                    </div>
                  </div>

                  {/* Content card */}
                  <div className="glass rounded-2xl p-6 sm:p-7 flex-1 hover:gold-glow transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold text-gold bg-gold/10 border border-gold/20 px-2.5 py-0.5 rounded-full">
                        Step {step.num}
                      </span>
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.desc}
                    </p>
                    {step.highlights && (
                      <ul className="mt-3 space-y-1.5">
                        {step.highlights.map((h) => (
                          <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-gold mt-0.5">•</span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-3xl mx-auto text-center relative"
        >
          {/* Glow behind CTA */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[400px] h-[200px] rounded-full bg-[#d4af37]/[0.08] blur-[100px]" />
          </div>

          <motion.h2
            custom={0}
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold mb-6 relative z-10"
          >
            Ready to <span className="gradient-gold-text">Get Started</span>?
          </motion.h2>
          <motion.p
            custom={1}
            variants={fadeUp}
            className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base leading-relaxed mb-10 relative z-10"
          >
            Join ALCOIN today and discover a simple way to earn, trade, and grow your funds on one
            secure platform.
          </motion.p>
          <motion.div
            custom={2}
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10"
          >
            <Button
              size="lg"
              onClick={() => setView('register')}
              className="gradient-gold text-[#0a0a0f] font-semibold h-12 px-8 hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Account
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView('login')}
              className="border-gold/30 text-gold hover:bg-gold/10 h-12 px-8"
            >
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
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
                <a href="/" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Home</a>
                <a href="/about" className="block text-sm text-muted-foreground hover:text-gold transition-colors">About Us</a>
                <a href="/contact" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Legal</h4>
              <div className="space-y-2">
                <a href="/terms" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Terms &amp; Conditions</a>
                <a href="/privacy" className="block text-sm text-muted-foreground hover:text-gold transition-colors">Privacy Policy</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Get Started</h4>
              <div className="space-y-2">
                <button onClick={() => setView('register')} className="block text-sm text-muted-foreground hover:text-gold transition-colors">Sign Up</button>
                <button onClick={() => setView('login')} className="block text-sm text-muted-foreground hover:text-gold transition-colors">Sign In</button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ALCOIN. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="/terms" className="text-xs text-muted-foreground hover:text-gold transition-colors">Terms</a>
              <a href="/privacy" className="text-xs text-muted-foreground hover:text-gold transition-colors">Privacy</a>
              <a href="/contact" className="text-xs text-muted-foreground hover:text-gold transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
