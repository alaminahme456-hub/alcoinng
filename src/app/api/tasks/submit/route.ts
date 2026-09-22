import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertNotification } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { taskId, proof } = await req.json();
    if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    if (!auth.profile.isActivated) return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });

    const { data: task, error: taskError } = await supabaseAdmin.from('tasks').select('*').eq('id', taskId).single();
    if (taskError || !task || !task.is_active) return NextResponse.json({ error: 'Task not found or inactive' }, { status: 404 });
    if (task.requires_proof && !proof) return NextResponse.json({ error: 'Proof is required for this task' }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from('task_submissions').select('id, status').eq('user_id', auth.id).eq('task_id', taskId).maybeSingle();
    if (existing) return NextResponse.json({ error: 'You have already completed this task.' }, { status: 400 });

    const { data: submission, error: subError } = await supabaseAdmin.from('task_submissions').insert({
      user_id: auth.id, task_id: taskId, proof: proof || null, status: task.auto_approve ? 'approved' : 'pending',
    }).select().single();

    if (subError) {
      if (subError.code === '23505') return NextResponse.json({ error: 'You have already completed this task.' }, { status: 400 });
      throw new Error(subError.message);
    }

    // Auto-reward tasks are used for one-time ALCOIN community actions such as WhatsApp group/channel joins.
    // WhatsApp membership cannot be independently verified here without a WhatsApp membership API, so the claim is one-time per account.
    if (task.auto_approve) {
      const { data: wallet } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', 'reward').single();
      if (!wallet) {
        await supabaseAdmin.from('task_submissions').update({ status: 'pending' }).eq('id', submission.id);
        return NextResponse.json({ error: 'Reward wallet not found. Please try again.' }, { status: 500 });
      }

      const newBalance = Number(wallet.balance) + Number(task.reward);
      const { error: walletError } = await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);
      if (walletError) {
        await supabaseAdmin.from('task_submissions').update({ status: 'pending' }).eq('id', submission.id);
        throw new Error(walletError.message);
      }

      await insertNotification(auth.id, 'Task Reward Credited!', 'You earned ₦' + Number(task.reward).toLocaleString() + ' for completing \' ' + task.title + '\'.', 'task');
      return NextResponse.json({
        submission,
        message: '₦' + Number(task.reward).toLocaleString() + ' has been credited to your Reward Wallet.',
        autoRewarded: true,
      }, { status: 201 });
    }

    await insertNotification(auth.id, 'Task Submitted', 'Your submission for \' ' + task.title + '\' is pending review.', 'task');
    return NextResponse.json({ submission, message: 'Task submitted successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Submit task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}