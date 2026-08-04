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
    const wallet = searchParams.get('wallet');
    const result = searchParams.get('result');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['user_id = ?'];
    const params: unknown[] = [auth.id];

    if (wallet && ['reward', 'deposit', 'profit'].includes(wallet)) {
      conditions.push('funding_wallet = ?');
      params.push(wallet);
    }
    if (result && ['win', 'loss'].includes(result)) {
      conditions.push('result = ?');
      params.push(result);
    }
    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(new Date(startDate).toISOString());
    }
    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(new Date(endDate).toISOString());
    }

    const where = conditions.join(' AND ');
    const db = getDB();

    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM trades WHERE ${where}`).get(...params) as { count: number };
    const total = totalRow?.count || 0;

    const trades = db.prepare(`SELECT * FROM trades WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    const winsRow = db.prepare('SELECT COUNT(*) as count FROM trades WHERE user_id = ? AND result = ?').get(auth.id, 'win') as { count: number };
    const lossesRow = db.prepare('SELECT COUNT(*) as count FROM trades WHERE user_id = ? AND result = ?').get(auth.id, 'loss') as { count: number };

    return NextResponse.json({
      trades: trades || [],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: { wins: winsRow?.count || 0, losses: lossesRow?.count || 0, totalTrades: (winsRow?.count || 0) + (lossesRow?.count || 0) },
    });
  } catch (error: unknown) {
    console.error('Trade history error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch trade history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
