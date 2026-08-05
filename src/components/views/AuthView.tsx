'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, apiFetch, ViewName } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Coins, Mail, Lock, User, Phone, UserPlus, ArrowRight, Eye, EyeOff, ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react';

export default function AuthView() {
  const { view, setView, setToken, setUser, pendingRegistration, setPendingRegistration } = useAppStore();
  const isLogin = view === 'login';
  const isVerifyOtp = view === 'verify-otp';

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

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // If there's pending registration data and we're on verify-otp, start cooldown
  useEffect(() => {
    if (isVerifyOtp && resendCooldown === 0) {
      setResendCooldown(60);
    }
  }, [isVerifyOtp]);

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
      } else if (!data.user.isActivated) {
        setView('activate');
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
      if (data.user.role === 'admin') {
        setView('admin-dashboard');
      } else if (!data.user.isActivated) {
        setView('activate');
      } else {
        setView('dashboard');
      }
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRegistration) return;

    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess(false);

    try {
      const data = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: pendingRegistration.email,
          otp,
          password: pendingRegistration.password,
        }),
      });

      setOtpSuccess(true);
      setToken(data.token);
      setUser(data.user);
      setPendingRegistration(null);

      // Brief success animation then redirect
      setTimeout(() => {
        if (data.user.role === 'admin') {
          setView('admin-dashboard');
        } else {
          setView('dashboard');
        }
      }, 1200);
    } catch (err: any) {
      setOtpError(err.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingRegistration || resendCooldown > 0) return;

    setResendLoading(true);
    setOtpError('');
    try {
      await apiFetch('/api/auth/verify-otp', {
        method: 'PUT',
        body: JSON.stringify({ email: pendingRegistration.email }),
      });
      setResendCooldown(60);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToRegister = () => {
    setOtp('');
    setOtpError('');
    setOtpSuccess(false);
    setPendingRegistration(null);
    setDirection(-1);
    setView('register');
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
  };

  const [direction, setDirection] = useState(1);

  const switchView = (target: ViewName) => {
    setDirection(target === 'register' || target === 'verify-otp' ? 1 : -1);
    setView(target);
  };

  // Mask email for display
  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@');
    if (user.length <= 2) return email;
    return user[0] + '***' + user[user.length - 1] + '@' + domain;
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
            {isVerifyOtp ? (
              <motion.form
                key="verify-otp"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onSubmit={handleVerifyOtp}
                className="space-y-6"
              >
                <div className="text-center mb-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/10 mb-4"
                  >
                    <ShieldCheck className="w-7 h-7 text-gold" />
                  </motion.div>
                  <h2 className="text-xl font-semibold">Verify Your Email</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    We sent a verification code to
                  </p>
                  <p className="text-foreground font-medium text-sm mt-1">
                    {pendingRegistration ? maskEmail(pendingRegistration.email) : 'your email'}
                  </p>
                </div>

                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                  >
                    {otpError}
                  </motion.div>
                )}

                {otpSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center"
                  >
                    Email verified successfully! Redirecting...
                  </motion.div>
                )}

                {/* OTP Input */}
                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={otpLoading || otpSuccess}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-12 text-lg bg-white/5 border-white/10 data-[active=true]:border-gold data-[active=true]:ring-gold/30" />
                      <InputOTPSlot index={1} className="h-12 w-12 text-lg bg-white/5 border-white/10 data-[active=true]:border-gold data-[active=true]:ring-gold/30" />
                      <InputOTPSlot index={2} className="h-12 w-12 text-lg bg-white/5 border-white/10 data-[active=true]:border-gold data-[active=true]:ring-gold/30" />
                      <InputOTPSeparator className="mx-1" />
                      <InputOTPSlot index={3} className="h-12 w-12 text-lg bg-white/5 border-white/10 data-[active=true]:border-gold data-[active=true]:ring-gold/30" />
                      <InputOTPSlot index={4} className="h-12 w-12 text-lg bg-white/5 border-white/10 data-[active=true]:border-gold data-[active=true]:ring-gold/30" />
                      <InputOTPSlot index={5} className="h-12 w-12 text-lg bg-white/5 border-white/10 data-[active=true]:border-gold data-[active=true]:ring-gold/30" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Enter the 6-digit code sent to your email
                </p>

                <Button
                  type="submit"
                  disabled={otpLoading || otp.length !== 6 || otpSuccess}
                  className="w-full gradient-gold text-gold-foreground font-semibold h-12 hover:opacity-90 transition-opacity"
                >
                  {otpLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full"
                    />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Verify OTP
                    </span>
                  )}
                </Button>

                {/* Resend OTP */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Didn&apos;t receive the code?{' '}
                    {resendCooldown > 0 ? (
                      <span className="text-muted-foreground/60">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendLoading}
                        className="text-gold hover:underline font-medium inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        {resendLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full"
                          />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Resend Code
                      </button>
                    )}
                  </p>
                </div>

                {/* Back to register */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToRegister}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to Register
                  </button>
                </div>
              </motion.form>
            ) : isLogin ? (
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
