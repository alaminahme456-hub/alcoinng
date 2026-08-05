'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Wallet, AlertCircle, Clock, CheckCircle2, XCircle, Banknote, Building2, Landmark,
} from 'lucide-react';

function formatNaira(amount: number) {
  return `\u20a6${amount.toLocaleString()}`;
}

interface Withdrawal {
  id: string;
  wallet: string;
  amount: number;
  status: string;
  createdAt: string;
}

const statusConfig: Record<string, { color: string; bg: string; icon: typeof Clock; label: string }> = {
  pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: Clock, label: 'Pending' },
  approved: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle, label: 'Rejected' },
  paid: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: Banknote, label: 'Paid' },
};

const walletOptions = [
  { value: 'reward', label: 'Reward Wallet', balanceKey: 'reward' as const },
  { value: 'deposit', label: 'Deposit Wallet', balanceKey: 'deposit' as const },
  { value: 'profit', label: 'Profit Wallet', balanceKey: 'profit' as const },
];

export default function WithdrawView() {
  const { wallets, setWallets, setView, user } = useAppStore();
  const [selectedWallet, setSelectedWallet] = useState('reward');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const selectedBalance = wallets[selectedWallet as keyof typeof wallets] || 0;

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiFetch('/api/withdraw');
      if (data.withdrawals) setWithdrawals(data.withdrawals);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/withdraw', {
        method: 'POST',
        body: JSON.stringify({ wallet: selectedWallet, amount: numAmount }),
      });
      if (data.wallets) {
        const getBal = (w: any) => typeof w === 'object' && w !== null ? (w.balance ?? 0) : (w ?? 0);
        setWallets({ reward: getBal(data.wallets.reward), deposit: getBal(data.wallets.deposit), profit: getBal(data.wallets.profit) });
      }
      setSuccess(true);
      setAmount('');
      fetchHistory();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
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
        <h1 className="font-semibold text-lg">Withdraw</h1>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto space-y-6">
        {/* Success Toast */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-400 font-medium">Withdrawal request submitted successfully!</p>
          </motion.div>
        )}

        {/* Withdrawal Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onSubmit={handleWithdraw}
          className="glass rounded-2xl p-6 space-y-5"
        >
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Withdraw From</Label>
            <div className="grid grid-cols-1 gap-2">
              {walletOptions.map((w) => (
                <button
                  type="button"
                  key={w.value}
                  onClick={() => setSelectedWallet(w.value)}
                  className={`rounded-xl p-3 flex items-center justify-between transition-colors text-left ${
                    selectedWallet === w.value ? 'glass-strong border-gold/40 bg-gold/5' : 'glass hover:bg-white/5'
                  } border border-transparent`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className={`w-4 h-4 ${selectedWallet === w.value ? 'text-gold' : 'text-muted-foreground'}`} />
                    <span className="text-sm">{w.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${selectedWallet === w.value ? 'text-gold' : ''}`}>
                    {formatNaira(wallets[w.balanceKey])}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bank Details Display */}
          {user?.bankName && user?.bankAccount && user?.bankAccountName ? (
            <div className="rounded-2xl p-4 glass border-alcoin-blue/20 space-y-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-alcoin-blue" />
                <h3 className="text-sm font-semibold">Payment To</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm">{user.bankName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-mono tracking-wider">{user.bankAccount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm">{user.bankAccountName}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-sm text-yellow-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                No bank details set. Please update your bank details in your profile before withdrawing.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="withdrawAmount" className="text-sm text-muted-foreground">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₦</span>
              <Input
                id="withdrawAmount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 bg-white/5 border-white/10 focus:border-gold h-12"
                min="0"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Available: <span className="text-gold font-medium">{formatNaira(selectedBalance)}</span>
            </p>
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
            disabled={loading || !amount}
            className="w-full gradient-gold text-gold-foreground font-semibold h-12"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full"
              />
            ) : (
              'Submit Withdrawal'
            )}
          </Button>
        </motion.form>

        {/* Withdrawal Rules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-6 border-alcoin-blue/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-alcoin-blue" />
            <h3 className="font-semibold text-sm">Withdrawal Rules</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-alcoin-blue shrink-0 mt-2" />
              <span>Minimum withdrawal for reward wallet: <span className="text-foreground font-medium">₦2,000 weekly</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-alcoin-blue shrink-0 mt-2" />
              <span>Maximum withdrawal for reward wallet: <span className="text-foreground font-medium">₦8,000 monthly</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-alcoin-blue shrink-0 mt-2" />
              <span>Ensure your bank details are set in your profile</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-alcoin-blue shrink-0 mt-2" />
              <span>Withdrawals are processed within 24-48 hours</span>
            </li>
          </ul>
        </motion.div>

        {/* Withdrawal History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="font-semibold text-sm mb-4">Withdrawal History</h3>

          {loadingHistory ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg bg-white/5" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No withdrawal history yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {withdrawals.map((w, i) => {
                const config = statusConfig[w.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`glass-strong rounded-xl p-3 flex items-center justify-between ${config.bg} border`}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-4 h-4 ${config.color}`} />
                      <div>
                        <p className="text-sm font-medium">{formatNaira(w.amount)}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{w.wallet} wallet</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`${config.bg} ${config.color} border text-[10px]`}>
                        {config.label}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
