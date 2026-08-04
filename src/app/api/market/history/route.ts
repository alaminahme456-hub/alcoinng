import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const result = searchParams.get('result');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('trades')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (wallet && ['reward', 'deposit', 'profit'].includes(wallet)) {
      query = query.eq('funding_wallet', wallet);
    }
    if (result && ['win', 'loss'].includes(result)) {
      query = query.eq('result', result);
    }
    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', new Date(endDate).toISOString());
    }

    const { data: trades, count, error } = await query;
    if (error) throw new Error(error.message);

    // Stats
    const { count: wins } = await supabaseAdmin
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', auth.id)
      .eq('result', 'win');

    const { count: losses } = await supabaseAdmin
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', auth.id)
      .eq('result', 'loss');

    return NextResponse.json({
      trades: trades || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
      stats: { wins: wins || 0, losses: losses || 0, totalTrades: (wins || 0) + (losses || 0) },
    });
  } catch (error: unknown) {
    console.error('Trade history error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch trade history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}