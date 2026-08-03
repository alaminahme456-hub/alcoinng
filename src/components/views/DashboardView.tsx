'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, apiFetch, ViewName } from '@/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Home, Tv, TrendingUp, User, Bell, ShieldCheck, ShieldX,
  Wallet, PiggyBank, TrendingUpIcon, Users, ChevronRight, Lock,
  Megaphone, CircleDot,
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

function formatNaira(amount: number) {
  return `\u20a6${amount.toLocaleString()}`;
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardView() {
  const { user, wallets, setWallets, setView, unreadCount, setUnreadCount } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);
  const [referralCount, setReferralCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [walletData, notifData] = await Promise.all([
        apiFetch('/api/user/wallets'),
        apiFetch('/api/notifications'),
      ]);
      if (walletData) {
        const getBal = (w: any) => typeof w === 'object' && w !== null ? (w.balance ?? 0) : (w ?? 0);
        setWallets({ reward: getBal(walletData.reward), deposit: getBal(walletData.deposit), profit: getBal(walletData.profit) });
      }
      if (notifData.notifications) {
        setNotifications(notifData.notifications);
        const unread = notifData.notifications.filter((n: Notification) => !n.read).length;
        setUnreadCount(unread);
      }
      if (notifData.referralCount) setReferralCount(notifData.referralCount);
    } catch (err) {
      // Silent fail - data will remain at defaults
    } finally {
      setLoading(false);
    }
  }, [setWallets, setUnreadCount]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await apiFetch('/api/announcements');
      if (data.announcements) setAnnouncements(data.announcements);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAnnouncements();
  }, [fetchData, fetchAnnouncements]);

  // Auto-rotate announcements
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setActiveAnnouncement((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const navItems: { icon: typeof Home; label: string; view: ViewName }[] = [
    { icon: Home, label: 'Home', view: 'dashboard' },
    { icon: Tv, label: 'Ads', view: 'ads' },
    { icon: TrendingUp, label: 'Market', view: 'market' },
    { icon: User, label: 'Profile', view: 'profile' },
  ];

  const walletCards = [
    { label: 'Reward Wallet', amount: wallets.reward, icon: Wallet, color: 'text-gold', borderColor: 'hover:border-gold/40' },
    { label: 'Deposit Wallet', amount: wallets.deposit, icon: PiggyBank, color: 'text-alcoin-blue', borderColor: 'hover:border-alcoin-blue/40' },
    { label: 'Profit Wallet', amount: wallets.profit, icon: TrendingUpIcon, color: 'text-emerald-400', borderColor: 'hover:border-emerald-400/40' },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center">
            <span className="text-gold-foreground font-bold text-sm">AC</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Welcome back,</p>
            <p className="font-semibold text-sm">{user?.fullName || 'User'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('notifications')}
            className="relative w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('referral')}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Announcements Carousel */}
        <AnimatePresence mode="wait">
          {announcements.length > 0 && (
            <motion.div
              key={activeAnnouncement}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="glass rounded-xl p-4 border-l-4 border-l-gold"
            >
              <div className="flex items-start gap-3">
                <Megaphone className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{announcements[activeAnnouncement].title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{announcements[activeAnnouncement].message}</p>
                </div>
              </div>
              {announcements.length > 1 && (
                <div className="flex gap-1 mt-3">
                  {announcements.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveAnnouncement(i)}
                      className={`h-1 rounded-full transition-all ${i === activeAnnouncement ? 'w-6 bg-gold' : 'w-1.5 bg-white/20'}`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Activation Status */}
        {user && !user.isActivated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/5"
          >
            <div className="flex items-center gap-3">
              <ShieldX className="w-6 h-6 text-yellow-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Account Not Activated</p>
                <p className="text-xs text-muted-foreground mt-0.5">Activate your account to unlock all features</p>
              </div>
              <Button
                onClick={() => setView('activate')}
                className="gradient-gold text-gold-foreground font-semibold text-xs px-4 h-9"
              >
                Activate
              </Button>
            </div>
          </motion.div>
        )}

        {user?.isActivated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-emerald-400">Account Activated</p>
                <p className="text-xs text-muted-foreground mt-0.5">Full access to all features</p>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs">
                Active
              </Badge>
            </div>
          </motion.div>
        )}

        {/* Wallet Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">My Wallets</h2>
            <button
              onClick={() => setView('withdraw')}
              className="text-xs text-gold hover:underline flex items-center gap-1"
            >
              Withdraw <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />
              ))
            ) : (
              walletCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass rounded-xl p-4 border border-transparent ${card.borderColor} transition-colors group cursor-default`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">{card.label}</span>
                    <card.icon className={`w-5 h-5 ${card.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  <p className={`text-xl font-bold ${card.color}`}>
                    {formatNaira(card.amount)}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Deposit', icon: PiggyBank, view: 'deposit' as ViewName, color: 'text-alcoin-blue' },
            { label: 'Withdraw', icon: Wallet, view: 'withdraw' as ViewName, color: 'text-gold' },
            { label: 'Referral', icon: Users, view: 'referral' as ViewName, color: 'text-emerald-400' },
            { label: 'Settings', icon: CircleDot, view: 'settings' as ViewName, color: 'text-purple-400' },
          ].map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={() => setView(action.view)}
              className="glass rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-white/8 transition-colors"
            >
              <action.icon className={`w-6 h-6 ${action.color}`} />
              <span className="text-[11px] text-muted-foreground">{action.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Referrals Summary */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">Referrals</h2>
            <button
              onClick={() => setView('referral')}
              className="text-xs text-gold hover:underline flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 glass-strong rounded-lg p-3 text-center">
              <p className="text-2xl font-bold gradient-gold-text">{referralCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Total Referrals</p>
            </div>
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Recent Notifications</h2>
            <button
              onClick={() => setView('notifications')}
              className="text-xs text-gold hover:underline flex items-center gap-1"
            >
              See All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-white/5" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">No notifications yet</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                    notif.read ? 'hover:bg-white/5' : 'bg-white/5'
                  }`}
                  onClick={() => setView('notifications')}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-transparent' : 'bg-gold'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notif.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(notif.createdAt)}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Locked Overlay */}
      {user && !user.isActivated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) return; }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-gold" />
            </div>
            <h2 className="text-xl font-bold mb-2">Account Locked</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Activate your account to unlock deposits, withdrawals, and all earning features.
            </p>
            <Button
              onClick={() => setView('activate')}
              className="w-full gradient-gold text-gold-foreground font-semibold h-12"
            >
              Activate Account
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/10">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setView(item.view)}
              className={`flex flex-col items-center gap-1 py-1 px-3 min-w-[64px] transition-colors ${
                item.view === 'dashboard' ? 'text-gold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
