import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog, insertNotification } from '@/lib/db';
import { requireAdmin, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const submissionsFor = searchParams.get('submissionsFor');
    if (submissionsFor) {
      const { data, error } = await supabaseAdmin
        .from('task_submissions')
        .select(`*, profiles!task_submissions_user_id_fkey(full_name, username)`)
        .eq('task_id', submissionsFor)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const submissions = (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        userName: s.profiles?.full_name || s.profiles?.username || 'Unknown',
        proof: s.proof,
        proofUrl: s.proof,
        status: s.status,
        submittedAt: s.created_at,
      }));
      return NextResponse.json({ submissions });
    }

    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    // Fetch paginated tasks
    const { data: tasks, count: totalCount, error } = await supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);

    // Fetch submissions for each task
    const mappedTasks = await Promise.all((tasks || []).map(async (row) => {
      const { data: allSubmissions } = await supabaseAdmin
        .from('task_submissions')
        .select(`*, profiles!task_submissions_user_id_fkey(full_name, username)`)
        .eq('task_id', row.id);

      const { count: totalSubCount } = await supabaseAdmin
        .from('task_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', row.id);

      const pendingSubs = (allSubmissions || [])
        .filter((s) => s.status === 'pending')
        .slice(0, 5);

      return {
        id: row.id,
        title: row.title,
        instructions: row.instructions,
        reward: Number(row.reward),
        requiresProof: Boolean(row.requires_proof),
        isActive: Boolean(row.is_active),
        active: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        _count: { submissions: totalSubCount || 0 },
        submissions: pendingSubs.map((s: any) => ({
          id: s.id,
          userId: s.user_id,
          userName: s.profiles?.full_name || s.profiles?.username || 'Unknown',
          proof: s.proof,
          status: s.status,
          submittedAt: s.created_at,
        })),
      };
    }));

    return NextResponse.json({
      tasks: mappedTasks,
      pagination: { page, limit, total: totalCount || 0, totalPages: Math.ceil((totalCount || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin tasks error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { taskId, title, instructions, reward, requiresProof, isActive } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (instructions !== undefined) updates.instructions = instructions;
    if (reward !== undefined) updates.reward = Number(reward);
    if (requiresProof !== undefined) updates.requires_proof = Boolean(requiresProof);
    if (isActive !== undefined) updates.is_active = Boolean(isActive);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await supabaseAdmin.from('tasks').update(updates).eq('id', taskId);

    const { data: data } = await supabaseAdmin.from('tasks').select('*').eq('id', taskId).single();

    const task = {
      id: data.id,
      title: data.title,
      instructions: data.instructions,
      reward: Number(data.reward),
      requiresProof: Boolean(data.requires_proof),
      isActive: Boolean(data.is_active),
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
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await supabaseAdmin.from('task_submissions').delete().eq('task_id', taskId);
    await supabaseAdmin.from('tasks').delete().eq('id', taskId);

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: unknown) {
    console.error('Admin delete task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const body = await req.json();
    const { submissionId, action, title, instructions, reward, requiresProof = true, isActive = true } = body;

    if (!submissionId && title) {
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .insert({ title, instructions, reward: Number(reward), requires_proof: Boolean(requiresProof), is_active: Boolean(isActive) })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      await insertAuditLog(admin.id, 'CREATE_TASK', `Created task: ${title}`);
      return NextResponse.json({ task: data, message: 'Task created successfully' }, { status: 201 });
    }

    if (!submissionId || !action) {
      return NextResponse.json({ error: 'Submission ID and action are required' }, { status: 400 });
    }
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    // Fetch submission with task info
    const { data: submission, error: subError } = await supabaseAdmin
      .from('task_submissions')
      .select(`*, tasks!task_submissions_task_id_fkey(title, reward), profiles!task_submissions_user_id_fkey(username)`)
      .eq('id', submissionId)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const taskTitle = submission.tasks.title;
    const taskReward = Number(submission.tasks.reward);

    await supabaseAdmin.from('task_submissions').update({ status: newStatus }).eq('id', submissionId);

    if (action === 'approve') {
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', submission.user_id)
        .eq('type', 'reward')
        .single();

      if (wallet) {
        await supabaseAdmin.from('wallets').update({
          balance: Number(wallet.balance) + taskReward,
        }).eq('id', wallet.id);
      }

      await insertNotification(
        submission.user_id,
        'Task Approved!',
        `Your submission for '${taskTitle}' was approved. ₦${taskReward.toLocaleString()} has been credited.`,
        'task'
      );
    } else {
      await insertNotification(
        submission.user_id,
        'Task Rejected',
        `Your submission for '${taskTitle}' was rejected.`,
        'task'
      );
    }

    await insertAuditLog(
      admin.id,
      `TASK_${action.toUpperCase()}`,
      `${action}d task submission ${submissionId} for task '${taskTitle}'`
    );

    return NextResponse.json({ message: `Submission ${newStatus}` });
  } catch (error: unknown) {
    console.error('Admin approve/reject task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}