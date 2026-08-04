import { NextRequest, NextResponse } from 'next/server';
import { getDB, insertAuditLog, touchUpdated } from '@/lib/db';
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

    const countRow = db.prepare('SELECT COUNT(*) as count FROM announcements').get() as {
      count: number;
    };
    const total = countRow?.count || 0;

    const rows = db
      .prepare(
        `SELECT * FROM announcements ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(limit, offset) as Array<Record<string, unknown>>;

    const announcements = rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      announcements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin announcements error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch announcements';
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

    const { title, message } = await req.json();
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const db = getDB();
    const id = crypto.randomUUID();

    db.prepare(
      'INSERT INTO announcements (id, title, message, is_active) VALUES (?, ?, ?, 1)'
    ).run(id, title, message);

    insertAuditLog(db, admin.id, 'CREATE_ANNOUNCEMENT', `Created announcement: ${title}`);

    const data = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;

    const announcement = {
      id: data.id,
      title: data.title,
      message: data.message,
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ announcement, message: 'Announcement created' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create announcement';
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

    const { announcementId } = await req.json();
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const db = getDB();

    const existing = db
      .prepare('SELECT * FROM announcements WHERE id = ?')
      .get(announcementId) as Record<string, unknown> | undefined;

    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Toggle is_active: flip 0 ↔ 1
    const newActive = existing.is_active ? 0 : 1;

    db.prepare('UPDATE announcements SET is_active = ? WHERE id = ?').run(newActive, announcementId);
    touchUpdated(db, 'announcements', announcementId);

    const data = db
      .prepare('SELECT * FROM announcements WHERE id = ?')
      .get(announcementId) as Record<string, unknown>;

    const announcement = {
      id: data.id,
      title: data.title,
      message: data.message,
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({
      announcement,
      message: `Announcement ${data.is_active ? 'activated' : 'deactivated'}`,
    });
  } catch (error: unknown) {
    console.error('Toggle announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle announcement';
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
    const announcementId = searchParams.get('announcementId');
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const db = getDB();

    db.prepare('DELETE FROM announcements WHERE id = ?').run(announcementId);

    insertAuditLog(db, admin.id, 'DELETE_ANNOUNCEMENT', `Deleted announcement ${announcementId}`);

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
