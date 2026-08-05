'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldCheck, ShieldX, KeyRound, MessageCircle, CheckCircle2 } from 'lucide-react';

export default function ActivateView() {
  const { user, setView, setUser } = useAppStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const whatsappMessage = encodeURIComponent(`Hello, I want to get an activation code for my ALCOIN account.\n\nUsername: ${user?.username || ''}`);
  const whatsappLink = `https://wa.me/2348000000000?text=${whatsappMessage}`;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/activate', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      if (data.user) setUser(data.user);
      setSuccess(true);
      setTimeout(() => setView('dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || 'Activation failed');
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
        <h1 className="font-semibold text-lg">Activate Account</h1>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto space-y-6">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass rounded-2xl p-6 text-center ${
            user?.isActivated
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-yellow-500/30 bg-yellow-500/5'
          }`}
        >
          {user?.isActivated ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-emerald-400">Account Activated</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Your account is fully activated. You have access to all features.
              </p>
              <Badge className="mt-3 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Active
              </Badge>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <ShieldX className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-lg font-bold">Account Not Activated</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your activation code below to unlock all platform features including deposits, withdrawals, and earning opportunities.
              </p>
            </>
          )}
        </motion.div>

        {/* Activation Form */}
        {!user?.isActivated && !success && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleActivate}
            className="glass rounded-2xl p-6 space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="activationCode" className="text-sm text-muted-foreground">Activation Code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="activationCode"
                  type="text"
                  placeholder="Enter your activation code"
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
                'Activate Account'
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
              Get Activation Code via WhatsApp
            </a>
          </motion.form>
        )}

        {/* Success State */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <h2 className="text-lg font-bold text-emerald-400">Activation Successful!</h2>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to dashboard...</p>
          </motion.div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 space-y-3"
        >
          <h3 className="font-semibold text-sm">Why Activate?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <span>Access deposit and withdrawal features</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <span>Watch ads and complete tasks for rewards</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <span>Trade on the market and earn profits</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <span>Earn referral bonuses from friends</span>
            </li>
          </ul>
        </motion.div>
      </main>
    </div>
  );
}
