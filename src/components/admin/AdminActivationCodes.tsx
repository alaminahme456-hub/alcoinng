'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Ban, Key, Copy, Check } from 'lucide-react';
import { useAppStore, apiFetch } from '@/store';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  value: number;
  status: 'unused' | 'used' | 'disabled';
  createdAt: string;
  redeemedBy?: string;
  redeemedAt?: string;
}

export default function AdminActivationCodes() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [genCount, setGenCount] = useState('1');
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [disableTarget, setDisableTarget] = useState<ActivationCode | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/activation-codes');
      setCodes(Array.isArray(data) ? data : data.codes || []);
    } catch {
      toast.error('Failed to fetch activation codes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleGenerate = async () => {
    const count = parseInt(genCount);
    if (!count || count < 1 || count > 100) {
      toast.error('Enter a valid count (1-100)');
      return;
    }
    setGenLoading(true);
    try {
      await apiFetch('/api/admin/activation-codes', {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
      toast.success(`${count} activation code${count > 1 ? 's' : ''} generated`);
      setGenDialogOpen(false);
      setGenCount('1');
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
      await apiFetch('/api/admin/activation-codes', { method: 'PUT', body: JSON.stringify({ codeId: disableTarget.id, action: 'disable' }) });
      toast.success('Code disabled');
      fetchCodes();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setDisableLoading(false);
      setDisableTarget(null);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Code copied');
    setTimeout(() => setCopiedId(null), 2000);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Activation Codes</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage activation codes for users</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchCodes} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 gradient-gold text-[#0a0a0f] hover:opacity-90">
                  <Plus className="w-4 h-4" /> Generate Codes
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong">
                <DialogHeader>
                  <DialogTitle>Generate Activation Codes</DialogTitle>
                  <DialogDescription>
                    Enter the number of codes to generate.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="gen-count">Number of Codes</Label>
                  <Input
                    id="gen-count"
                    type="number"
                    min={1}
                    max={100}
                    value={genCount}
                    onChange={(e) => setGenCount(e.target.value)}
                    placeholder="e.g. 10"
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setGenDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleGenerate} disabled={genLoading} className="gradient-gold text-[#0a0a0f]">
                    {genLoading ? 'Generating...' : 'Generate'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : codes.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No activation codes yet</p>
            <p className="text-muted-foreground text-sm mt-1">Generate your first codes to get started</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead>Code</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Generated</TableHead>
                    <TableHead className="hidden lg:table-cell">Redeemed By</TableHead>
                    <TableHead className="hidden lg:table-cell">Redeemed Date</TableHead>
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
                          <code className="text-sm font-mono bg-white/5 px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => copyCode(code.code, code.id)}
                          >
                            {copiedId === code.id ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>₦{code.value.toLocaleString()}</TableCell>
                      <TableCell>{statusBadge(code.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {new Date(code.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {code.redeemedBy || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {code.redeemedAt ? new Date(code.redeemedAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        {code.status === 'unused' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#ffd700] hover:text-[#ffd700] hover:bg-[#ffd700]/10"
                            onClick={() => setDisableTarget(code)}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!disableTarget} onOpenChange={(open) => !open && setDisableTarget(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable code <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-sm">{disableTarget?.code}</code>? This action cannot be undone.
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
