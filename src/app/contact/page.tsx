import { Metadata } from 'next';
import StaticPageLayout from '@/components/StaticPageLayout';

export const metadata: Metadata = {
  title: 'Contact Us - ALCOIN',
  description: 'Get in touch with the ALCOIN team for support, questions, or feedback about our digital rewards platform.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us - ALCOIN',
    description: 'Get in touch with the ALCOIN team.',
    url: 'https://alcoinng.com/contact',
  },
};

export default function ContactPage() {
  return (
    <StaticPageLayout title="Contact Us" description="We'd love to hear from you. Reach out through any of the channels below.">
      <div className="space-y-6">
        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Get In Touch</h2>
          <p className="text-muted-foreground leading-relaxed">
            Whether you have a question about our platform, need help with your account, or want to share feedback, we are here to help. Use any of the contact methods below and our team will respond as soon as possible.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8">
          <div className="space-y-6">
            {/* WhatsApp */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">WhatsApp</h3>
                <p className="text-sm text-muted-foreground mt-1">Reach us on WhatsApp for the fastest response. This is our primary support channel for account activation, deposits, and general inquiries.</p>
                <p className="text-sm text-emerald-400 mt-2 font-medium">Chat with us on WhatsApp</p>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Email */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-alcoin-blue/15 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-alcoin-blue" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Email</h3>
                <p className="text-sm text-muted-foreground mt-1">For non-urgent inquiries, account issues, or formal requests, you can email us and we will respond within 24 to 48 hours.</p>
                <p className="text-sm text-alcoin-blue mt-2 font-medium">support@alcoinng.com</p>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Website */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Website</h3>
                <p className="text-sm text-muted-foreground mt-1">Visit the ALCOIN platform to sign up, access your dashboard, or explore our features.</p>
                <p className="text-sm text-gold mt-2 font-medium">https://alcoinng.com</p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="glass-strong rounded-xl p-4">
              <h3 className="font-medium mb-1">How do I activate my account?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Request an activation code through our WhatsApp channel. Complete the required payment, receive your code, and enter it in the Activate section of your ALCOIN dashboard.</p>
            </div>
            <div className="glass-strong rounded-xl p-4">
              <h3 className="font-medium mb-1">How long do withdrawals take?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Withdrawal requests are reviewed and processed by our administrator. Processing times may vary, but we strive to complete all approved withdrawals as quickly as possible.</p>
            </div>
            <div className="glass-strong rounded-xl p-4">
              <h3 className="font-medium mb-1">I did not receive my referral bonus.</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Referral bonuses are credited when your referred user successfully activates their account. If you believe there is an error, contact us on WhatsApp with your referral code and the referred user&apos;s details.</p>
            </div>
            <div className="glass-strong rounded-xl p-4">
              <h3 className="font-medium mb-1">How do I fund my Deposit Wallet?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Go to the Deposit section in your dashboard, request a deposit code through WhatsApp, make the payment, receive your code, and redeem it on the platform.</p>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Support Hours</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our WhatsApp support is available during business hours. Email inquiries are typically responded to within 24 to 48 hours. We appreciate your patience and will do our best to resolve your issue as quickly as possible.
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
