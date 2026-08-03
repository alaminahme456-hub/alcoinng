'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Bell, BellOff, Mail, MessageSquare, LogOut, Info, Shield, ChevronRight, Coins, Heart,
} from 'lucide-react';

interface NotifPrefs {
  email: boolean;
  push: boolean;
  deposit: boolean;
  withdrawal: boolean;
  referral: boolean;
  announcement: boolean;
}

export default function SettingsView() {
  const { user, logout, setView } = useAppStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [prefs, setPrefs] = useState<NotifPrefs>({
    email: true,
    push: true,
    deposit: true,
    withdrawal: true,
    referral: true,
    announcement: true,
  });
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const handleTogglePref = (key: keyof NotifPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePrefs = async () => {
    setPrefsLoading(true);
    try {
      await apiFetch('/api/user/notification-prefs', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch {
      // silent
    } finally {
      setPrefsLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // silent
    }
    logout();
  };

  const notifItems = [
    { key: 'email' as const, label: 'Email Notifications', desc: 'Receive notifications via email', icon: Mail },
    { key: 'push' as const, label: 'Push Notifications', desc: 'Browser push notifications', icon: Bell },
    { key: 'deposit' as const, label: 'Deposit Alerts', desc: 'When deposits are credited', icon: MessageSquare },
    { key: 'withdrawal' as const, label: 'Withdrawal Updates', desc: 'Withdrawal status changes', icon: MessageSquare },
    { key: 'referral' as const, label: 'Referral Alerts', desc: 'New referrals and bonuses', icon: Bell },
    { key: 'announcement' as const, label: 'Announcements', desc: 'Platform news and updates', icon: Bell },
  ];

  const quickLinks = [
    { label: 'Edit Profile', icon: Info, view: 'profile' as const },
    { label: 'Notification Preferences', icon: Bell, view: 'notifications' as const },
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
        <h1 className="font-semibold text-lg">Settings</h1>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto space-y-6 pb-8">
        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden"
        >
          {quickLinks.map((link, i) => (
            <button
              key={link.label}
              onClick={() => setView(link.view)}
              className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left ${
                i < quickLinks.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <link.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="flex-1 text-sm">{link.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 space-y-1"
        >
          <h2 className="font-semibold text-sm mb-4">Notification Preferences</h2>
          {notifItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <Switch
                checked={prefs[item.key]}
                onCheckedChange={() => handleTogglePref(item.key)}
              />
            </div>
          ))}
          <div className="pt-3">
            {prefsSaved && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-emerald-400 mb-2"
              >
                Preferences saved!
              </motion.p>
            )}
            <Button
              onClick={handleSavePrefs}
              disabled={prefsLoading}
              variant="outline"
              className="border-white/10 h-10"
            >
              {prefsLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center gap-3 p-4 hover:bg-destructive/5 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <span className="flex-1 text-sm text-destructive font-medium">Log Out</span>
          </button>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-semibold text-sm">About</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center gold-glow">
              <Coins className="w-6 h-6 text-gold-foreground" />
            </div>
            <div>
              <h3 className="font-bold gradient-gold-text text-lg">ALCOIN</h3>
              <p className="text-xs text-muted-foreground">Digital Rewards Platform</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="text-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Account</span>
              <span className="text-foreground">@{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className={user?.isActivated ? 'text-emerald-400' : 'text-yellow-400'}>
                {user?.isActivated ? 'Activated' : 'Not Activated'}
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-white/5">
            <p className="text-xs text-muted-foreground text-center">
              Built with <Heart className="w-3 h-3 inline text-destructive" /> by ALCOIN Team
            </p>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1">
              All rights reserved.
            </p>
          </div>
        </motion.div>

        {/* Security Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-alcoin-blue" />
            <h2 className="font-semibold text-sm">Security</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-alcoin-blue shrink-0 mt-2" />
              <span>Your data is encrypted and secure</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-alcoin-blue shrink-0 mt-2" />
              <span>Never share your password with anyone</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-alcoin-blue shrink-0 mt-2" />
              <span>Contact support if you notice suspicious activity</span>
            </li>
          </ul>
        </motion.div>
      </main>

      {/* Logout Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="glass-strong border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-destructive" /> Log Out
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="border-white/10 flex-1"
              onClick={() => setShowLogoutDialog(false)}
              disabled={loggingOut}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                'Log Out'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
