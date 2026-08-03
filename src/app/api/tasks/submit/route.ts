import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { taskId, proof } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isActivated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || !task.isActive) {
      return NextResponse.json({ error: 'Task not found or inactive' }, { status: 404 });
    }

    if (task.requiresProof && !proof) {
      return NextResponse.json({ error: 'Proof is required for this task' }, { status: 400 });
    }

    // Check for existing submission
    const existingSubmission = await db.taskSubmission.findFirst({
      where: { userId: user.id, taskId },
    });

    if (existingSubmission) {
      return NextResponse.json({ error: 'Already submitted this task' }, { status: 400 });
    }

    const submission = await db.taskSubmission.create({
      data: {
        userId: user.id,
        taskId,
        proof: proof || null,
      },
    });

    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Task Submitted',
        message: `Your submission for '${task.title}' is pending review.`,
        type: 'task',
      },
    });

    return NextResponse.json({ submission, message: 'Task submitted successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Submit task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
