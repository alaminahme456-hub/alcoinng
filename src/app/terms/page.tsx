import { Metadata } from 'next';
import StaticPageLayout from '@/components/StaticPageLayout';

export const metadata: Metadata = {
  title: 'Terms & Conditions - ALCOIN',
  description: 'Read the terms and conditions for using the ALCOIN digital rewards platform, including account rules, wallet policies, trading rules, and withdrawal guidelines.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms & Conditions - ALCOIN',
    description: 'Terms and conditions for the ALCOIN digital rewards platform.',
    url: 'https://alcoinng.com/terms',
  },
};

export default function TermsPage() {
  return (
    <StaticPageLayout title="Terms & Conditions" description="Last updated: August 2025. By using ALCOIN, you agree to these terms.">
      <div className="space-y-6">
        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using the ALCOIN platform (website, mobile app, or any related services), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the platform. ALCOIN reserves the right to update these terms at any time, and continued use of the platform constitutes acceptance of the revised terms.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">2. Account Registration</h2>
          <p className="text-muted-foreground leading-relaxed">
            To use ALCOIN, you must register an account by providing accurate and complete information, including your full name, email address, phone number, and a username. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years old or the legal age of majority in your jurisdiction to create an account.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Each user is allowed only one account. Creating multiple accounts may result in suspension or permanent termination of all associated accounts and forfeiture of any earnings.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">3. Account Activation</h2>
          <p className="text-muted-foreground leading-relaxed">
            After registration, your account must be activated before you can access earning features. Activation requires obtaining a valid activation code from the ALCOIN administrator through the designated WhatsApp channel and completing the associated payment. Activation codes are non-transferable and can only be used once.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">4. Earning Features</h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium mb-1">4.1 Watch &amp; Earn</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Users may earn rewards by watching video advertisements. Rewards are credited to the Reward Wallet upon successful completion of an ad view. ALCOIN reserves the right to limit the number of ad views per user per day. Attempting to manipulate or abuse the ad viewing system will result in account suspension.</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">4.2 Task Rewards</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Users may complete tasks listed on the platform to earn rewards. Tasks may include following social media accounts, downloading applications, or other actions as specified. Task rewards are credited upon verified completion. Falsely claiming task completion is prohibited and may result in account termination.</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">4.3 Referral Program</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Users can invite others to join ALCOIN using a unique referral code or link. A referral bonus is credited when a referred user successfully activates their account. Self-referrals, use of multiple accounts, or any form of referral manipulation is strictly prohibited.</p>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">5. AL Coin Market</h2>
          <p className="text-muted-foreground leading-relaxed">
            The AL Coin Market allows users to predict the price movement of AL Coin within a selected duration. Users select Buy (UP) or Sell (DOWN), enter an investment amount, and wait for the duration to expire. If the prediction is correct, the user receives their investment back along with a profit calculated using the applicable multiplier for the selected wallet.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Trading involves risk. Past results do not guarantee future outcomes. Users should only invest amounts they can afford to lose. ALCOIN is not a licensed financial institution, and the AL Coin Market is provided for entertainment purposes.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">6. Wallet System</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN provides three wallets: Reward Wallet (ad and task earnings), Deposit Wallet (funds deposited via deposit codes), and Profit Wallet (trading profits). Wallet balances are maintained in Nigerian Naira (NGN). Users may only withdraw from wallets that have reached the minimum withdrawal threshold set by the platform.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">7. Deposits</h2>
          <p className="text-muted-foreground leading-relaxed">
            Deposits are made by requesting a deposit code through the designated WhatsApp channel and completing the associated payment. Deposit codes are issued in specific denominations and can only be redeemed once. ALCOIN is not responsible for deposit codes that are lost, shared, or used by unauthorized parties.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">8. Withdrawals</h2>
          <p className="text-muted-foreground leading-relaxed">
            Withdrawal requests are subject to review and approval by the ALCOIN administrator. Processing times may vary. Users must provide accurate bank account details. ALCOIN is not responsible for delays caused by incorrect bank information or third-party banking systems. Withdrawal policies, including minimum amounts and eligible wallets, may be updated at any time.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">9. Prohibited Activities</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li className="leading-relaxed">Creating multiple accounts or using false identity information</li>
            <li className="leading-relaxed">Manipulating, exploiting, or abusing any earning feature</li>
            <li className="leading-relaxed">Using bots, scripts, or automated tools to interact with the platform</li>
            <li className="leading-relaxed">Engaging in fraudulent referral activity</li>
            <li className="leading-relaxed">Attempting to reverse, charge back, or dispute legitimate transactions</li>
            <li className="leading-relaxed">Harassing other users or ALCOIN staff</li>
            <li className="leading-relaxed">Violating any applicable laws or regulations</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">10. Account Suspension & Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN reserves the right to suspend or terminate any account that violates these terms, engages in prohibited activities, or behaves in a manner that is harmful to the platform or its users. Upon termination, any remaining wallet balances may be forfeited at the sole discretion of ALCOIN.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">11. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the platform&apos;s reliability, accuracy, or availability. ALCOIN shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of or inability to use the platform, including but not limited to loss of earnings, data, or profits.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">12. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            ALCOIN may modify these Terms and Conditions at any time. Users will be notified of significant changes through the platform or by email. Continued use of the platform after changes are made constitutes acceptance of the revised terms.
          </p>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">13. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms and Conditions, please visit our{' '}
            <a href="/contact" className="text-gold hover:underline">Contact page</a>.
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
