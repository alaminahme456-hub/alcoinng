'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  UserCheck,
  Ban,
  Trash2,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useAppStore, apiFetch } from '@/store';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  status: string;
  isActivated: boolean;
  wallets: { reward: number; deposit: number; profit: number };
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'activate' | 'suspend' | 'delete';
    user: User;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/users');
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search)
  );

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    setActionLoading(true);
    try {
      if (type === 'activate') {
        await apiFetch('/api/admin/users', { method: 'PUT', body: JSON.stringify({ userId: user.id, action: 'activate' }) });
        toast.success(`${user.fullName} activated`);
      } else if (type === 'suspend') {
        await apiFetch('/api/admin/users', { method: 'PUT', body: JSON.stringify({ userId: user.id, action: 'suspend' }) });
        toast.success(`${user.fullName} suspended`);
      } else if (type === 'delete') {
        await apiFetch('/api/admin/users', { method: 'PUT', body: JSON.stringify({ userId: user.id, action: 'delete' }) });
        toast.success(`${user.fullName} deleted`);
      }
      fetchUsers();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {users.length} total users
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activation</TableHead>
                    <TableHead className="hidden sm:table-cell">Wallet Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, idx) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                    >
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">@{user.username}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {user.email}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {user.phone}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === 'active' ? 'default' : 'destructive'}
                          className={
                            user.status === 'active'
                              ? 'bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/20 border-0'
                              : 'bg-[#ef4444]/15 text-[#ef4444] hover:bg-[#ef4444]/20 border-0'
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActivated ? 'default' : 'outline'}
                          className={
                            user.isActivated
                              ? 'bg-[#d4af37]/15 text-[#d4af37] hover:bg-[#d4af37]/20 border-0'
                              : 'text-muted-foreground'
                          }
                        >
                          {user.isActivated ? 'Activated' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">
                          ₦{(user.wallets?.reward ?? 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!user.isActivated && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-[#10b981] hover:text-[#10b981] hover:bg-[#10b981]/10"
                              onClick={() => setConfirmAction({ type: 'activate', user })}
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#ffd700] hover:text-[#ffd700] hover:bg-[#ffd700]/10"
                            onClick={() => setConfirmAction({ type: 'suspend', user })}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmAction({ type: 'delete', user })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'delete'
                ? 'Delete User'
                : confirmAction?.type === 'activate'
                ? 'Activate User'
                : 'Suspend User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'delete'
                ? `Are you sure you want to delete ${confirmAction?.user.fullName}? This action cannot be undone.`
                : confirmAction?.type === 'activate'
                ? `Activate ${confirmAction?.user.fullName}? They will gain access to platform features.`
                : `Suspend ${confirmAction?.user.fullName}? They will lose access to the platform.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={actionLoading}
              className={
                confirmAction?.type === 'delete'
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : ''
              }
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
