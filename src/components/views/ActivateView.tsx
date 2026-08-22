'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldCheck, ShieldX, KeyRound, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';

const ALC_FORMAT = /^ALC[0-9]{3}$/;

export default function ActivateView() {
  const { user, setView, setUser } = useAppStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Client-side format validation
  const formatError = useMemo(() => {
    if (!code) return '';
    if (code.length < 6) return '';
    if (!ALC_FORMAT.test(code.toUpperCase())) {
      return 'Enter a valid ALCOIN activation code, for example ALC001.';
    }
    return '';
  }, [code]);

  const whatsappMessage = encodeURIComponent(
    `Hello ALCOIN Admin, I would like to activate my account. I need a ₦5,000 activation code. Username: ${user?.username || ''}. Email: ${user?.email || ''}.`,
  );
  const whatsappLink = `https://wa.me/2348000000000?text=${whatsappMessage}`;

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^ALC0-9]/g, '').slice(0, 6);
    setCode(val);
    if (error) setError('');
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    // Client-side format check
    if (!ALC_FORMAT.test(code)) {
      setError('Enter a valid ALCOIN activation code, for example ALC001.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/activate', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      if (data.user) setUser(data.user);
      setSuccess(true);
      setTimeout(() => setView('dashboard'), 2500);
    } catch (err: any) {
      setError(err.message || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = code.length === 6 && ALC_FORMAT.test(code) && !loading;

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
                Enter your 6-character activation code to unlock all platform features.
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
              <Label htmlFor="activationCode" className="text-sm text-muted-foreground">
                Activation Code
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="activationCode"
                  type="text"
                  placeholder="e.g. ALC001"
                  value={code}
                  onChange={handleCodeChange}
                  className="pl-10 bg-white/5 border-white/10 focus:border-gold h-12 font-mono text-lg tracking-widest uppercase"
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format: ALC followed by 3 digits (e.g. ALC001, ALC427, ALC999)
              </p>
            </div>

            {/* Client-side format error */}
            <AnimatePresence>
              {formatError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {formatError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Server error */}
            <AnimatePresence>
              {error && !formatError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={!canSubmit}
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
              Get Activation Code
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
            <h2 className="text-lg font-bold text-emerald-400">Account Activated Successfully</h2>
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
          <h3 className="font-semibold text-sm">Activation Fee: ₦5,000</h3>
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
              <span>Trade on the ALCOIN market and earn profits</span>
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
