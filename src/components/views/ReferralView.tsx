'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Copy, Check, Users, UserPlus, Gift, Link2, Share2 } from 'lucide-react';

function formatNaira(amount: number) {
  return `\u20a6${amount.toLocaleString()}`;
}

interface ReferredUser {
  id: string;
  fullName: string;
  username: string;
  isActive: boolean;
  createdAt: string;
}

interface ReferralData {
  totalReferrals: number;
  activeReferrals: number;
  referralEarnings: number;
  referredUsers: ReferredUser[];
}

export default function ReferralView() {
  const { user, setView } = useAppStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  const referralCode = user?.referralCode || '';
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${referralCode}`
    : '';

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await apiFetch('/api/user/referrals');
      setData(res);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ALCOIN',
          text: `Join ALCOIN and start earning! Use my referral code: ${referralCode}`,
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      copyToClipboard(referralLink, 'link');
    }
  };

  const stats = [
    { label: 'Total Referrals', value: data?.totalReferrals ?? 0, icon: Users, color: 'text-gold' },
    { label: 'Active Referrals', value: data?.activeReferrals ?? 0, icon: UserPlus, color: 'text-emerald-400' },
    { label: 'Referral Earnings', value: formatNaira(data?.referralEarnings ?? 0), icon: Gift, color: 'text-alcoin-blue', isText: true },
  ];

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
        <h1 className="font-semibold text-lg">Referrals</h1>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto space-y-6">
        {/* Referral Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 gold-glow"
        >
          <h3 className="font-semibold text-sm mb-1">Your Referral Code</h3>
          <p className="text-xs text-muted-foreground mb-4">Share this code with friends to earn rewards</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 glass-strong rounded-xl px-4 py-3 font-mono text-lg font-bold text-center tracking-widest gradient-gold-text">
              {referralCode || 'N/A'}
            </div>
            <Button
              onClick={() => copyToClipboard(referralCode, 'code')}
              variant="outline"
              className="h-12 w-12 p-0 border-white/10 shrink-0"
            >
              {copiedCode ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </motion.div>

        {/* Referral Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="font-semibold text-sm mb-1">Referral Link</h3>
          <p className="text-xs text-muted-foreground mb-4">Share this link to automatically apply your referral code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 glass-strong rounded-xl px-3 py-3 text-xs truncate text-muted-foreground">
              {referralLink || 'N/A'}
            </div>
            <Button
              onClick={() => copyToClipboard(referralLink, 'link')}
              variant="outline"
              className="h-12 w-12 p-0 border-white/10 shrink-0"
            >
              {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full mt-3 h-11 border-alcoin-blue/30 text-alcoin-blue hover:bg-alcoin-blue/10"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Referral Link
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3"
        >
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />
              ))
            : stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className="glass rounded-xl p-4 text-center"
                >
                  <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                  <p className={`text-lg font-bold ${stat.color}`}>
                    {stat.isText ? stat.value : stat.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))
          }
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="font-semibold text-sm mb-3">How Referrals Work</h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0 text-gold text-xs font-bold">1</span>
              <span>Share your referral code or link with friends</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0 text-gold text-xs font-bold">2</span>
              <span>They sign up and activate their account</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0 text-gold text-xs font-bold">3</span>
              <span>You earn a bonus credited to your reward wallet</span>
            </li>
          </ol>
        </motion.div>

        {/* Referred Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="font-semibold text-sm mb-4">Referred Users</h3>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg bg-white/5" />
              ))}
            </div>
          ) : !data?.referredUsers || data.referredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Link2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No referred users yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start sharing your code to earn rewards!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {data.referredUsers.map((ru, i) => (
                <motion.div
                  key={ru.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.03 }}
                  className="glass-strong rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-muted-foreground">
                        {ru.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ru.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">@{ru.username}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      ru.isActive
                        ? 'border-emerald-500/30 text-emerald-400 text-[10px]'
                        : 'border-yellow-500/30 text-yellow-400 text-[10px]'
                    }
                  >
                    {ru.isActive ? 'Active' : 'Pending'}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
