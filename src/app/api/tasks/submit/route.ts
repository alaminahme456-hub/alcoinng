import { NextRequest, NextResponse } from 'next/server';
import { getDB, insertNotification } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(getToken(req)!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, proof } = await req.json();
    if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    if (!auth.profile.isActivated) return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });

    const db = getDB();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Record<string, unknown> | undefined;
    if (!task || !Boolean(task.is_active)) return NextResponse.json({ error: 'Task not found or inactive' }, { status: 404 });
    if (Boolean(task.requires_proof) && !proof) return NextResponse.json({ error: 'Proof is required for this task' }, { status: 400 });

    const existing = db.prepare('SELECT id FROM task_submissions WHERE user_id = ? AND task_id = ?').get(auth.id, taskId);
    if (existing) return NextResponse.json({ error: 'Already submitted this task' }, { status: 400 });

    const id = crypto.randomUUID();
    db.prepare('INSERT INTO task_submissions (id, user_id, task_id, proof) VALUES (?, ?, ?, ?)').run(id, auth.id, taskId, proof || null);
    insertNotification(db, auth.id, 'Task Submitted', `Your submission for '${task.title}' is pending review.`, 'task');

    const submission = db.prepare('SELECT * FROM task_submissions WHERE id = ?').get(id);
    return NextResponse.json({ submission, message: 'Task submitted successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Submit task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
