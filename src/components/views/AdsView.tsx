'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Gift, ExternalLink } from 'lucide-react';

const CPALEAD_OFFERWALL_URL = 'https://www.appstorevault.mobi/wall/FhgCA4tm';

export default function AdsView() {
  const { setView, user } = useAppStore();

  const cpaleadOfferwallUrl = user?.clerkId
    ? CPALEAD_OFFERWALL_URL + '?subid=' + encodeURIComponent(user.clerkId)
    : null;

  const openOffers = () => {
    if (!cpaleadOfferwallUrl) {
      toast.error('Please log in before opening offers.');
      return;
    }

    window.open(cpaleadOfferwallUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-30 glass-strong px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setView('dashboard')}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
            <Gift className="w-4 h-4 text-gold-foreground" />
          </div>
          <h1 className="font-semibold text-lg">Offers Center</h1>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border border-gold/20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl gradient-gold/20 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-gold" />
          </div>

          <h2 className="text-xl font-semibold">Complete Offers</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Complete eligible offers and earn rewards based on each offer's stated payout. Offer availability and rewards may vary.
          </p>

          <Button
            onClick={openOffers}
            className="gradient-gold text-gold-foreground font-semibold mt-6 h-11 px-6"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Available Offers
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
