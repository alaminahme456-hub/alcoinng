'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Building2, Lock, Save, Eye, EyeOff, CheckCircle2, ShieldCheck, LogOut } from 'lucide-react';

export default function ProfileView() {
  const { user, setUser, setView, logout } = useAppStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Bank fields
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [bankAccount, setBankAccount] = useState(user?.bankAccount || '');
  const [bankAccountName, setBankAccountName] = useState(user?.bankAccountName || '');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSuccess, setBankSuccess] = useState(false);
  const [bankError, setBankError] = useState('');

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess(false);
    try {
      const data = await apiFetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, email, phone }),
      });
      if (data.user) setUser(data.user);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveBank = async () => {
    setBankLoading(true);
    setBankError('');
    setBankSuccess(false);
    try {
      const data = await apiFetch('/api/user/bank', {
        method: 'PUT',
        body: JSON.stringify({ bankName, bankAccount, bankAccountName }),
      });
      if (data.user) setUser(data.user);
      setBankSuccess(true);
      setTimeout(() => setBankSuccess(false), 3000);
    } catch (err: any) {
      setBankError(err.message || 'Failed to update bank details');
    } finally {
      setBankLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setPwLoading(true);
    setPwError('');
    setPwSuccess(false);
    try {
      await apiFetch('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      setPwSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
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
        <h1 className="font-semibold text-lg">Profile</h1>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto space-y-6">
        {/* User Avatar Section */}
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

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 glass h-12">
              <TabsTrigger value="profile" className="text-xs gap-1.5 data-[state=active]:gradient-gold data-[state=active]:text-gold-foreground">
                <User className="w-3.5 h-3.5" /> Profile
              </TabsTrigger>
              <TabsTrigger value="bank" className="text-xs gap-1.5 data-[state=active]:gradient-gold data-[state=active]:text-gold-foreground">
                <Building2 className="w-3.5 h-3.5" /> Bank
              </TabsTrigger>
              <TabsTrigger value="password" className="text-xs gap-1.5 data-[state=active]:gradient-gold data-[state=active]:text-gold-foreground">
                <Lock className="w-3.5 h-3.5" /> Password
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-4 space-y-4">
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profName" className="text-sm text-muted-foreground">Full Name</Label>
                  <Input
                    id="profName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-gold h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profEmail" className="text-sm text-muted-foreground">Email</Label>
                  <Input
                    id="profEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-gold h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profPhone" className="text-sm text-muted-foreground">Phone Number</Label>
                  <Input
                    id="profPhone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-gold h-12"
                  />
                </div>

                {profileSuccess && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Profile updated successfully
                  </motion.div>
                )}
                {profileError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {profileError}
                  </motion.div>
                )}

                <Button
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  className="w-full gradient-gold text-gold-foreground font-semibold h-12"
                >
                  {profileLoading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full" />
                  ) : (
                    <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Changes</span>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Bank Tab */}
            <TabsContent value="bank" className="mt-4 space-y-4">
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="text-sm text-muted-foreground">Bank Name</Label>
                  <Input
                    id="bankName"
                    type="text"
                    placeholder="e.g. Access Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-gold h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAcctNum" className="text-sm text-muted-foreground">Account Number</Label>
                  <Input
                    id="bankAcctNum"
                    type="text"
                    placeholder="Enter account number"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-gold h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAcctName" className="text-sm text-muted-foreground">Account Name</Label>
                  <Input
                    id="bankAcctName"
                    type="text"
                    placeholder="Enter account name"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-gold h-12"
                  />
                </div>

                {bankSuccess && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Bank details updated successfully
                  </motion.div>
                )}
                {bankError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {bankError}
                  </motion.div>
                )}

                <Button
                  onClick={handleSaveBank}
                  disabled={bankLoading}
                  className="w-full gradient-gold text-gold-foreground font-semibold h-12"
                >
                  {bankLoading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full" />
                  ) : (
                    <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Bank Details</span>
                  )}
                </Button>
              </div>

              <div className="glass rounded-2xl p-4 border-alcoin-blue/20">
                <p className="text-xs text-muted-foreground">
                  Your bank details are required for withdrawals. Please ensure they are accurate to avoid payment issues.
                </p>
              </div>
            </TabsContent>

            {/* Password Tab */}
            <TabsContent value="password" className="mt-4 space-y-4">
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPw" className="text-sm text-muted-foreground">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="oldPw"
                      type={showOldPw ? 'text' : 'password'}
                      placeholder="Enter current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-gold h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPw(!showOldPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPw" className="text-sm text-muted-foreground">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPw"
                      type={showNewPw ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-gold h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPw" className="text-sm text-muted-foreground">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmNewPw"
                      type={showNewPw ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-gold h-12"
                    />
                  </div>
                </div>

                {pwSuccess && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Password changed successfully
                  </motion.div>
                )}
                {pwError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {pwError}
                  </motion.div>
                )}

                <Button
                  onClick={handleChangePassword}
                  disabled={pwLoading || !oldPassword || !newPassword || !confirmPassword}
                  className="w-full gradient-gold text-gold-foreground font-semibold h-12"
                >
                  {pwLoading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-gold-foreground/30 border-t-gold-foreground rounded-full" />
                  ) : (
                    <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</span>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pb-8"
        >
          <Button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full h-12 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 font-semibold rounded-2xl"
          >
            <span className="flex items-center gap-2"><LogOut className="w-4 h-4" /> Log Out</span>
          </Button>
        </motion.div>

        {/* Logout Confirmation Dialog */}
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
                  onClick={logout}
                  className="flex-1 h-11 bg-destructive hover:bg-destructive/90 text-white font-semibold rounded-xl"
                >
                  Log Out
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
