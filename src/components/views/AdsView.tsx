'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Gift, ExternalLink, RefreshCw } from 'lucide-react';

const CPALEAD_OFFERWALL_URL = 'https://www.appstorevault.mobi/wall/FhgCA4tm';

export default function AdsView() {
  const { setView, user, setWallets } = useAppStore();
  const [checkingReward, setCheckingReward] = useState(false);
  const [offerwallKey, setOfferwallKey] = useState(0);

  const cpaleadOfferwallUrl = useMemo(() => {
    if (!user?.clerkId) return null;
    return CPALEAD_OFFERWALL_URL + '?subid=' + encodeURIComponent(user.clerkId);
  }, [user?.clerkId]);

  const refreshWallet = useCallback(async (showToast = false) => {
    if (!user) return;
    setCheckingReward(true);
    try {
      const data = await apiFetch('/api/user/wallets');
      if (data) {
        const getBal = (w: any) =>
          typeof w === 'object' && w !== null ? Number(w.balance ?? 0) : Number(w ?? 0);

        setWallets({
          reward: getBal(data.reward),
          deposit: getBal(data.deposit),
          profit: getBal(data.profit),
        });

        if (showToast) {
          toast.success('Wallet refreshed. Any confirmed offer reward will appear here automatically.');
        }
      }
    } catch {
      if (showToast) toast.error('Could not refresh your wallet. Please try again.');
    } finally {
      setCheckingReward(false);
    }
  }, [setWallets, user]);

  // Refresh after returning from an offer and periodically while this page is open.
  useEffect(() => {
    refreshWallet();
    const interval = window.setInterval(() => refreshWallet(), 5000);
    const onFocus = () => refreshWallet();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshWallet]);

  const openOffers = () => {
    if (!cpaleadOfferwallUrl) {
      toast.error('Please log in before opening offers.');
      return;
    }
    window.open(cpaleadOfferwallUrl, '_blank', 'noopener,noreferrer');
  };

  if (!cpaleadOfferwallUrl) {
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
          <h1 className="font-semibold text-lg">Offers Center</h1>
        </header>
        <main className="px-4 pt-6 max-w-2xl mx-auto">
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Please log in to view available offers.</p>
            <Button onClick={() => setView('login')} className="gradient-gold text-gold-foreground mt-5">
              Sign In
            </Button>
          </div>
        </main>
      </div>
    );
  }

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

        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
            <Gift className="w-4 h-4 text-gold-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">Offers Center</h1>
            <p className="text-[10px] text-muted-foreground">Complete eligible offers & get paid</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshWallet(true)}
          disabled={checkingReward}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checkingReward ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Check Reward</span>
        </Button>
      </header>

      <main className="px-3 sm:px-4 pt-4 max-w-4xl mx-auto space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-gold/20 overflow-hidden"
        >
          <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Available Offers</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Offers are supplied by CPAlead and vary by country, device and eligibility.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOfferwallKey((k) => k + 1)}
              className="gap-2 w-full sm:w-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Offers
            </Button>
          </div>

          <div className="bg-black/20 min-h-[760px]">
            <iframe
              key={offerwallKey}
              title="ALCOIN Available Offers"
              src={cpaleadOfferwallUrl}
              className="w-full min-h-[760px] border-0"
              loading="eager"
              allow="fullscreen"
            />
          </div>
        </motion.div>

        <div className="glass rounded-2xl p-4 border border-emerald-500/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            After an advertiser confirms your completed offer, CPAlead sends a server-to-server
            conversion notification to ALCOIN. The reward is then credited to your Reward Wallet.
            You do not need to wait for the browser to redirect before the reward can be processed.
          </p>
          <Button
            onClick={() => refreshWallet(true)}
            disabled={checkingReward}
            className="mt-3 gradient-gold text-gold-foreground"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${checkingReward ? 'animate-spin' : ''}`} />
            Check My Reward
          </Button>
        </div>

        <div className="text-center pb-4">
          <Button
            variant="ghost"
            onClick={() => setView('dashboard')}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to ALCOIN Dashboard
          </Button>

          <Button
            variant="link"
            onClick={openOffers}
            className="ml-2 text-gold"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Open Offerwall Full Screen
          </Button>
        </div>
      </main>
    </div>
  );
}
