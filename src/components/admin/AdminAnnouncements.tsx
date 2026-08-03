'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, RefreshCw, Trash2, Bell, Megaphone, Pencil, Eye, EyeOff,
} from 'lucide-react';
import { useAppStore, apiFetch } from '@/store';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  message: string;
  active: boolean;
  createdAt: string;
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', message: '' });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/announcements');
      setAnnouncements(Array.isArray(data) ? data : data.announcements || []);
    } catch {
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', message: '' });
    setDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({ title: a.title, message: a.message });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.message.trim()) { toast.error('Message is required'); return; }

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/admin/announcements/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        toast.success('Announcement updated');
      } else {
        await apiFetch('/api/admin/announcements', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Announcement created');
      }
      setDialogOpen(false);
      fetchAnnouncements();
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
      await apiFetch(`/api/admin/announcements/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggle = async (a: Announcement) => {
    setToggling(a.id);
    try {
      await apiFetch(`/api/admin/announcements/${a.id}/toggle`, { method: 'POST' });
      toast.success(a.active ? 'Announcement hidden' : 'Announcement shown');
      fetchAnnouncements();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setToggling(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Announcements</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage platform announcements</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAnnouncements} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-2 gradient-gold text-[#0a0a0f] hover:opacity-90">
              <Plus className="w-4 h-4" /> Create
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No announcements yet</p>
            <p className="text-muted-foreground text-sm mt-1">Create your first announcement</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {announcements.map((a, idx) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`glass rounded-2xl p-5 transition-all ${!a.active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Bell className="w-4 h-4 text-[#d4a853] shrink-0" />
                        <h3 className="font-semibold truncate">{a.title}</h3>
                        <Badge
                          className={a.active
                            ? 'bg-[#10b981]/15 text-[#10b981] border-0 hover:bg-[#10b981]/20 shrink-0'
                            : 'bg-white/5 text-muted-foreground border-0 shrink-0'
                          }
                        >
                          {a.active ? 'Active' : 'Hidden'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-2 opacity-60">
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon" variant="ghost"
                        className={`h-8 w-8 ${a.active ? 'text-[#d4a853] hover:text-[#d4a853] hover:bg-[#d4a853]/10' : 'text-muted-foreground'}`}
                        onClick={() => handleToggle(a)}
                        disabled={toggling === a.id}
                      >
                        {a.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-[#3b82f6] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(a)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the announcement details.' : 'Write a new announcement for users.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="ann-title">Title</Label>
              <Input id="ann-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="ann-message">Message</Label>
              <Textarea id="ann-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write your announcement..." className="mt-2 min-h-[120px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-gold text-[#0a0a0f]">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
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
