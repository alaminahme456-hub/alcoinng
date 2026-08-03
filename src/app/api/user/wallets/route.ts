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

    const wallets = await db.wallet.findMany({
      where: { userId: payload.userId },
      orderBy: { type: 'asc' },
    });

    const walletMap: Record<string, { id: string; type: string; balance: number }> = {};
    for (const w of wallets) {
      walletMap[w.type] = { id: w.id, type: w.type, balance: w.balance };
    }

    return NextResponse.json({
      wallets: walletMap,
      reward: walletMap['reward'] || { id: '', type: 'reward', balance: 0 },
      deposit: walletMap['deposit'] || { id: '', type: 'deposit', balance: 0 },
      profit: walletMap['profit'] || { id: '', type: 'profit', balance: 0 },
    });
  } catch (error: unknown) {
    console.error('Fetch wallets error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch wallets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
