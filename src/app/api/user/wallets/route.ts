import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.user.id);

    const walletMap: Record<string, { id: string; type: string; balance: number }> = {};
    for (const w of (wallets || [])) {
      walletMap[w.type] = { id: w.id, type: w.type, balance: Number(w.balance) };
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
