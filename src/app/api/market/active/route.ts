import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

/**
 * GET /api/market/active
 * Fetch the user's active trade. If it's expired, auto-settle it.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { data: trade, error } = await supabaseAdmin
      .from('trades')
      .select('*')
      .eq('user_id', auth.id)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!trade) {
      return NextResponse.json({ trade: null, serverTime: new Date().toISOString() });
    }

    const now = new Date();
    const expiresAt = new Date(trade.expires_at);

    // If trade has expired, auto-settle it
    if (now >= expiresAt) {
      const settleRes = await fetch(`${new URL(req.url).origin}/api/market/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': req.headers.get('cookie') || '' },
        body: JSON.stringify({ tradeId: trade.id }),
      });
      const settleData = await settleRes.json();

      return NextResponse.json({
        trade: settleData.trade || null,
        settled: true,
        serverTime: now.toISOString(),
      });
    }

    // Trade is still active — return with time remaining
    const remainingMs = expiresAt.getTime() - now.getTime();

    return NextResponse.json({
      trade: {
        id: trade.id,
        prediction: trade.prediction,
        amount: Number(trade.amount),
        payoutMultiplier: Number(trade.payout_multiplier),
        duration: trade.duration,
        entryPrice: Number(trade.entry_price ?? trade.start_price),
        startedAt: trade.started_at,
        expiresAt: trade.expires_at,
        status: trade.status,
        fundingWallet: trade.funding_wallet,
        remainingMs,
      },
      settled: false,
      serverTime: now.toISOString(),
    });
  } catch (error: unknown) {
    console.error('Active trade error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch active trade';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
