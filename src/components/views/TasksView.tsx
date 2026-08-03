'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, ClipboardList, Coins, ImageIcon, Send,
  CheckCircle2, XCircle, Clock, AlertCircle,
  FileCheck, Loader2, Link,
} from 'lucide-react';

function formatNaira(amount: number) {
  return `\u20a6${amount.toLocaleString()}`;
}

interface TaskItem {
  id: string;
  title: string;
  instructions: string;
  reward: number;
  requiresProof: boolean;
  maxSubmissions?: number;
  status?: 'none' | 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  rejectionReason?: string;
}

type SubmitState = null | { loading: boolean; error: string; success: boolean };

export default function TasksView() {
  const { setView } = useAppStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog state
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch('/api/tasks');
      setTasks(data.tasks || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openSubmitDialog = (task: TaskItem) => {
    setSelectedTask(task);
    setProofUrl('');
    setSubmitError('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;

    if (selectedTask.requiresProof && !proofUrl.trim()) {
      setSubmitError('Please provide a proof URL');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const body: any = { taskId: selectedTask.id };
      if (selectedTask.requiresProof) {
        body.proof = proofUrl.trim();
      }

      await apiFetch('/api/tasks/submit', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      toast.success('Task Submitted!', {
        description: `${formatNaira(selectedTask.reward)} reward is pending approval.`,
      });

      // Update local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? { ...t, status: 'pending', submittedAt: new Date().toISOString() }
            : t
        )
      );

      setDialogOpen(false);
      setProofUrl('');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (task: TaskItem) => {
    switch (task.status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setView('dashboard')}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-blue flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-alcoin-blue-foreground" />
          </div>
          <h1 className="font-semibold text-lg">Task Center</h1>
        </div>
      </header>

      <main className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4 border-l-4 border-l-alcoin-blue"
        >
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-alcoin-blue shrink-0" />
            <div>
              <p className="text-sm font-medium">Complete Tasks, Earn Rewards</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete simple tasks to earn AL Coin rewards. Some tasks require proof of completion.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-6 text-center"
          >
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4 border-white/10"
              onClick={fetchTasks}
            >
              Try Again
            </Button>
          </motion.div>
        )}

        {/* Empty */}
        {!loading && !error && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-8 text-center"
          >
            <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No Tasks Available</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Check back later for new tasks to complete.
            </p>
          </motion.div>
        )}

        {/* Task Cards */}
        {!loading && !error && tasks.length > 0 && (
          <div className="space-y-3">
            {tasks.map((task, index) => {
              const isSubmitted = task.status && task.status !== 'none';
              const isRejected = task.status === 'rejected';

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass rounded-xl p-4 transition-all duration-200 ${
                    task.status === 'approved'
                      ? 'border-emerald-500/20'
                      : 'hover:border-alcoin-blue/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]'
                  }`}
                >
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{task.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.instructions}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-gold/10 text-gold border-gold/20 text-xs gap-1 shrink-0"
                    >
                      <Coins className="w-3 h-3" />
                      {formatNaira(task.reward)}
                    </Badge>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {task.requiresProof && (
                      <Badge
                        variant="secondary"
                        className="bg-alcoin-blue/10 text-alcoin-blue border-alcoin-blue/20 text-[10px] gap-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        Requires Proof
                      </Badge>
                    )}
                    {getStatusBadge(task)}
                  </div>

                  {/* Rejection reason */}
                  {isRejected && task.rejectionReason && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 mb-3"
                    >
                      <p className="text-xs text-destructive">
                        <span className="font-medium">Reason: </span>
                        {task.rejectionReason}
                      </p>
                    </motion.div>
                  )}

                  {/* Submit info */}
                  {task.status === 'pending' && task.submittedAt && (
                    <p className="text-[10px] text-muted-foreground mb-3">
                      Submitted {new Date(task.submittedAt).toLocaleDateString()} — Awaiting review
                    </p>
                  )}

                  {/* Action */}
                  <Button
                    size="sm"
                    disabled={isSubmitted && !isRejected}
                    onClick={() => openSubmitDialog(task)}
                    className={`h-9 px-4 text-xs font-semibold min-w-[100px] ${
                      task.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10'
                        : isSubmitted
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/10 cursor-default'
                          : 'gradient-blue text-alcoin-blue-foreground'
                    }`}
                  >
                    {task.status === 'approved' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    ) : task.status === 'pending' ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Submitted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Send className="w-3.5 h-3.5" />
                        Submit Task
                      </span>
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        {!loading && tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-alcoin-blue">
                  {tasks.filter((t) => !t.status || t.status === 'none').length}
                </p>
                <p className="text-[10px] text-muted-foreground">Available</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-400">
                  {tasks.filter((t) => t.status === 'pending').length}
                </p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-400">
                  {tasks.filter((t) => t.status === 'approved').length}
                </p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Submit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setProofUrl(''); setSubmitError(''); } }}>
        <DialogContent className="glass-strong rounded-xl border-white/10 max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Submit Task</DialogTitle>
            <DialogDescription className="text-sm">
              Follow the instructions carefully and provide proof if required.
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4 mt-2">
              {/* Task Details */}
              <div className="glass rounded-lg p-3 space-y-2">
                <h4 className="font-semibold text-sm">{selectedTask.title}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedTask.instructions}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Badge
                    variant="secondary"
                    className="bg-gold/10 text-gold border-gold/20 text-xs gap-1"
                  >
                    <Coins className="w-3 h-3" />
                    {formatNaira(selectedTask.reward)}
                  </Badge>
                  {selectedTask.requiresProof && (
                    <Badge
                      variant="secondary"
                      className="bg-alcoin-blue/10 text-alcoin-blue border-alcoin-blue/20 text-xs gap-1"
                    >
                      <ImageIcon className="w-3 h-3" />
                      Proof Required
                    </Badge>
                  )}
                </div>
              </div>

              {/* Proof Input */}
              {selectedTask.requiresProof && (
                <div className="space-y-2">
                  <Label htmlFor="proofUrl" className="text-sm text-muted-foreground">
                    Proof of Completion (URL)
                  </Label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="proofUrl"
                      type="url"
                      placeholder="Paste screenshot or proof URL here"
                      value={proofUrl}
                      onChange={(e) => { setProofUrl(e.target.value); setSubmitError(''); }}
                      className="pl-10 bg-white/5 border-white/10 focus:border-alcoin-blue h-11"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Upload your screenshot to any image host and paste the URL here.
                  </p>
                </div>
              )}

              {/* Error */}
              <AnimatePresence>
                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                  >
                    {submitError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              variant="outline"
              className="border-white/10"
              onClick={() => { setDialogOpen(false); setProofUrl(''); setSubmitError(''); }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (selectedTask?.requiresProof && !proofUrl.trim())}
              className="gradient-blue text-alcoin-blue-foreground font-semibold min-w-[110px]"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="w-4 h-4" />
                  Submit
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
