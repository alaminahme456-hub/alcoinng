import { NextRequest, NextResponse } from 'next/server';
import { getDB, touchUpdated, intBool, insertAuditLog } from '@/lib/db';
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

    // Count total
    const countRow = db.prepare('SELECT COUNT(*) as count FROM ads').get() as { count: number };
    const total = countRow?.count || 0;

    // Fetch paginated ads
    const rows = db.prepare(
      'SELECT * FROM ads ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as Array<Record<string, unknown>>;

    const viewCountStmt = db.prepare('SELECT COUNT(*) as cnt FROM ad_views WHERE ad_id = ?');

    const ads = rows.map((row) => {
      const viewRow = viewCountStmt.get(row.id) as { cnt: number } | undefined;
      return {
        id: row.id,
        title: row.title,
        thumbnail: row.thumbnail,
        duration: Number(row.duration),
        reward: Number(row.reward),
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        _count: {
          views: viewRow?.cnt || 0,
        },
      };
    });

    return NextResponse.json({
      ads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin ads error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch ads';
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

    const { adId, title, thumbnail, duration, reward, isActive } = await req.json();
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    const db = getDB();

    const existing = db.prepare('SELECT id FROM ads WHERE id = ?').get(adId);
    if (!existing) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    // Build SET clause dynamically for partial update
    const setParts: string[] = [];
    const params: unknown[] = [];

    if (title !== undefined) { setParts.push('title = ?'); params.push(title); }
    if (thumbnail !== undefined) { setParts.push('thumbnail = ?'); params.push(thumbnail); }
    if (duration !== undefined) { setParts.push('duration = ?'); params.push(Number(duration)); }
    if (reward !== undefined) { setParts.push('reward = ?'); params.push(Number(reward)); }
    if (isActive !== undefined) { setParts.push('is_active = ?'); params.push(intBool(Boolean(isActive))); }

    if (setParts.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    setParts.push("updated_at = datetime('now')");
    params.push(adId);

    db.prepare(
      `UPDATE ads SET ${setParts.join(', ')} WHERE id = ?`
    ).run(...params);

    const data = db.prepare('SELECT * FROM ads WHERE id = ?').get(adId) as Record<string, unknown>;

    const ad = {
      id: data.id,
      title: data.title,
      thumbnail: data.thumbnail,
      duration: Number(data.duration),
      reward: Number(data.reward),
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ ad, message: 'Ad updated successfully' });
  } catch (error: unknown) {
    console.error('Admin edit ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update ad';
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
    const adId = searchParams.get('adId');
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    const db = getDB();

    // Delete ad views first, then the ad
    db.prepare('DELETE FROM ad_views WHERE ad_id = ?').run(adId);
    db.prepare('DELETE FROM ads WHERE id = ?').run(adId);

    insertAuditLog(db, admin.id, 'DELETE_AD', `Deleted ad ${adId}`);

    return NextResponse.json({ message: 'Ad deleted successfully' });
  } catch (error: unknown) {
    console.error('Admin delete ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete ad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
