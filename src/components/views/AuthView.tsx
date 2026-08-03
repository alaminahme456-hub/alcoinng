'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, apiFetch, ViewName } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Mail, Lock, User, Phone, UserPlus, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function AuthView() {
  const { view, setView, setToken, setUser } = useAppStore();
  const isLogin = view === 'login';

  // Login state
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ loginId, password: loginPassword }),
      });
      setToken(data.token);
      setUser(data.user);
      if (data.user.role === 'admin') {
        setView('admin-dashboard');
      } else {
        setView('dashboard');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setRegError('Passwords do not match');
      return;
    }
    setRegLoading(true);
    setRegError('');
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, username, email, phone, password, referralCode: referralCode || undefined }),
      });
      setToken(data.token);
      setUser(data.user);
      setView('dashboard');
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
  };

  const [direction, setDirection] = useState(1);

  const switchView = (target: ViewName) => {
    setDirection(target === 'register' ? 1 : -1);
    setView(target);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-gold gold-glow mb-4">
            <Coins className="w-8 h-8 text-gold-foreground" />
          </div>
          <h1 className="text-3xl font-bold gradient-gold-text">ALCOIN</h1>
          <p className="text-muted-foreground text-sm mt-1">Digital Rewards Platform</p>
        </motion.div>

        {/* Form Container */}
        <div className="glass rounded-2xl p-6 sm:p-8 overflow-hidden relative">
          <AnimatePresence mode="wait" custom={direction}>
            {isLogin ? (
              <motion.form
                key="login"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div className="text-center mb-2">
                  <h2 className="text-xl font-semibold">Welcome Back</h2>
                  <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
                </div>

                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                  >
                    {loginError}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="loginId" className="text-sm text-muted-foreground">Email or Username</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="loginId"
                      type="text"
                      placeholder="Enter email or username"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 focus:border-gold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginPw" className="text-sm text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="loginPw"
                      type={showLoginPw ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-gold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPw(!showLoginPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full gradient-gold text-gold-foreground font-semibold h-12 hover:opacity-90 transition-opacity"
                >
                  {loginLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full"
                    />
                  ) : (
                    <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('register')}
                    className="text-gold hover:underline font-medium"
                  >
                    Create Account
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <h2 className="text-xl font-semibold">Create Account</h2>
                  <p className="text-muted-foreground text-sm mt-1">Join ALCOIN and start earning</p>
                </div>

                {regError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                  >
                    {regError}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm text-muted-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 focus:border-gold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regUsername" className="text-sm text-muted-foreground">Username</Label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="regUsername"
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
                  <Label htmlFor="regEmail" className="text-sm text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="regEmail"
                      type="email"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 focus:border-gold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regPhone" className="text-sm text-muted-foreground">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="regPhone"
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
                  <Label htmlFor="regPw" className="text-sm text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="regPw"
                      type={showRegPw ? 'text' : 'password'}
                      placeholder="Create password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-gold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPw(!showRegPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regConfirmPw" className="text-sm text-muted-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="regConfirmPw"
                      type={showRegPw ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 focus:border-gold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regReferral" className="text-sm text-muted-foreground">Referral Code <span className="text-muted-foreground/60">(optional)</span></Label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="regReferral"
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
                  disabled={regLoading}
                  className="w-full gradient-gold text-gold-foreground font-semibold h-12 hover:opacity-90 transition-opacity mt-2"
                >
                  {regLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full"
                    />
                  ) : (
                    <span className="flex items-center gap-2">Create Account <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="text-gold hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
