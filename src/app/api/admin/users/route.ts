import { NextRequest, NextResponse } from 'next/server';
import { getDB, mapProfileRow, insertAuditLog } from '@/lib/db';
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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const db = getDB();

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('(full_name LIKE ? OR username LIKE ? OR phone LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status === 'activated') {
      conditions.push('is_activated = 1');
    } else if (status === 'pending') {
      conditions.push('is_activated = 0');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count total
    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM users ${whereClause}`
    ).get(...params) as { count: number };
    const total = countRow?.count || 0;

    // Fetch paginated users
    const rows = db.prepare(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as Array<Record<string, unknown>>;

    const users = rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      email: row.email,
      phone: row.phone,
      role: row.role,
      isActivated: Boolean(row.is_activated),
      activatedAt: row.activated_at,
      referralCode: row.referral_code,
      profilePicture: row.profile_picture,
      bankName: row.bank_name,
      bankAccount: row.bank_account,
      bankAccountName: row.bank_account_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Admin users error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
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

    const { userId, action } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    const db = getDB();

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'activate') {
      db.prepare(
        "UPDATE users SET is_activated = 1, activated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).run(userId);

      insertAuditLog(db, admin.id, 'ADMIN_ACTIVATE_USER', `activate user ${targetUser.username}`);

      const data = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;

      return NextResponse.json({
        user: {
          id: data.id,
          fullName: data.full_name,
          username: data.username,
          phone: data.phone,
          role: data.role,
          isActivated: Boolean(data.is_activated),
          activatedAt: data.activated_at,
          referralCode: data.referral_code,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        message: 'User activated successfully',
      });
    } else if (action === 'suspend') {
      db.prepare(
        "UPDATE users SET is_activated = 0, updated_at = datetime('now') WHERE id = ?"
      ).run(userId);

      insertAuditLog(db, admin.id, 'ADMIN_SUSPEND_USER', `suspend user ${targetUser.username}`);

      const data = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;

      return NextResponse.json({
        user: {
          id: data.id,
          fullName: data.full_name,
          username: data.username,
          phone: data.phone,
          role: data.role,
          isActivated: Boolean(data.is_activated),
          activatedAt: data.activated_at,
          referralCode: data.referral_code,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        message: 'User suspended successfully',
      });
    } else if (action === 'delete') {
      // CASCADE handles related records (wallets, withdrawals, etc.)
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      insertAuditLog(db, admin.id, 'DELETE_USER', `Deleted user ${targetUser.username}`);

      return NextResponse.json({ message: 'User deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use activate, suspend, or delete' },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Admin edit user error:', error);
    const message = error instanceof Error ? error.message : 'Failed to edit user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
