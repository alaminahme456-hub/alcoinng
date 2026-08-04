import { NextRequest, NextResponse } from 'next/server';
import { getDB, insertAuditLog, insertNotification } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = getAuthUser(token!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Deposit code is required' }, { status: 400 });
    }

    if (!auth.profile.isActivated) {
      return NextResponse.json({ error: 'Account must be activated before depositing' }, { status: 403 });
    }

    const db = getDB();

    const depositCode = db.prepare('SELECT * FROM deposit_codes WHERE code = ? AND status = ?').get(code.toUpperCase(), 'unused') as Record<string, unknown> | undefined;

    if (!depositCode) {
      return NextResponse.json({ error: 'Invalid deposit code' }, { status: 404 });
    }

    const now = new Date().toISOString();

    db.transaction(() => {
      // Mark code as used
      db.prepare('UPDATE deposit_codes SET status = ?, redeemed_by = ?, redeemed_at = ? WHERE id = ?').run('used', auth.id, now, depositCode.id);

      // Credit deposit wallet
      const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(auth.id, 'deposit') as Record<string, unknown> | undefined;
      if (!wallet) throw new Error('Deposit wallet not found');

      const newBalance = Number(wallet.balance) + Number(depositCode.amount);
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBalance, wallet.id);

      insertNotification(db, auth.id, 'Deposit Successful', `\u20a6${Number(depositCode.amount).toLocaleString()} has been credited to your deposit wallet.`, 'deposit');
      insertAuditLog(db, auth.id, 'DEPOSIT', `Deposited \u20a6${Number(depositCode.amount).toLocaleString()} with code ${depositCode.code}`);
    })();

    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(auth.id, 'deposit') as Record<string, unknown>;
    const newBalance = Number(wallet.balance);

    return NextResponse.json({
      message: 'Deposit successful',
      amount: Number(depositCode.amount),
      newBalance,
    });
  } catch (error: unknown) {
    console.error('Deposit error:', error);
    const message = error instanceof Error ? error.message : 'Deposit failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
