import { NextRequest, NextResponse } from 'next/server';
import { getDB, insertAuditLog, insertNotification } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(getToken(req)!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { wallet, amount } = await req.json();
    if (!wallet || !amount) return NextResponse.json({ error: 'Wallet type and amount are required' }, { status: 400 });
    if (!['reward', 'deposit', 'profit'].includes(wallet)) return NextResponse.json({ error: 'Invalid wallet type' }, { status: 400 });

    const numAmount = Number(amount);
    if (numAmount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    if (!auth.profile.isActivated) return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    if (!auth.profile.bankName || !auth.profile.bankAccount || !auth.profile.bankAccountName) {
      return NextResponse.json({ error: 'Please update your bank details before withdrawing' }, { status: 400 });
    }

    const db = getDB();

    // Check minimum amounts for reward wallet
    if (wallet === 'reward') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const weekRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND wallet = ? AND created_at >= ? AND status IN (?, ?, ?)').get(auth.id, 'reward', oneWeekAgo, 'pending', 'approved', 'paid') as { total: number };

      if (weekRow.total === 0 && numAmount < 2000) {
        return NextResponse.json({ error: 'Minimum weekly withdrawal for reward wallet is \u20a62,000' }, { status: 400 });
      }

      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const monthRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND wallet = ? AND created_at >= ? AND status IN (?, ?, ?)').get(auth.id, 'reward', oneMonthAgo, 'pending', 'approved', 'paid') as { total: number };

      if (monthRow.total === 0 && numAmount < 8000) {
        return NextResponse.json({ error: 'Minimum monthly withdrawal for reward wallet is \u20a68,000' }, { status: 400 });
      }
    }

    // Check wallet balance
    const walletRow = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(auth.id, wallet) as Record<string, unknown> | undefined;
    if (!walletRow || Number(walletRow.balance) < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    db.prepare('INSERT INTO withdrawals (id, user_id, wallet, amount) VALUES (?, ?, ?, ?)').run(id, auth.id, wallet, numAmount);
    insertNotification(db, auth.id, 'Withdrawal Requested', `Your withdrawal of \u20a6${numAmount.toLocaleString()} from ${wallet} wallet is pending review.`, 'withdrawal');
    insertAuditLog(db, auth.id, 'WITHDRAWAL_REQUEST', `Requested \u20a6${numAmount.toLocaleString()} from ${wallet} wallet`);

    const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id);
    return NextResponse.json({ withdrawal, message: 'Withdrawal request submitted' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Withdraw error:', error);
    const message = error instanceof Error ? error.message : 'Withdrawal failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(getToken(req)!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const db = getDB();

    let where = 'user_id = ?';
    const params: unknown[] = [auth.id];

    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      where += ' AND status = ?';
      params.push(status);
    }

    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM withdrawals WHERE ${where}`).get(...params) as { count: number };
    const withdrawals = db.prepare(`SELECT * FROM withdrawals WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    return NextResponse.json({
      withdrawals: withdrawals || [],
      pagination: { page, limit, total: totalRow?.count || 0, totalPages: Math.ceil((totalRow?.count || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Fetch withdrawals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch withdrawals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
