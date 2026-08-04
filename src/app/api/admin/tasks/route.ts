import { NextRequest, NextResponse } from 'next/server';
import { getDB, insertAuditLog, insertNotification, touchUpdated, intBool } from '@/lib/db';
import { getAuthAdmin } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const admin = getAuthAdmin(token || '');
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const db = getDB();

    // Count total tasks
    const countRow = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
    const total = countRow?.count || 0;

    // Fetch paginated tasks
    const tasks = db
      .prepare(`SELECT * FROM tasks ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(limit, offset) as Array<Record<string, unknown>>;

    // Prepare statement for fetching submissions per task
    const submissionsStmt = db.prepare(
      `SELECT ts.*, u.full_name, u.username
       FROM task_submissions ts
       JOIN users u ON ts.user_id = u.id
       WHERE ts.task_id = ?`
    );

    const countSubsStmt = db.prepare(
      'SELECT COUNT(*) as count FROM task_submissions WHERE task_id = ?'
    );

    const mappedTasks = tasks.map((row) => {
      const allSubmissions = submissionsStmt.all(row.id) as Array<Record<string, unknown>>;

      // Filter to pending submissions, take first 5
      const pendingSubs = allSubmissions
        .filter((s) => s.status === 'pending')
        .slice(0, 5);

      const totalSubCount = (countSubsStmt.get(row.id) as { count: number })?.count || 0;

      return {
        id: row.id,
        title: row.title,
        instructions: row.instructions,
        reward: Number(row.reward),
        requiresProof: Boolean(row.requires_proof),
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        _count: {
          submissions: totalSubCount,
        },
        submissions: pendingSubs.map((s) => ({
          id: s.id,
          userId: s.user_id,
          userName: s.full_name || s.username || 'Unknown',
          proof: s.proof,
          status: s.status,
          submittedAt: s.created_at,
        })),
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
    const token = getToken(req);
    const admin = getAuthAdmin(token || '');
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { taskId, title, instructions, reward, requiresProof, isActive } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const db = getDB();

    // Build SET clause dynamically
    const setParts: string[] = [];
    const params: unknown[] = [];

    if (title !== undefined) {
      setParts.push('title = ?');
      params.push(title);
    }
    if (instructions !== undefined) {
      setParts.push('instructions = ?');
      params.push(instructions);
    }
    if (reward !== undefined) {
      setParts.push('reward = ?');
      params.push(Number(reward));
    }
    if (requiresProof !== undefined) {
      setParts.push('requires_proof = ?');
      params.push(intBool(Boolean(requiresProof)));
    }
    if (isActive !== undefined) {
      setParts.push('is_active = ?');
      params.push(intBool(Boolean(isActive)));
    }

    if (setParts.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(taskId);
    db.prepare(`UPDATE tasks SET ${setParts.join(', ')} WHERE id = ?`).run(...params);
    touchUpdated(db, 'tasks', taskId);

    const data = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Record<string, unknown>;

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
    const token = getToken(req);
    const admin = getAuthAdmin(token || '');
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const db = getDB();

    // Delete submissions first, then the task
    db.prepare('DELETE FROM task_submissions WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: unknown) {
    console.error('Admin delete task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const admin = getAuthAdmin(token || '');
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { submissionId, action } = await req.json();
    if (!submissionId || !action) {
      return NextResponse.json({ error: 'Submission ID and action are required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    const db = getDB();

    // Fetch submission with task and user info
    const submission = db
      .prepare(
        `SELECT ts.*, t.title as task_title, t.reward as task_reward, u.username
         FROM task_submissions ts
         JOIN tasks t ON ts.task_id = t.id
         JOIN users u ON ts.user_id = u.id
         WHERE ts.id = ?`
      )
      .get(submissionId) as Record<string, unknown> | undefined;

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const taskTitle = submission.task_title as string;
    const taskReward = Number(submission.task_reward);

    db.prepare("UPDATE task_submissions SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      newStatus,
      submissionId
    );

    if (action === 'approve') {
      // Credit reward wallet
      const wallet = db
        .prepare('SELECT id, balance FROM wallets WHERE user_id = ? AND type = ?')
        .get(submission.user_id, 'reward') as Record<string, unknown> | undefined;

      if (wallet) {
        const newBalance = Number(wallet.balance) + taskReward;
        db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBalance, wallet.id);
      }

      insertNotification(
        db,
        submission.user_id as string,
        'Task Approved! 🎉',
        `Your submission for '${taskTitle}' was approved. ₦${taskReward.toLocaleString()} has been credited.`,
        'task'
      );
    } else {
      insertNotification(
        db,
        submission.user_id as string,
        'Task Rejected',
        `Your submission for '${taskTitle}' was rejected.`,
        'task'
      );
    }

    // Audit log
    insertAuditLog(
      db,
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
