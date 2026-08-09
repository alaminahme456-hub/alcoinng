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
  Wallet,
} from 'lucide-react';
import { apiFetch } from '@/store';
import AdminLayout from './AdminLayout';
import { Skeleton } from '@/components/ui/skeleton';

interface StatDef {
  label: string;
  getValue: (d: ApiData) => number;
  icon: React.ElementType;
  color: string;
  isCurrency?: boolean;
}

interface ApiData {
  users?: { total: number; activated: number; pendingActivation: number };
  deposits?: { total: number; unusedCodes: number; usedCodes: number };
  depositsCodes?: { unused: number; used: number };
  withdrawals?: { totalPaid: number; pendingAmount: number; pendingCount: number };
  wallets?: { rewardBalance: number; depositBalance: number; profitBalance: number };
  trades?: { total: number; wins: number; losses: number; totalStaked: number; totalProfitPaid: number };
  tasks?: { active: number; pendingSubmissions: number };
  ads?: { active: number };
  dailyRegistrations?: Record<string, number>;
}

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  gold:    { bg: 'bg-[#d4af37]/10', icon: 'text-[#d4af37]', border: 'border-[#d4af37]/20' },
  blue:    { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   border: 'border-blue-500/20' },
  green:   { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/20' },
  red:     { bg: 'bg-red-500/10',     icon: 'text-red-400',     border: 'border-red-500/20' },
  purple:  { bg: 'bg-purple-500/10',  icon: 'text-purple-400',  border: 'border-purple-500/20' },
  cyan:    { bg: 'bg-cyan-500/10',    icon: 'text-cyan-400',    border: 'border-cyan-500/20' },
  amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-400',   border: 'border-amber-500/20' },
};

function formatNaira(amount: number): string {
  return `\u20a6${amount.toLocaleString()}`;
}

function StatCard({ def, data }: { def: StatDef; data: ApiData }) {
  const Icon = def.icon;
  const c = colorMap[def.color] || colorMap.blue;
  const rawValue = def.getValue(data);
  const displayValue = def.isCurrency ? formatNaira(rawValue) : rawValue.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-5 border ${c.border} hover:scale-[1.02] transition-transform duration-200`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{def.label}</p>
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
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/admin/analytics')
      .then((d) => setData(d))
      .catch((e: any) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const stats: StatDef[] = [
    { label: 'Total Users',         getValue: (d) => d.users?.total ?? 0,            icon: Users,          color: 'blue' },
    { label: 'Activated Users',     getValue: (d) => d.users?.activated ?? 0,        icon: UserCheck,      color: 'green' },
    { label: 'Pending Activation',  getValue: (d) => d.users?.pendingActivation ?? 0, icon: Clock,      color: 'amber' },
    { label: 'Total Deposits',      getValue: (d) => d.deposits?.total ?? 0,         icon: TrendingUp,     color: 'gold', isCurrency: true },
    { label: 'Total Withdrawals',   getValue: (d) => d.withdrawals?.totalPaid ?? 0,  icon: ArrowDownToLine, color: 'red', isCurrency: true },
    { label: 'Pending Withdrawals', getValue: (d) => d.withdrawals?.pendingCount ?? 0, icon: AlertCircle, color: 'amber' },
    { label: 'Active Tasks',        getValue: (d) => d.tasks?.active ?? 0,            icon: ClipboardList,  color: 'purple' },
    { label: 'Active Ads',          getValue: (d) => d.ads?.active ?? 0,              icon: Megaphone,     color: 'cyan' },
  ];

  // Extra summary rows
  const extraStats: StatDef[] = [
    { label: 'Total Trades',        getValue: (d) => d.trades?.total ?? 0,            icon: Activity,       color: 'blue' },
    { label: 'Total Staked',        getValue: (d) => d.trades?.totalStaked ?? 0,      icon: Wallet,         color: 'gold', isCurrency: true },
    { label: 'Pending Withdrawal Amount', getValue: (d) => d.withdrawals?.pendingAmount ?? 0, icon: AlertCircle, color: 'red', isCurrency: true },
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
            {/* Primary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <StatCard key={stat.label} def={stat} data={data!} />
              ))}
            </div>

            {/* Extra Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {extraStats.map((stat) => (
                <StatCard key={stat.label} def={stat} data={data!} />
              ))}
            </div>

            {/* Trade Stats Summary */}
            {data?.trades && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Trade Summary</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{(data.trades.wins ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Winning Trades</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">{(data.trades.losses ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Losing Trades</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">{formatNaira(data.trades.totalProfitPaid ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Profit Paid</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400">
                      {data.trades.total > 0 ? ((data.trades.wins / data.trades.total) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Win Rate</p>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Balances Summary */}
            {data?.wallets && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Platform Wallet Balances</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-xl font-bold text-amber-400">{formatNaira(data.wallets.rewardBalance ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Reward Wallets</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <p className="text-xl font-bold text-blue-400">{formatNaira(data.wallets.depositBalance ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Deposit Wallets</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-xl font-bold text-emerald-400">{formatNaira(data.wallets.profitBalance ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Profit Wallets</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
