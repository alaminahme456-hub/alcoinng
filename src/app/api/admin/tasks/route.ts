import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthAdmin } from '@/lib/supabase/helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    // Fetch tasks with all submissions (joined with profiles) so we can count and filter in JS
    const { data: tasks, count, error } = await supabaseAdmin
      .from('tasks')
      .select(
        `*,
        task_submissions(
          id,
          user_id,
          proof,
          proof_url,
          status,
          created_at,
          profiles!task_submissions_user_id_fkey(full_name, username)
        )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;
    const total = count || 0;

    // Map to match old Prisma shape
    const mappedTasks = (tasks || []).map((row: Record<string, unknown>) => {
      const allSubmissions = row.task_submissions as Array<Record<string, unknown>> || [];

      // Filter to pending submissions only, take first 5
      const pendingSubs = allSubmissions
        .filter((s) => s.status === 'pending')
        .slice(0, 5);

      return {
        id: row.id,
        title: row.title,
        instructions: row.instructions,
        reward: Number(row.reward),
        requiresProof: row.requires_proof,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        _count: {
          submissions: allSubmissions.length,
        },
        submissions: pendingSubs.map((s: Record<string, unknown>) => {
          const profile = s.profiles as Record<string, unknown> | null;
          return {
            id: s.id,
            userId: s.user_id,
            userName: profile?.full_name || profile?.username || 'Unknown',
            proof: s.proof,
            proofUrl: s.proof_url,
            status: s.status,
            submittedAt: s.created_at,
          };
        }),
      };
    });

    return NextResponse.json({
      tasks: mappedTasks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin tasks error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { taskId, title, instructions, reward, requiresProof, isActive } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (reward !== undefined) updateData.reward = Number(reward);
    if (requiresProof !== undefined) updateData.requires_proof = Boolean(requiresProof);
    if (isActive !== undefined) updateData.is_active = Boolean(isActive);

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    const task = {
      id: data.id,
      title: data.title,
      instructions: data.instructions,
      reward: Number(data.reward),
      requiresProof: data.requires_proof,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ task, message: 'Task updated successfully' });
  } catch (error: unknown) {
    console.error('Admin edit task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Delete submissions first, then the task
    const { error: subError } = await supabaseAdmin
      .from('task_submissions')
      .delete()
      .eq('task_id', taskId);

    if (subError) throw subError;

    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: unknown) {
    console.error('Admin delete task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { submissionId, action } = await req.json();
    if (!submissionId || !action) {
      return NextResponse.json({ error: 'Submission ID and action are required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    // Fetch submission with task and user profile
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('task_submissions')
      .select('*, tasks(title, reward), profiles(username)')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const task = submission.tasks as Record<string, unknown>;
    const profile = submission.profiles as Record<string, unknown> | null;

    const { error: updateError } = await supabaseAdmin
      .from('task_submissions')
      .update({ status: newStatus })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    if (action === 'approve') {
      // Credit reward wallet
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('id, balance')
        .eq('user_id', submission.user_id)
        .eq('type', 'reward')
        .single();

      if (wallet) {
        await supabaseAdmin
          .from('wallets')
          .update({ balance: Number(wallet.balance) + Number(task.reward) })
          .eq('id', wallet.id);
      }

      await supabaseAdmin.from('notifications').insert({
        user_id: submission.user_id,
        title: 'Task Approved! 🎉',
        message: `Your submission for '${task.title}' was approved. ₦${Number(task.reward).toLocaleString()} has been credited.`,
        type: 'task',
      });
    } else {
      await supabaseAdmin.from('notifications').insert({
        user_id: submission.user_id,
        title: 'Task Rejected',
        message: `Your submission for '${task.title}' was rejected.`,
        type: 'task',
      });
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: `TASK_${action.toUpperCase()}`,
      details: `${action}d task submission ${submissionId} for task '${task.title}'`,
    });

    return NextResponse.json({ message: `Submission ${newStatus}` });
  } catch (error: unknown) {
    console.error('Admin approve/reject task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
