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

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task || !task.is_active) return NextResponse.json({ error: 'Task not found or inactive' }, { status: 404 });
    if (task.requires_proof && !proof) return NextResponse.json({ error: 'Proof is required for this task' }, { status: 400 });

    // Check existing submission
    const { data: existing } = await supabaseAdmin
      .from('task_submissions')
      .select('id')
      .eq('user_id', auth.id)
      .eq('task_id', taskId)
      .maybeSingle();

    if (existing) return NextResponse.json({ error: 'Already submitted this task' }, { status: 400 });

    const { data: submission, error: subError } = await supabaseAdmin
      .from('task_submissions')
      .insert({ user_id: auth.id, task_id: taskId, proof: proof || null })
      .select()
      .single();

    if (subError) throw new Error(subError.message);

    await insertNotification(auth.id, 'Task Submitted', `Your submission for '${task.title}' is pending review.`, 'task');

    return NextResponse.json({ submission, message: 'Task submitted successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Submit task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}