'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Ban, RotateCcw, Key, Copy, Check, Search, Eye, Sparkles } from 'lucide-react';
import { useAppStore, apiFetch } from '@/store';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ActivationCode {
  id: string;
  code: string;
  activationValue: number;
  status: 'unused' | 'used' | 'disabled';
  generatedAt: string;
  redeemedBy: string | null;
  redeemedAt: string | null;
}

const STATUS_FILTERS = ['all', 'unused', 'used', 'disabled'] as const;

export default function AdminActivationCodes() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [disableTarget, setDisableTarget] = useState<ActivationCode | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);
  const [viewTarget, setViewTarget] = useState<ActivationCode | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '50');

      const data = await apiFetch(`/api/admin/activation-codes?${params.toString()}`);
      setCodes(Array.isArray(data) ? data : data.codes || []);
    } catch {
      toast.error('Failed to fetch activation codes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleGenerateSingle = async () => {
    setGenLoading(true);
    try {
      const data = await apiFetch('/api/admin/activation-codes', {
        method: 'POST',
        body: JSON.stringify({ count: 1 }),
      });
      const newCodes = data.codes || [];
      if (newCodes.length > 0) {
        toast.success(`Generated: ${newCodes[0].code}`);
      }
      fetchCodes();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleGenerateBatch = async (count: number) => {
    setGenLoading(true);
    try {
      const data = await apiFetch('/api/admin/activation-codes', {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
      const newCodes = data.codes || [];
      toast.success(`${newCodes.length} activation code(s) generated`);
      fetchCodes();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disableTarget) return;
    setDisableLoading(true);
    try {
      await apiFetch('/api/admin/activation-codes', {
        method: 'PUT',
        body: JSON.stringify({ codeId: disableTarget.id, action: 'disable' }),
      });
      toast.success(`Code ${disableTarget.code} disabled`);
      fetchCodes();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setDisableLoading(false);
      setDisableTarget(null);
    }
  };

  const handleEnable = async (code: ActivationCode) => {
    try {
      await apiFetch('/api/admin/activation-codes', {
        method: 'PUT',
        body: JSON.stringify({ codeId: code.id, action: 'enable' }),
      });
      toast.success(`Code ${code.code} re-enabled`);
      fetchCodes();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Code copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'unused':
        return <Badge className="bg-[#10b981]/15 text-[#10b981] border-0 hover:bg-[#10b981]/20">Unused</Badge>;
      case 'used':
        return <Badge className="bg-[#3b82f6]/15 text-[#3b82f6] border-0 hover:bg-[#3b82f6]/20">Used</Badge>;
      case 'disabled':
        return <Badge className="bg-white/5 text-muted-foreground border-0 hover:bg-white/10">Disabled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Activation Codes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage ALC-format activation codes (ALC001 – ALC999)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchCodes} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateSingle}
              disabled={genLoading}
              className="gap-2 gradient-gold text-[#0a0a0f] hover:opacity-90 font-semibold"
            >
              <Sparkles className="w-4 h-4" />
              {genLoading ? 'Generating...' : 'Generate Activation Code'}
            </Button>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search codes... (e.g. ALC427)"
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? 'bg-gold/20 text-gold border-gold/30 hover:bg-gold/30' : 'text-xs'}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Codes Table */}
        {loading ? (
          <div className="glass rounded-2xl p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : codes.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No activation codes found</p>
            <p className="text-muted-foreground text-sm mt-1">
              Click &quot;Generate Activation Code&quot; to create one
            </p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="hidden lg:table-cell">Redeemed By</TableHead>
                    <TableHead className="hidden lg:table-cell">Redeemed At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code, idx) => (
                    <motion.tr
                      key={code.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-white/5 px-2.5 py-1 rounded">
                            {code.code}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => copyCode(code.code, code.id)}
                          >
                            {copiedId === code.id
                              ? <Check className="w-3.5 h-3.5 text-[#10b981]" />
                              : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(code.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {formatDate(code.generatedAt)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {code.redeemedBy || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {formatDate(code.redeemedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setViewTarget(code)}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {code.status === 'unused' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-yellow-500 hover:text-yellow-500 hover:bg-yellow-500/10"
                              onClick={() => setDisableTarget(code)}
                              title="Disable code"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          {code.status === 'disabled' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-[#10b981] hover:text-[#10b981] hover:bg-[#10b981]/10"
                              onClick={() => handleEnable(code)}
                              title="Re-enable code"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
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

      {/* View Details Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Code Details</DialogTitle>
            <DialogDescription>Activation code information</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Code</span>
                <code className="text-lg font-mono font-bold bg-white/5 px-3 py-1.5 rounded">
                  {viewTarget.code}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {statusBadge(viewTarget.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Activation Value</span>
                <span className="text-sm font-semibold">₦5,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{formatDate(viewTarget.generatedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Redeemed By</span>
                <span className="text-sm">{viewTarget.redeemedBy || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Redeemed At</span>
                <span className="text-sm">{formatDate(viewTarget.redeemedAt)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation */}
      <AlertDialog open={!!disableTarget} onOpenChange={(open) => !open && setDisableTarget(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable code{' '}
              <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-sm">{disableTarget?.code}</code>?{' '}
              This action can be reversed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disableLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisable} disabled={disableLoading}>
              {disableLoading ? 'Disabling...' : 'Disable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
