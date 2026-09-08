import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export const maxDuration = 30;

/**
 * Server-side price generator — deterministic seed from timestamp
 * so frontend and backend can generate the same sequence.
 */
function generateServerPrice(seed: number): number {
  // Simple deterministic price from seed
  const base = 80;
  const wave = Math.sin(seed / 1000) * 5;
  const noise = Math.sin(seed * 7.13) * 2 + Math.cos(seed * 3.71) * 1.5;
  return Math.max(10, Math.min(200, base + wave + noise));
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { wallet, prediction, amount, duration } = await req.json();
    if (!wallet || !prediction || !amount || !duration) {
      return NextResponse.json({ error: 'Wallet, prediction, amount, and duration are required' }, { status: 400 });
    }
    if (!['reward', 'deposit', 'profit'].includes(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet type' }, { status: 400 });
    }
    if (!['buy', 'sell'].includes(prediction)) {
      return NextResponse.json({ error: 'Prediction must be buy or sell' }, { status: 400 });
    }

    const numAmount = Number(amount);
    const numDuration = Number(duration);
    if (numAmount <= 0 || numDuration <= 0) {
      return NextResponse.json({ error: 'Amount and duration must be positive' }, { status: 400 });
    }
    if (![10, 30, 60, 120, 300, 600].includes(numDuration)) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }
    if (!auth.profile.isActivated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    // Check for existing active trade (one at a time)
    const { data: existingActive } = await supabaseAdmin
      .from('trades')
      .select('id')
      .eq('user_id', auth.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingActive) {
      return NextResponse.json({ error: 'You already have an active trade' }, { status: 409 });
    }

    // Check wallet balance
    const { data: fundWallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.id)
      .eq('type', wallet)
      .single();

    if (!fundWallet || Number(fundWallet.balance) < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Deduct investment from wallet immediately
    const newBalance = Number(fundWallet.balance) - numAmount;
    await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('id', fundWallet.id);

    // Calculate exact timestamps — server time is truth
    const now = new Date();
    const startedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + numDuration * 1000).toISOString();

    // Entry price — server-generated, deterministic from current time
    const seed = now.getTime();
    const entryPrice = Math.round(generateServerPrice(seed) * 10000) / 10000;

    // Generate hidden multiplier (1.10x to 1.50x) — stored for settlement
    const payoutMultiplier = Math.round((Math.floor(Math.random() * 4100 + 11000) / 10000) * 100) / 100;
    const clampedMultiplier = Math.min(1.50, Math.max(1.10, payoutMultiplier));

    // Create trade as ACTIVE — not settled yet
    const { data: trade, error: tradeErr } = await supabaseAdmin.from('trades').insert({
      user_id: auth.id,
      funding_wallet: wallet,
      prediction,
      amount: numAmount,
      payout_multiplier: clampedMultiplier,
      duration: numDuration,
      entry_price: entryPrice,
      start_price: entryPrice,
      started_at: startedAt,
      expires_at: expiresAt,
      status: 'active',
      result: null,
      profit: null,
    }).select().single();

    if (tradeErr) {
      console.error('Trade insert error:', tradeErr);
      // Refund the deducted amount since trade record failed
      await supabaseAdmin.from('wallets').update({ balance: newBalance + numAmount }).eq('id', fundWallet.id);
      throw new Error('Failed to create trade record');
    }

    if (!trade) throw new Error('Failed to create trade');

    await insertAuditLog(
      auth.id,
      'TRADE_OPENED',
      `${prediction.toUpperCase()} ₦${numAmount.toLocaleString()} for ${numDuration}s, entry: ${entryPrice}, expires: ${expiresAt}`,
    );

    // Fetch updated wallets
    const { data: updatedWallets } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id);

    return NextResponse.json({
      trade: {
        id: trade.id,
        prediction: trade.prediction,
        amount: Number(trade.amount),
        payoutMultiplier: Number(trade.payout_multiplier),
        duration: trade.duration,
        entryPrice: Number(trade.entry_price),
        startedAt: trade.started_at,
        expiresAt: trade.expires_at,
        status: trade.status,
        fundingWallet: trade.funding_wallet,
      },
      wallets: updatedWallets,
      serverTime: now.toISOString(),
      message: 'Trade opened',
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Trade error:', error);
    const message = error instanceof Error ? error.message : 'Trade failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
