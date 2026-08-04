import { NextRequest, NextResponse } from 'next/server';
import { ensureWallets } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const wallets = await ensureWallets(auth.id);

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
