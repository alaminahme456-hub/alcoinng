import { NextRequest, NextResponse } from 'next/server';
import { getDB, ensureWallets } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = getAuthUser(token!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const wallets = ensureWallets(db, auth.id) as Array<Record<string, unknown>>;

    const walletMap: Record<string, { id: string; type: string; balance: number }> = {};
    for (const w of wallets) {
      walletMap[w.type as string] = { id: w.id as string, type: w.type as string, balance: Number(w.balance) };
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
