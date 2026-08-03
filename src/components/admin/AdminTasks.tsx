'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, RefreshCw, ClipboardList, ChevronDown, ChevronUp,
  CheckCircle, XCircle, FileText, Eye, Image as ImageIcon,
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface TaskSubmission {
  id: string;
  userId: string;
  userName: string;
  proof?: string;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

interface Task {
  id: string;
  title: string;
  instructions: string;
  reward: number;
  requiresProof: boolean;
  active: boolean;
  pendingSubmissions: number;
  createdAt: string;
  submissions?: TaskSubmission[];
}

export default function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [proofModal, setProofModal] = useState<{ url: string; title: string } | null>(null);
  const [form, setForm] = useState({
    title: '',
    instructions: '',
    reward: '',
    requiresProof: true,
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/tasks');
      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const fetchSubmissions = async (taskId: string) => {
    setSubmissionsLoading(true);
    try {
      const data = await apiFetch(`/api/admin/tasks/${taskId}/submissions`);
      setSubmissions(Array.isArray(data) ? data : data.submissions || []);
    } catch {
      toast.error('Failed to fetch submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const toggleExpand = (taskId: string) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
      setSubmissions([]);
    } else {
      setExpandedTask(taskId);
      fetchSubmissions(taskId);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.instructions.trim()) { toast.error('Instructions are required'); return; }
    const reward = parseFloat(form.reward);
    if (!reward || reward < 0) { toast.error('Enter a valid reward'); return; }

    setSaving(true);
    try {
      await apiFetch('/api/admin/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          instructions: form.instructions,
          reward,
          requiresProof: form.requiresProof,
        }),
      });
      toast.success('Task created');
      setDialogOpen(false);
      setForm({ title: '', instructions: '', reward: '', requiresProof: true });
      fetchTasks();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmissionAction = async (submissionId: string, action: 'approve' | 'reject') => {
    try {
      const sub = submissions.find((s) => s.id === submissionId);
      await apiFetch(`/api/admin/tasks/submissions/${submissionId}/${action}`, { method: 'POST' });
      toast.success(`Submission ${action}ed for ${sub?.userName || 'user'}`);
      if (expandedTask) fetchSubmissions(expandedTask);
      fetchTasks();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage tasks and review submissions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchTasks} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => { setForm({ title: '', instructions: '', reward: '', requiresProof: true }); setDialogOpen(true); }} className="gap-2 gradient-gold text-[#0a0a0f] hover:opacity-90">
              <Plus className="w-4 h-4" /> Create Task
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No tasks yet</p>
            <p className="text-muted-foreground text-sm mt-1">Create your first task</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead>Task</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Proof Required</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Pending</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead>Submissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task, idx) => (
                    <React.Fragment key={task.id}>
                      <motion.tr
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]">
                              {task.instructions}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>₦{task.reward.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={task.requiresProof ? 'default' : 'outline'} className={task.requiresProof ? 'bg-[#d4a853]/15 text-[#d4a853] border-0' : ''}>
                            {task.requiresProof ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={task.active ? 'bg-[#10b981]/15 text-[#10b981] border-0 hover:bg-[#10b981]/20' : 'bg-white/5 text-muted-foreground border-0'}>
                            {task.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {task.pendingSubmissions > 0 ? (
                            <Badge className="bg-[#f59e0b]/15 text-[#f59e0b] border-0">
                              {task.pendingSubmissions}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => toggleExpand(task.id)}
                            className="gap-1"
                          >
                            {expandedTask === task.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {task.pendingSubmissions > 0 && (
                              <span className="text-xs text-[#f59e0b]">{task.pendingSubmissions}</span>
                            )}
                          </Button>
                        </TableCell>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedTask === task.id && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <td colSpan={7} className="bg-white/[0.02] px-4 py-3">
                              {submissionsLoading ? (
                                <div className="space-y-2">
                                  <Skeleton className="h-10 w-full" />
                                  <Skeleton className="h-10 w-full" />
                                </div>
                              ) : submissions.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No submissions</p>
                              ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                                  {submissions.map((sub) => (
                                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{sub.userName}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(sub.submittedAt).toLocaleString()}
                                        </p>
                                        {sub.proof && (
                                          <p className="text-xs text-muted-foreground mt-1 truncate">{sub.proof}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {sub.proofUrl && (
                                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setProofModal({ url: sub.proofUrl!, title: sub.userName })}>
                                            <Eye className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                        {sub.status === 'pending' ? (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-[#10b981] hover:text-[#10b981] hover:bg-[#10b981]/10" onClick={() => handleSubmissionAction(sub.id, 'approve')}>
                                              <CheckCircle className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleSubmissionAction(sub.id, 'reject')}>
                                              <XCircle className="w-4 h-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <Badge className={sub.status === 'approved' ? 'bg-[#10b981]/15 text-[#10b981] border-0' : 'bg-destructive/15 text-destructive border-0'}>
                                            {sub.status}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Define a new task for users to complete.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="task-instructions">Instructions</Label>
              <Textarea id="task-instructions" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Step-by-step instructions..." className="mt-2 min-h-[100px]" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="task-proof">Requires Proof</Label>
              <Switch id="task-proof" checked={form.requiresProof} onCheckedChange={(checked) => setForm({ ...form, requiresProof: checked })} />
            </div>
            <div>
              <Label htmlFor="task-reward">Reward (₦)</Label>
              <Input id="task-reward" type="number" min={0} value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} placeholder="e.g. 500" className="mt-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="gradient-gold text-[#0a0a0f]">
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Image Modal */}
      <Dialog open={!!proofModal} onOpenChange={(open) => !open && setProofModal(null)}>
        <DialogContent className="glass-strong max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proof from {proofModal?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            {proofModal?.url && (
              <img src={proofModal.url} alt="Proof" className="max-w-full max-h-[60vh] rounded-xl object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
