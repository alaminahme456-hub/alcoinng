'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, ArrowDownToLine, CheckCircle, XCircle, Banknote, Clock, CheckCheck, Ban,
} from 'lucide-react';
import { useAppStore, apiFetch } from '@/store';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  walletType: string;
  amount: number;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
  processedAt?: string;
}

const statusConfig: Record<string, { label: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', bg: 'bg-[#f59e0b]/15 text-[#f59e0b] border-0 hover:bg-[#f59e0b]/20', icon: Clock },
  approved: { label: 'Approved', bg: 'bg-[#3b82f6]/15 text-[#3b82f6] border-0 hover:bg-[#3b82f6]/20', icon: CheckCircle },
  rejected: { label: 'Rejected', bg: 'bg-destructive/15 text-destructive border-0 hover:bg-destructive/20', icon: XCircle },
  paid: { label: 'Paid', bg: 'bg-[#10b981]/15 text-[#10b981] border-0 hover:bg-[#10b981]/20', icon: CheckCheck },
};

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'paid';
    withdrawal: Withdrawal;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/withdrawals');
      setWithdrawals(Array.isArray(data) ? data : data.withdrawals || []);
    } catch {
      toast.error('Failed to fetch withdrawals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const filteredWithdrawals = withdrawals.filter((w) => w.status === activeTab);

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, withdrawal } = confirmAction;
    setActionLoading(true);
    try {
      await apiFetch('/api/admin/withdrawals', { method: 'PUT', body: JSON.stringify({ withdrawalId: withdrawal.id, action: type === 'paid' ? 'pay' : type }) });
      toast.success(`Withdrawal ${type === 'paid' ? 'marked as paid' : `${type}d`}`);
      fetchWithdrawals();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const WithdrawalTable = ({ items }: { items: Withdrawal[] }) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <ArrowDownToLine className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">No {activeTab} withdrawals</p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="hidden md:table-cell">Bank</TableHead>
              <TableHead className="hidden lg:table-cell">Account</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              {activeTab === 'pending' && <TableHead>Actions</TableHead>}
              {activeTab === 'approved' && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((w, idx) => {
              const cfg = statusConfig[w.status];
              const StatusIcon = cfg.icon;
              return (
                <motion.tr
                  key={w.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#d4a853]/10 flex items-center justify-center text-xs font-bold text-[#d4a853]">
                        {w.userName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-sm">{w.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{w.walletType}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">₦{w.amount.toLocaleString()}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{w.bankName}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    <div>
                      <p>{w.bankAccountName}</p>
                      <p className="text-xs opacity-60">{w.bankAccount}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {new Date(w.createdAt).toLocaleString()}
                  </TableCell>
                  {activeTab === 'pending' && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-[#10b981] hover:text-[#10b981] hover:bg-[#10b981]/10"
                          onClick={() => setConfirmAction({ type: 'approve', withdrawal: w })}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmAction({ type: 'reject', withdrawal: w })}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  {activeTab === 'approved' && (
                    <TableCell>
                      <Button
                        size="sm" variant="ghost"
                        className="gap-1 text-[#10b981] hover:text-[#10b981] hover:bg-[#10b981]/10"
                        onClick={() => setConfirmAction({ type: 'paid', withdrawal: w })}
                      >
                        <Banknote className="w-4 h-4" />
                        Mark Paid
                      </Button>
                    </TableCell>
                  )}
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Withdrawals</h1>
            <p className="text-muted-foreground text-sm mt-1">Process and manage withdrawal requests</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchWithdrawals} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="glass">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-3.5 h-3.5" /> Pending
              {withdrawals.filter((w) => w.status === 'pending').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] text-xs">
                  {withdrawals.filter((w) => w.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="w-3.5 h-3.5" /> Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="w-3.5 h-3.5" /> Rejected
            </TabsTrigger>
            <TabsTrigger value="paid" className="gap-2">
              <CheckCheck className="w-3.5 h-3.5" /> Paid
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="glass rounded-2xl p-6 mt-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl mt-4 overflow-hidden">
              <TabsContent value="pending" className="m-0 p-4">
                <WithdrawalTable items={filteredWithdrawals} />
              </TabsContent>
              <TabsContent value="approved" className="m-0 p-4">
                <WithdrawalTable items={filteredWithdrawals} />
              </TabsContent>
              <TabsContent value="rejected" className="m-0 p-4">
                <WithdrawalTable items={filteredWithdrawals} />
              </TabsContent>
              <TabsContent value="paid" className="m-0 p-4">
                <WithdrawalTable items={filteredWithdrawals} />
              </TabsContent>
            </div>
          )}
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'reject'
                ? 'Reject Withdrawal'
                : confirmAction?.type === 'paid'
                ? 'Mark as Paid'
                : 'Approve Withdrawal'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'reject'
                ? `Reject the withdrawal request of ₦${confirmAction?.withdrawal.amount.toLocaleString()} from ${confirmAction?.withdrawal.userName}? The funds will be returned to the user's wallet.`
                : confirmAction?.type === 'paid'
                ? `Confirm that ₦${confirmAction?.withdrawal.amount.toLocaleString()} has been paid to ${confirmAction?.withdrawal.userName}?`
                : `Approve the withdrawal request of ₦${confirmAction?.withdrawal.amount.toLocaleString()} from ${confirmAction?.withdrawal.userName}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={actionLoading}
              className={confirmAction?.type === 'reject' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
