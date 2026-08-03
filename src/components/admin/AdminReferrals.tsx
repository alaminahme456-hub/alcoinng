'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, Share2, Users, TrendingUp, UserPlus, Award, ArrowRight,
} from 'lucide-react';
import { useAppStore, apiFetch } from '@/store';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface ReferralRelationship {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerUsername: string;
  referredId: string;
  referredName: string;
  referredUsername: string;
 convertedAt: string;
}

interface TopReferrer {
  userId: string;
  name: string;
  username: string;
  totalReferrals: number;
  convertedReferrals: number;
  totalEarnings: number;
}

interface ReferralStats {
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
  totalReferralEarnings: number;
}

export default function AdminReferrals() {
  const [relationships, setRelationships] = useState<ReferralRelationship[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/referrals');
      setRelationships(Array.isArray(data.relationships) ? data.relationships : []);
      setTopReferrers(Array.isArray(data.topReferrers) ? data.topReferrers : []);
      if (data.stats) setStats(data.stats);
    } catch {
      toast.error('Failed to fetch referral data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRelationships = relationships.filter(
    (r) =>
      r.referrerName.toLowerCase().includes(search.toLowerCase()) ||
      r.referrerUsername.toLowerCase().includes(search.toLowerCase()) ||
      r.referredName.toLowerCase().includes(search.toLowerCase()) ||
      r.referredUsername.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { label: 'Total Referrals', value: stats?.totalReferrals ?? 0, icon: Share2, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/20' },
    { label: 'Converted', value: stats?.convertedReferrals ?? 0, icon: UserPlus, color: 'text-[#10b981]', bg: 'bg-[#10b981]/10', border: 'border-[#10b981]/20' },
    { label: 'Conversion Rate', value: stats ? `${stats.conversionRate.toFixed(1)}%` : '0%', icon: TrendingUp, color: 'text-[#d4a853]', bg: 'bg-[#d4a853]/10', border: 'border-[#d4a853]/20' },
    { label: 'Total Earnings', value: `₦${(stats?.totalReferralEarnings ?? 0).toLocaleString()}`, icon: Award, color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]/10', border: 'border-[#8b5cf6]/20' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Referrals</h1>
            <p className="text-muted-foreground text-sm mt-1">Track referral performance and relationships</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`glass rounded-2xl p-5 border ${stat.border} hover:scale-[1.02] transition-transform duration-200`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Top Referrers */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#d4a853]" />
            Top Referrers
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : topReferrers.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
              No referral data yet
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topReferrers.map((referrer, idx) => (
                <motion.div
                  key={referrer.userId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center text-sm font-bold text-[#0a0a0f]">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{referrer.name}</p>
                      <p className="text-xs text-muted-foreground">@{referrer.username}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/[0.03] rounded-xl py-2">
                      <p className="text-lg font-bold">{referrer.totalReferrals}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl py-2">
                      <p className="text-lg font-bold text-[#10b981]">{referrer.convertedReferrals}</p>
                      <p className="text-xs text-muted-foreground">Converted</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl py-2">
                      <p className="text-lg font-bold text-[#d4a853]">₦{referrer.totalEarnings.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Earned</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Referral Relationships Table */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#3b82f6]" />
              All Referrals
            </h2>
            <div className="relative max-w-xs w-full">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="glass rounded-2xl p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRelationships.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No referral relationships found</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead>Referrer</TableHead>
                      <TableHead></TableHead>
                      <TableHead>Referred</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRelationships.map((rel, idx) => (
                      <motion.tr
                        key={rel.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{rel.referrerName}</p>
                            <p className="text-xs text-muted-foreground">@{rel.referrerUsername}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="w-4 h-4 text-[#d4a853] mx-2" />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rel.referredName}</p>
                            <p className="text-xs text-muted-foreground">@{rel.referredUsername}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {new Date(rel.convertedAt).toLocaleDateString()}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
