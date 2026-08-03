'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  ArrowDownToLine,
  AlertCircle,
  ClipboardList,
  Megaphone,
  Activity,
} from 'lucide-react';
import { useAppStore, apiFetch } from '@/store';
import AdminLayout from './AdminLayout';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsData {
  totalUsers: number;
  activatedUsers: number;
  pendingActivations: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  activeTasks: number;
  activeAds: number;
  recentActivity?: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface StatCard {
  label: string;
  value: string;
  icon: React.ElementType;
  color: 'gold' | 'blue' | 'green' | 'red' | 'purple' | 'cyan' | 'amber' | 'emerald';
  isCurrency?: boolean;
}

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  gold: { bg: 'bg-[#d4a853]/10', icon: 'text-[#d4a853]', border: 'border-[#d4a853]/20' },
  blue: { bg: 'bg-[#3b82f6]/10', icon: 'text-[#3b82f6]', border: 'border-[#3b82f6]/20' },
  green: { bg: 'bg-[#10b981]/10', icon: 'text-[#10b981]', border: 'border-[#10b981]/20' },
  red: { bg: 'bg-[#ef4444]/10', icon: 'text-[#ef4444]', border: 'border-[#ef4444]/20' },
  purple: { bg: 'bg-[#8b5cf6]/10', icon: 'text-[#8b5cf6]', border: 'border-[#8b5cf6]/20' },
  cyan: { bg: 'bg-[#06b6d4]/10', icon: 'text-[#06b6d4]', border: 'border-[#06b6d4]/20' },
  amber: { bg: 'bg-[#f59e0b]/10', icon: 'text-[#f59e0b]', border: 'border-[#f59e0b]/20' },
  emerald: { bg: 'bg-[#059669]/10', icon: 'text-[#059669]', border: 'border-[#059669]/20' },
};

function StatCardComponent({ card, data }: { card: StatCard; data: AnalyticsData }) {
  const Icon = card.icon;
  const c = colorMap[card.color];
  const rawValue = data[card.label.replace(/ /g, '') as keyof AnalyticsData] as number | undefined;
  const displayValue = card.isCurrency
    ? `₦${(rawValue ?? 0).toLocaleString()}`
    : (rawValue ?? 0).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-5 border ${c.border} hover:scale-[1.02] transition-transform duration-200`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className="text-2xl font-bold mt-1">{displayValue}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/admin/analytics')
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats: StatCard[] = [
    { label: 'Total Users', value: '', icon: Users, color: 'blue' },
    { label: 'Activated Users', value: '', icon: UserCheck, color: 'green' },
    { label: 'Pending Activations', value: '', icon: Clock, color: 'amber' },
    { label: 'Total Deposits', value: '', icon: TrendingUp, color: 'gold', isCurrency: true },
    { label: 'Total Withdrawals', value: '', icon: ArrowDownToLine, color: 'red', isCurrency: true },
    { label: 'Pending Withdrawals', value: '', icon: AlertCircle, color: 'amber' },
    { label: 'Active Tasks', value: '', icon: ClipboardList, color: 'purple' },
    { label: 'Active Ads', value: '', icon: Megaphone, color: 'cyan' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your platform performance</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Activity className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-destructive">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <StatCardComponent key={stat.label} card={stat} data={data!} />
              ))}
            </div>

            {/* Recent Activity */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                  {data.recentActivity.map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#d4a853] mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-muted-foreground shrink-0">
                        {activity.type}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
