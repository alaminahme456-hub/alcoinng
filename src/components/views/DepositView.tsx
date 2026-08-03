'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, PiggyBank, Ticket, MessageCircle, CheckCircle2 } from 'lucide-react';

function formatNaira(amount: number) {
  return `\u20a6${amount.toLocaleString()}`;
}

const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

export default function DepositView() {
  const { wallets, setWallets, setView } = useAppStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);

  const whatsappMessage = encodeURIComponent('Hello, I want to get a deposit code for my ALCOIN account.');
  const whatsappLink = `https://wa.me/2348000000000?text=${whatsappMessage}`;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/deposit', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      if (data.wallets) {
        const getBal = (w: any) => typeof w === 'object' && w !== null ? (w.balance ?? 0) : (w ?? 0);
        setWallets({ reward: getBal(data.wallets.reward), deposit: getBal(data.wallets.deposit), profit: getBal(data.wallets.profit) });
      }
      setSuccessAmount(data.amount || 0);
      setSuccess(true);
      setCode('');
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = () => {
    // Quick amounts are for reference to show the user what they can deposit
    // The actual deposit happens via code
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setView('dashboard')}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Deposit</h1>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 gold-glow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-gold" />
            </div>
            <span className="text-sm text-muted-foreground">Deposit Wallet Balance</span>
          </div>
          <p className="text-3xl font-bold gradient-gold-text">{formatNaira(wallets.deposit)}</p>
        </motion.div>

        {/* Quick Amounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="font-semibold text-sm mb-3">Available Deposit Amounts</h3>
          <div className="grid grid-cols-3 gap-2" onClick={handleQuickSelect}>
            {quickAmounts.map((amt) => (
              <div
                key={amt}
                className="glass-strong rounded-xl p-3 text-center cursor-default hover:border-gold/30 border border-transparent transition-colors"
              >
                <p className="text-sm font-semibold">{formatNaira(amt)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {amt >= 1000 ? `${amt / 1000}K` : amt}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Success State */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 text-center border-emerald-500/30 bg-emerald-500/5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3"
            >
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </motion.div>
            <h3 className="font-bold text-emerald-400">Deposit Successful!</h3>
            <p className="text-2xl font-bold mt-2">{formatNaira(successAmount)}</p>
            <p className="text-sm text-muted-foreground mt-1">has been added to your deposit wallet</p>
            <Button
              variant="outline"
              className="mt-4 border-white/10"
              onClick={() => setSuccess(false)}
            >
              Deposit More
            </Button>
          </motion.div>
        )}

        {/* Deposit Code Form */}
        {!success && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleRedeem}
            className="glass rounded-2xl p-6 space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="depositCode" className="text-sm text-muted-foreground">Deposit Code</Label>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="depositCode"
                  type="text"
                  placeholder="Enter your deposit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 focus:border-gold h-12"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full gradient-gold text-gold-foreground font-semibold h-12"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full"
                />
              ) : (
                'Redeem Deposit Code'
              )}
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 flex-1" />
              <span className="px-3 text-xs text-muted-foreground">or</span>
              <div className="border-t border-white/10 flex-1" />
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 font-semibold text-sm hover:bg-emerald-600/30 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Get Deposit Code via WhatsApp
            </a>
          </motion.form>
        )}

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6 space-y-3"
        >
          <h3 className="font-semibold text-sm">How Deposit Works</h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0 text-gold text-xs font-bold">1</span>
              <span>Click &quot;Get Deposit Code&quot; to request a code via WhatsApp</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0 text-gold text-xs font-bold">2</span>
              <span>Make payment and receive your deposit code</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0 text-gold text-xs font-bold">3</span>
              <span>Enter the code above to fund your deposit wallet</span>
            </li>
          </ol>
        </motion.div>
      </main>
    </div>
  );
}
