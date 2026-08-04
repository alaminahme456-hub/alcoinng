import { NextRequest, NextResponse } from 'next/server';
import { getDB, mapProfileRow, insertAuditLog, insertNotification, touchUpdated } from '@/lib/db';
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
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const db = getDB();

    // Build WHERE clause
    let whereClause = '';
    const params: unknown[] = [];

    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      whereClause = 'WHERE w.status = ?';
      params.push(status);
    }

    // Count total matching withdrawals
    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM withdrawals w ${whereClause}`
    ).get(...params) as { count: number };
    const total = countRow?.count || 0;

    // Fetch paginated withdrawals with user info
    const rows = db.prepare(
      `SELECT w.*, u.full_name, u.username, u.phone, u.bank_name, u.bank_account, u.bank_account_name
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       ${whereClause}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as Array<Record<string, unknown>>;

    const withdrawals = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      wallet: row.wallet,
      amount: Number(row.amount),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        fullName: row.full_name,
        username: row.username,
        phone: row.phone,
        bankName: row.bank_name,
        bankAccount: row.bank_account,
        bankAccountName: row.bank_account_name,
      },
    }));

    // Compute pending and paid totals from ALL withdrawals (not just page)
    const pendingRow = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = 'pending'"
    ).get() as { total: number };
    const paidRow = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = 'paid'"
    ).get() as { total: number };

    const pendingTotal = Number(pendingRow?.total || 0);
    const paidTotal = Number(paidRow?.total || 0);

    return NextResponse.json({
      withdrawals,
      pendingTotal,
      paidTotal,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin withdrawals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch withdrawals';
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

    const { withdrawalId, action } = await req.json();
    if (!withdrawalId || !action) {
      return NextResponse.json({ error: 'Withdrawal ID and action are required' }, { status: 400 });
    }

    if (!['approve', 'reject', 'pay'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve, reject, or pay' }, { status: 400 });
    }

    const db = getDB();

    // Fetch the withdrawal with the user username
    const withdrawal = db.prepare(
      `SELECT w.*, u.username
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       WHERE w.id = ?`
    ).get(withdrawalId) as Record<string, unknown> | undefined;

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'approved') {
      return NextResponse.json(
        { error: `Withdrawal is ${withdrawal.status}, cannot ${action}` },
        { status: 400 }
      );
    }

    const username = withdrawal.username || 'unknown';
    const amount = Number(withdrawal.amount);

    if (action === 'approve') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending withdrawals can be approved' }, { status: 400 });
      }

      db.prepare("UPDATE withdrawals SET status = 'approved', updated_at = datetime('now') WHERE id = ?").run(withdrawalId);

      insertNotification(
        db,
        withdrawal.user_id as string,
        'Withdrawal Approved',
        `Your withdrawal of \u20a6${amount.toLocaleString()} has been approved and will be processed shortly.`,
        'withdrawal'
      );
    } else if (action === 'reject') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending withdrawals can be rejected' }, { status: 400 });
      }

      db.prepare("UPDATE withdrawals SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(withdrawalId);

      // Refund to wallet
      const wallet = db.prepare(
        'SELECT id, balance FROM wallets WHERE user_id = ? AND type = ?'
      ).get(withdrawal.user_id, withdrawal.wallet) as { id: string; balance: number } | undefined;

      if (wallet) {
        db.prepare('UPDATE wallets SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
          Number(wallet.balance) + amount,
          wallet.id
        );
      }

      insertNotification(
        db,
        withdrawal.user_id as string,
        'Withdrawal Rejected',
        `Your withdrawal of \u20a6${amount.toLocaleString()} was rejected. The amount has been refunded to your ${withdrawal.wallet} wallet.`,
        'withdrawal'
      );
    } else if (action === 'pay') {
      if (withdrawal.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved withdrawals can be marked as paid' }, { status: 400 });
      }

      db.prepare("UPDATE withdrawals SET status = 'paid', updated_at = datetime('now') WHERE id = ?").run(withdrawalId);

      insertNotification(
        db,
        withdrawal.user_id as string,
        'Withdrawal Paid \u2705',
        `Your withdrawal of \u20a6${amount.toLocaleString()} has been paid to your bank account.`,
        'withdrawal'
      );
    }

    // Audit log
    insertAuditLog(
      db,
      admin.id,
      `WITHDRAWAL_${action.toUpperCase()}`,
      `${action}d withdrawal ${withdrawalId} of \u20a6${amount.toLocaleString()} for ${username}`
    );

    // Fetch updated withdrawal
    const updated = db.prepare(
      `SELECT w.*, u.full_name, u.username, u.phone, u.bank_name, u.bank_account, u.bank_account_name
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       WHERE w.id = ?`
    ).get(withdrawalId) as Record<string, unknown>;

    return NextResponse.json({ withdrawal: updated, message: `Withdrawal ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Admin process withdrawal error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process withdrawal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
