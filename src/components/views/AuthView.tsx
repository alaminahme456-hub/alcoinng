'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignIn, SignUp, useUser, useAuth } from '@clerk/nextjs';
import { useAppStore, apiFetch, ViewName } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AuthView() {
  const { view, setView, setUser, setToken, pendingRef, setPendingRef } = useAppStore();
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useAuth();
  const isLogin = view === 'login';

  // Profile completion state
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Pre-fill referral code from pendingRef (captured from ?ref= URL param)
  useEffect(() => {
    if (pendingRef && !referralCode) {
      setReferralCode(pendingRef);
      setPendingRef(null);
    }
  }, [pendingRef]);

  // After Clerk auth succeeds, check for existing profile or show completion form
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    setCheckingProfile(true);
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          // Profile exists — route to appropriate view
          setUser(data.user);
          setToken('clerk');
          if (data.user.role === 'admin') {
            setView('admin-dashboard');
          } else if (!data.user.isActivated) {
            setView('activate');
          } else {
            setView('dashboard');
          }
        }
        // If no profile, stay on completion form
      })
      .catch(() => {
        // Stay on completion form
      })
      .finally(() => setCheckingProfile(false));
  }, [isSignedIn, isLoaded, user]);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          phone,
          referralCode: referralCode || undefined,
          email: user?.emailAddresses?.[0]?.emailAddress || '',
          fullName: user?.fullName || user?.firstName || '',
        }),
      });

      setUser(data.user);
      setToken('clerk');
      if (data.user.role === 'admin') {
        setView('admin-dashboard');
      } else if (!data.user.isActivated) {
        setView('activate');
      } else {
        setView('dashboard');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Failed to complete profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    useAppStore.getState().logout();
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
  };

  const [direction] = useState(1);

  // Profile completion form (shown after Clerk signup when no profile exists)
  if (isSignedIn && isLoaded) {
    if (checkingProfile) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <img src="/alcoin-logo.jpg" alt="ALCOIN" className="w-16 h-16 rounded-2xl gold-glow mb-4 animate-pulse" />
            <p className="text-muted-foreground">Setting up your account...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8"
          >
            <img src="/alcoin-logo.jpg" alt="ALCOIN" className="w-16 h-16 rounded-2xl gold-glow mb-4" />
            <h1 className="text-3xl font-bold gradient-gold-text">ALCOIN</h1>
            <p className="text-muted-foreground text-sm mt-1">Complete your profile to continue</p>
          </motion.div>

          {/* Logged-in info */}
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="text-foreground font-medium">{user?.emailAddresses?.[0]?.emailAddress}</span>
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-muted-foreground hover:text-destructive mt-1 underline"
              >
                Sign out
              </button>
            </div>

            {profileError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4"
              >
                {profileError}
              </motion.div>
            )}

            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpUsername" className="text-sm text-muted-foreground">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cpUsername"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 focus:border-gold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpPhone" className="text-sm text-muted-foreground">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cpPhone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 focus:border-gold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpReferral" className="text-sm text-muted-foreground">
                  Referral Code <span className="text-muted-foreground/60">(optional)</span>
                </Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cpReferral"
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 focus:border-gold"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={profileLoading}
                className="w-full gradient-gold text-gold-foreground font-semibold h-12 hover:opacity-90 transition-opacity mt-2"
              >
                {profileLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full"
                  />
                ) : (
                  <span className="flex items-center gap-2">Complete Setup <ArrowRight className="w-4 h-4" /></span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Clerk Sign-In / Sign-Up
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <img src="/alcoin-logo.jpg" alt="ALCOIN" className="w-16 h-16 rounded-2xl gold-glow mb-4" />
          <h1 className="text-3xl font-bold gradient-gold-text">ALCOIN</h1>
          <p className="text-muted-foreground text-sm mt-1">Digital Rewards Platform</p>
        </motion.div>

        {/* Clerk Auth Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'signin' : 'signup'}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            {isLogin ? (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">Welcome Back</h2>
                  <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
                </div>
                <SignIn />
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setView('register')}
                      className="text-gold hover:underline font-medium"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">Create Account</h2>
                  <p className="text-muted-foreground text-sm mt-1">Join ALCOIN and start earning</p>
                </div>
                <SignUp />
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setView('login')}
                      className="text-gold hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}