'use client';

import { useEffect } from 'react';
import { useAppStore, initializeStore, ViewName } from '@/store';
import { AnimatePresence, motion } from 'framer-motion';

// User views
import AuthView from '@/components/views/AuthView';
import DashboardView from '@/components/views/DashboardView';
import ActivateView from '@/components/views/ActivateView';
import DepositView from '@/components/views/DepositView';
import AdsView from '@/components/views/AdsView';
import TasksView from '@/components/views/TasksView';
import MarketView from '@/components/views/MarketView';
import WithdrawView from '@/components/views/WithdrawView';
import ReferralView from '@/components/views/ReferralView';
import ProfileView from '@/components/views/ProfileView';
import NotificationsView from '@/components/views/NotificationsView';
import SettingsView from '@/components/views/SettingsView';

// Admin views
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminActivationCodes from '@/components/admin/AdminActivationCodes';
import AdminDepositCodes from '@/components/admin/AdminDepositCodes';
import AdminAds from '@/components/admin/AdminAds';
import AdminTasks from '@/components/admin/AdminTasks';
import AdminWithdrawals from '@/components/admin/AdminWithdrawals';
import AdminAnnouncements from '@/components/admin/AdminAnnouncements';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import AdminReferrals from '@/components/admin/AdminReferrals';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function ViewRouter() {
  const view = useAppStore((s) => s.view);

  const views: Record<ViewName, React.ReactNode> = {
    login: <AuthView />,
    register: <AuthView />,
    dashboard: <DashboardView />,
    activate: <ActivateView />,
    deposit: <DepositView />,
    ads: <AdsView />,
    tasks: <TasksView />,
    market: <MarketView />,
    referral: <ReferralView />,
    withdraw: <WithdrawView />,
    notifications: <NotificationsView />,
    profile: <ProfileView />,
    settings: <SettingsView />,
    'admin-dashboard': <AdminDashboard />,
    'admin-users': <AdminUsers />,
    'admin-activation-codes': <AdminActivationCodes />,
    'admin-deposit-codes': <AdminDepositCodes />,
    'admin-ads': <AdminAds />,
    'admin-tasks': <AdminTasks />,
    'admin-withdrawals': <AdminWithdrawals />,
    'admin-announcements': <AdminAnnouncements />,
    'admin-analytics': <AdminAnalytics />,
    'admin-referrals': <AdminReferrals />,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="min-h-screen"
      >
        {views[view] || <DashboardView />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function Home() {
  useEffect(() => {
    initializeStore();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <ViewRouter />
    </main>
  );
}