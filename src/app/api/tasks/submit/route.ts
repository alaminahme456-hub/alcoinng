import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, proof } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (!auth.profile.is_activated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    if (!task || !task.is_active) {
      return NextResponse.json({ error: 'Task not found or inactive' }, { status: 404 });
    }

    if (task.requires_proof && !proof) {
      return NextResponse.json({ error: 'Proof is required for this task' }, { status: 400 });
    }

    // Check for existing submission
    const { data: existingSubmission } = await supabaseAdmin
      .from('task_submissions')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('task_id', taskId)
      .single();

    if (existingSubmission) {
      return NextResponse.json({ error: 'Already submitted this task' }, { status: 400 });
    }

    const { data: submission } = await supabaseAdmin
      .from('task_submissions')
      .insert({
        user_id: auth.user.id,
        task_id: taskId,
        proof: proof || null,
      })
      .select()
      .single();

    await supabaseAdmin.from('notifications').insert({
      user_id: auth.user.id,
      title: 'Task Submitted',
      message: `Your submission for '${task.title}' is pending review.`,
      type: 'task',
    });

    return NextResponse.json({ submission, message: 'Task submitted successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Submit task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
