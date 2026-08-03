'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, RefreshCw, Pencil, Trash2, Megaphone, Image as ImageIcon,
} from 'lucide-react';
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

interface Ad {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  reward: number;
  active: boolean;
  createdAt: string;
}

export default function AdminAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ad | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    thumbnailUrl: '',
    duration: '30',
    reward: '',
  });

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/ads');
      setAds(Array.isArray(data) ? data : data.ads || []);
    } catch {
      toast.error('Failed to fetch ads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const openCreate = () => {
    setEditingAd(null);
    setForm({ title: '', thumbnailUrl: '', duration: '30', reward: '' });
    setDialogOpen(true);
  };

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      thumbnailUrl: ad.thumbnailUrl || '',
      duration: String(ad.duration),
      reward: String(ad.reward),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const duration = parseInt(form.duration);
    const reward = parseFloat(form.reward);
    if (!duration || duration < 1) { toast.error('Enter a valid duration'); return; }
    if (!reward || reward < 0) { toast.error('Enter a valid reward'); return; }

    setSaving(true);
    try {
      if (editingAd) {
        await apiFetch(`/api/admin/ads/${editingAd.id}`, {
          method: 'PUT',
          body: JSON.stringify({ title: form.title, thumbnailUrl: form.thumbnailUrl, duration, reward }),
        });
        toast.success('Ad updated');
      } else {
        await apiFetch('/api/admin/ads', {
          method: 'POST',
          body: JSON.stringify({ title: form.title, thumbnailUrl: form.thumbnailUrl, duration, reward }),
        });
        toast.success('Ad created');
      }
      setDialogOpen(false);
      fetchAds();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/ads/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Ad deleted');
      fetchAds();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Ads</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage ad campaigns and rewards</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAds} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-2 gradient-gold text-[#0a0a0f] hover:opacity-90">
              <Plus className="w-4 h-4" /> Create Ad
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No ads yet</p>
            <p className="text-muted-foreground text-sm mt-1">Create your first ad campaign</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead>Ad</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map((ad, idx) => (
                    <motion.tr
                      key={ad.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {ad.thumbnailUrl ? (
                            <img
                              src={ad.thumbnailUrl}
                              alt={ad.title}
                              className="w-10 h-10 rounded-lg object-cover bg-white/5"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{ad.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{ad.duration}s</TableCell>
                      <TableCell>₦{ad.reward.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            ad.active
                              ? 'bg-[#10b981]/15 text-[#10b981] border-0 hover:bg-[#10b981]/20'
                              : 'bg-white/5 text-muted-foreground border-0 hover:bg-white/10'
                          }
                        >
                          {ad.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {new Date(ad.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-[#3b82f6] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10"
                            onClick={() => openEdit(ad)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(ad)}
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>{editingAd ? 'Edit Ad' : 'Create Ad'}</DialogTitle>
            <DialogDescription>
              {editingAd ? 'Update the ad details below.' : 'Fill in the details for the new ad.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="ad-title">Title</Label>
              <Input id="ad-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ad title" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="ad-thumb">Thumbnail URL</Label>
              <Input id="ad-thumb" value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} placeholder="https://..." className="mt-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ad-duration">Duration (seconds)</Label>
                <Input id="ad-duration" type="number" min={1} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="ad-reward">Reward (₦)</Label>
                <Input id="ad-reward" type="number" min={0} value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} className="mt-2" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-gold text-[#0a0a0f]">
              {saving ? 'Saving...' : editingAd ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
