import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        include: {
          _count: { select: { submissions: true } },
          submissions: {
            where: { status: 'pending' },
            take: 5,
            include: {
              user: {
                select: { id: true, fullName: true, username: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.task.count(),
    ]);

    return NextResponse.json({
      tasks,
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
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
    if (requiresProof !== undefined) updateData.requiresProof = Boolean(requiresProof);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const task = await db.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({ task, message: 'Task updated successfully' });
  } catch (error: unknown) {
    console.error('Admin edit task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await db.taskSubmission.deleteMany({ where: { taskId } });
    await db.task.delete({ where: { id: taskId } });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: unknown) {
    console.error('Admin delete task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { submissionId, action } = await req.json();
    if (!submissionId || !action) {
      return NextResponse.json({ error: 'Submission ID and action are required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    const submission = await db.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { task: true, user: true },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await db.taskSubmission.update({
      where: { id: submissionId },
      data: { status: newStatus },
    });

    if (action === 'approve') {
      // Credit reward wallet
      await db.wallet.update({
        where: { userId_type: { userId: submission.userId, type: 'reward' } },
        data: { balance: { increment: submission.task.reward } },
      });

      await db.notification.create({
        data: {
          userId: submission.userId,
          title: 'Task Approved! 🎉',
          message: `Your submission for '${submission.task.title}' was approved. ₦${submission.task.reward.toLocaleString()} has been credited.`,
          type: 'task',
        },
      });
    } else {
      await db.notification.create({
        data: {
          userId: submission.userId,
          title: 'Task Rejected',
          message: `Your submission for '${submission.task.title}' was rejected.`,
          type: 'task',
        },
      });
    }

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: `TASK_${action.toUpperCase()}`,
        details: `${action}d task submission ${submissionId} for task '${submission.task.title}'`,
      },
    });

    return NextResponse.json({ message: `Submission ${newStatus}` });
  } catch (error: unknown) {
    console.error('Admin approve/reject task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
