'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, TrendingUp, ArrowDownToLine, BarChart3, Wallet, DollarSign, Activity,
} from 'lucide-react';
import { useAppStore, apiFetch } from '@/store';
import AdminLayout from './AdminLayout';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface AnalyticsData {
  totalUsers: number;
  activatedUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalRevenue: number;
  activeUsersToday: number;
  dailyRegistrations?: Array<{ date: string; count: number }>;
  depositWithdrawalChart?: Array<{ date: string; deposits: number; withdrawals: number }>;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  colorClass: string;
  bgColor: string;
  borderColor: string;
}

function StatCard({ label, value, icon: Icon, colorClass, bgColor, borderColor }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-5 border ${borderColor} hover:scale-[1.02] transition-transform duration-200`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium">{entry.name === 'count' ? entry.value : `₦${entry.value.toLocaleString()}`}</span>
        </div>
      ))}
    </div>
  );
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/admin/analytics')
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="glass rounded-2xl p-12 text-center">
          <Activity className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-destructive">{error || 'Failed to load analytics'}</p>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    { label: 'Total Users', value: data.totalUsers.toLocaleString(), icon: Users, colorClass: 'text-[#3b82f6]', bgColor: 'bg-[#3b82f6]/10', borderColor: 'border-[#3b82f6]/20' },
    { label: 'Activated Users', value: data.activatedUsers.toLocaleString(), icon: UserCheck, colorClass: 'text-[#10b981]', bgColor: 'bg-[#10b981]/10', borderColor: 'border-[#10b981]/20' },
    { label: 'Total Deposits', value: `₦${data.totalDeposits.toLocaleString()}`, icon: TrendingUp, colorClass: 'text-[#d4af37]', bgColor: 'bg-[#d4af37]/10', borderColor: 'border-[#d4af37]/20' },
    { label: 'Total Withdrawals', value: `₦${data.totalWithdrawals.toLocaleString()}`, icon: ArrowDownToLine, colorClass: 'text-[#ef4444]', bgColor: 'bg-[#ef4444]/10', borderColor: 'border-[#ef4444]/20' },
    { label: 'Total Revenue', value: `₦${(data.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, colorClass: 'text-[#8b5cf6]', bgColor: 'bg-[#8b5cf6]/10', borderColor: 'border-[#8b5cf6]/20' },
    { label: 'Active Today', value: (data.activeUsersToday || 0).toLocaleString(), icon: Activity, colorClass: 'text-[#06b6d4]', bgColor: 'bg-[#06b6d4]/10', borderColor: 'border-[#06b6d4]/20' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Detailed platform analytics and trends</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Registrations Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-[#3b82f6]" />
              <h2 className="text-lg font-semibold">Daily Registrations</h2>
            </div>
            {data.dailyRegistrations && data.dailyRegistrations.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.dailyRegistrations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#8888a0', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8888a0', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#0a0a0f', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                No registration data available
              </div>
            )}
          </motion.div>

          {/* Deposits vs Withdrawals Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="w-5 h-5 text-[#d4af37]" />
              <h2 className="text-lg font-semibold">Deposits vs Withdrawals</h2>
            </div>
            {data.depositWithdrawalChart && data.depositWithdrawalChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.depositWithdrawalChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#8888a0', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8888a0', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                    tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 16 }}
                    formatter={(value: string) => <span style={{ color: '#e8e8ed', fontSize: 13 }}>{value}</span>}
                  />
                  <Bar dataKey="deposits" name="deposits" fill="#d4af37" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="withdrawals" name="withdrawals" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                No transaction data available
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
