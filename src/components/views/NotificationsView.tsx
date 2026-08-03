'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Bell, BellOff, Wallet, Users, ShieldCheck, AlertTriangle,
  Info, Gift, CheckCheck, Circle, Megaphone, TrendingUp,
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const typeIconMap: Record<string, typeof Bell> = {
  deposit: Wallet,
  withdrawal: Wallet,
  referral: Users,
  activation: ShieldCheck,
  alert: AlertTriangle,
  info: Info,
  bonus: Gift,
  announcement: Megaphone,
  task: TrendingUp,
  system: Info,
};

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
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsView() {
  const { setView, setUnreadCount } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetch('/api/notifications');
      if (data.notifications) setNotifications(data.notifications);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notifId: string) => {
    const notif = notifications.find(n => n.id === notifId);
    if (notif?.read) return;

    setNotifications(prev =>
      prev.map(n => (n.id === notifId ? { ...n, read: true } : n))
    );
    const unreadCount = notifications.filter(n => !n.read && n.id !== notifId).length;
    setUnreadCount(unreadCount);

    try {
      await apiFetch('/api/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ notificationId: notifId }),
      });
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
 setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
    } catch {
      // silent
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const filterTabs = [
    { value: 'all' as const, label: 'All', count: notifications.length },
    { value: 'unread' as const, label: 'Unread', count: unreadCount },
    { value: 'read' as const, label: 'Read', count: notifications.length - unreadCount },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('dashboard')}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            variant="ghost"
            className="text-xs text-gold hover:text-gold hover:bg-gold/10 h-9"
          >
            <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
          </Button>
        )}
      </header>

      <main className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2"
        >
          {filterTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-xs font-medium transition-colors ${
                filter === tab.value
                  ? 'gradient-gold text-gold-foreground'
                  : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] ${
                filter === tab.value ? 'text-gold-foreground/70' : 'text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl bg-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <BellOff className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notif, i) => {
              const Icon = typeIconMap[notif.type] || Bell;
              return (
                <motion.button
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleMarkAsRead(notif.id)}
                  className={`w-full text-left glass rounded-xl p-4 flex items-start gap-3 transition-colors ${
                    notif.read
                      ? 'hover:bg-white/5'
                      : 'glass-strong border-l-2 border-l-gold'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    notif.read ? 'bg-white/5' : 'bg-gold/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${notif.read ? 'text-muted-foreground' : 'text-gold'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'font-semibold'}`}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!notif.read && (
                          <Circle className="w-2 h-2 fill-gold text-gold" />
                        )}
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
