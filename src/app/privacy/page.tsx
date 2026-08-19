import { Metadata } from 'next';
import StaticPageLayout from '@/components/StaticPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy - ALCOIN',
  description: 'Read the ALCOIN privacy policy to understand how we collect, use, and protect your personal information and data.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy - ALCOIN',
    description: 'How ALCOIN collects, uses, and protects your personal data.',
    url: 'https://alcoinng.com/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <StaticPageLayout title="Privacy Policy" description="Last updated: August 2025. Your privacy matters to us.">
      <div className="space-y-6">
        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN ("we", "us", or "our") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our platform. Please read this policy carefully. By using ALCOIN, you consent to the data practices described in this policy.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium mb-1">2.1 Personal Information</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">When you register an account, we collect your full name, email address, phone number, and username. During account activation and withdrawals, we may collect your bank name, bank account number, and bank account name. This information is necessary to provide our services and process transactions.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">2.2 Usage Data</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">We automatically collect information about your interactions with the platform, including pages visited, features used, ad views completed, tasks completed, trades placed, and the dates and times of these activities. This data helps us improve our services and personalize your experience.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">2.3 Device Information</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">We may collect device-specific information such as your IP address, browser type, operating system, device model, and screen resolution for security and analytics purposes.
              </p>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li className="leading-relaxed">To create and manage your account</li>
            <li className="leading-relaxed">To process activation codes and deposit redemptions</li>
            <li className="leading-relaxed">To credit rewards, task earnings, and trading profits to your wallets</li>
            <li className="leading-relaxed">To process withdrawal requests and send payments to your bank account</li>
            <li className="leading-relaxed">To track referrals and credit referral bonuses</li>
            <li className="leading-relaxed">To send you notifications about your account activity</li>
            <li className="leading-relaxed">To detect and prevent fraud, abuse, and security threats</li>
            <li className="leading-relaxed">To improve our platform and develop new features</li>
            <li className="leading-relaxed">To comply with legal obligations</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">4. Information Sharing</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating the platform (such as payment processors), but only to the extent necessary for them to perform their services. We may also disclose information if required by law or to protect the rights and safety of ALCOIN, our users, or the public.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">5. Advertising</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN displays third-party advertisements through partners such as Google AdSense and other ad networks. These advertising partners may use cookies and similar technologies to serve ads based on your browsing activity. Please refer to the respective privacy policies of these advertising partners for more information about their data practices. You may opt out of personalized advertising through your device settings or the ad network&apos;s opt-out page.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">6. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard security measures to protect your personal information, including encrypted data transmission (SSL/TLS), secure authentication through Clerk, and restricted access to user data. However, no method of electronic storage or transmission is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">7. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your personal information for as long as your account is active or as needed to provide our services. If you request account deletion, we will remove your personal data within a reasonable timeframe, except where retention is required by law or for legitimate business purposes such as fraud prevention.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">8. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li className="leading-relaxed">Access the personal information we hold about you</li>
            <li className="leading-relaxed">Request correction of inaccurate or incomplete data</li>
            <li className="leading-relaxed">Request deletion of your personal data (subject to legal obligations)</li>
            <li className="leading-relaxed">Opt out of marketing communications</li>
            <li className="leading-relaxed">Withdraw consent where processing is based on consent</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            To exercise any of these rights, please contact us through our{' '}
            <a href="/contact" className="text-gold hover:underline">Contact page</a>.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">9. Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN uses cookies and similar tracking technologies for authentication, session management, and analytics. Essential cookies are required for the platform to function properly. You can manage your cookie preferences through your browser settings, but disabling essential cookies may affect your ability to use the platform.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">10. Children&apos;s Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child under 18 has provided us with personal data, we will take steps to delete such information promptly.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">11. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify users of significant changes through the platform or by email. The updated policy will be effective immediately upon posting. Your continued use of ALCOIN after any changes constitutes acceptance of the revised policy.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">12. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions about this Privacy Policy or our data practices, please visit our{' '}
            <a href="/contact" className="text-gold hover:underline">Contact page</a>.
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
