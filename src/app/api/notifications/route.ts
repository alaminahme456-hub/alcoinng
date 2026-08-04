import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(getToken(req)!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const db = getDB();

    const totalRow = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?').get(auth.id) as { count: number };
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(auth.id, limit, offset);
    const unreadRow = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(auth.id) as { count: number };

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadRow?.count || 0,
      pagination: { page, limit, total: totalRow?.count || 0, totalPages: Math.ceil((totalRow?.count || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Fetch notifications error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(getToken(req)!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { notificationId } = await req.json();
    if (!notificationId) return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });

    const db = getDB();
    const notif = db.prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?').get(notificationId, auth.id);
    if (!notif) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error: unknown) {
    console.error('Mark notification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to mark notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}