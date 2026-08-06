'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, User, Save, CheckCircle2, ShieldCheck, LogOut,
  Lock, MessageCircle, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

export default function ProfileView() {
  const { user, setUser, setView, logout } = useAppStore();
  const { signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetInfo, setShowResetInfo] = useState(false);

  // Personal information fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [bankAccount, setBankAccount] = useState(user?.bankAccount || '');
  const [bankAccountName, setBankAccountName] = useState(user?.bankAccountName || '');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      // Save personal info
      const profileData = await apiFetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone }),
      });
      // Save bank info
      const bankData = await apiFetch('/api/user/bank', {
        method: 'PUT',
        body: JSON.stringify({ bankName, bankAccount, bankAccountName }),
      });
      // Update store with merged user data
      if (profileData.user) setUser(profileData.user);
      else if (bankData.user) setUser(bankData.user);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      logout();
      await signOut();
    } catch {
      logout();
    }
  };

  // WhatsApp password reset link
  const whatsappMessage = encodeURIComponent(
    `Hello ALCOIN Admin, I would like to reset my password.\nMy registered email address is: ${user?.email || ''}.\nPlease assist me with resetting my password.`
  );
  const whatsappLink = `https://wa.me/2348000000000?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setView('dashboard')}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Profile</h1>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto space-y-6">
        {/* User Avatar Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 text-center"
        >
          <div className="w-20 h-20 rounded-full gradient-gold flex items-center justify-center mx-auto mb-3">
            <span className="text-gold-foreground text-2xl font-bold">
              {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <h2 className="font-bold text-lg">{user?.fullName}</h2>
          <p className="text-sm text-muted-foreground">@{user?.username}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {user?.isActivated ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <ShieldCheck className="w-3 h-3" /> Activated
              </span>
            ) : (
              <span className="text-xs text-yellow-400">Not Activated</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
          </p>
        </motion.div>

        {/* ═══════ Personal Information ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-gold" />
            <h2 className="font-semibold">Personal Information</h2>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="profName" className="text-xs text-muted-foreground">Full Name</Label>
            <Input
              id="profName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-gold h-11"
            />
          </div>

          {/* Email — Read Only */}
          <div className="space-y-2">
            <Label htmlFor="profEmail" className="text-xs text-muted-foreground">Email Address</Label>
            <Input
              id="profEmail"
              type="email"
              value={user?.email || ''}
              readOnly
              className="bg-white/3 border-white/5 h-11 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground/60">Email address cannot be changed</p>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="profPhone" className="text-xs text-muted-foreground">Phone Number</Label>
            <Input
              id="profPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-gold h-11"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/5 pt-1">
            <p className="text-[11px] text-muted-foreground font-medium">Bank Details</p>
          </div>

          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bankName" className="text-xs text-muted-foreground">Bank Name</Label>
            <Input
              id="bankName"
              type="text"
              placeholder="e.g. Access Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-gold h-11"
            />
          </div>

          {/* Bank Account Name */}
          <div className="space-y-2">
            <Label htmlFor="bankAcctName" className="text-xs text-muted-foreground">Bank Account Name</Label>
            <Input
              id="bankAcctName"
              type="text"
              placeholder="Enter account name"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-gold h-11"
            />
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="bankAcctNum" className="text-xs text-muted-foreground">Account Number</Label>
            <Input
              id="bankAcctNum"
              type="text"
              placeholder="Enter account number"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-gold h-11"
            />
          </div>

          {/* Success / Error messages */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-sm text-emerald-400"
              >
                <CheckCircle2 className="w-4 h-4" /> Profile updated successfully
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gradient-gold text-gold-foreground font-semibold h-12"
          >
            {saving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full" />
            ) : (
              <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Changes</span>
            )}
          </Button>
        </motion.div>

        {/* ═══════ Reset Password ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-gold" />
            <h2 className="font-semibold">Reset Password</h2>
          </div>

          {!showResetInfo ? (
            <Button
              onClick={() => setShowResetInfo(true)}
              className="w-full h-11 glass border border-white/10 hover:bg-white/10 font-semibold rounded-xl"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" /> Reset Password
              </span>
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              {/* Info box */}
              <div className="rounded-xl bg-gold/5 border border-gold/10 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Password reset requests are handled by the ALCOIN administrator for security purposes. Tap the button below to request a reset, and the admin will verify your identity and assist you.
                  </p>
                </div>
              </div>

              {/* Request Password Reset button */}
              <Button
                onClick={() => setShowResetInfo(false)}
                className="w-full h-11 glass border border-gold/20 hover:bg-gold/10 text-gold font-semibold rounded-xl"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Request Password Reset
                </span>
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-white/5" />
                <span className="text-[10px] text-muted-foreground">or</span>
                <div className="flex-1 border-t border-white/5" />
              </div>

              {/* Contact Admin on WhatsApp */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  className="w-full h-11 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 font-semibold rounded-xl"
                >
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Contact Admin on WhatsApp
                  </span>
                </Button>
              </a>
            </motion.div>
          )}
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full h-12 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 font-semibold rounded-2xl"
          >
            <span className="flex items-center gap-2"><LogOut className="w-4 h-4" /> Log Out</span>
          </Button>
        </motion.div>
      </main>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass rounded-2xl p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                  <LogOut className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-bold text-lg">Log Out?</h3>
                <p className="text-sm text-muted-foreground mt-1">Are you sure you want to log out of your account?</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 h-11 glass border border-white/10 hover:bg-white/10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLogout}
                  className="flex-1 h-11 bg-destructive hover:bg-destructive/90 text-white font-semibold rounded-xl"
                >
                  Log Out
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
