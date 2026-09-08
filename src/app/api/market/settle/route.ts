import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog, insertNotification } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

/**
 * Server-side deterministic price from seed.
 * Must match the generator in /api/market/trade/route.ts
 */
function generateServerPrice(seed: number): number {
  const base = 80;
  const wave = Math.sin(seed / 1000) * 5;
  const noise = Math.sin(seed * 7.13) * 2 + Math.cos(seed * 3.71) * 1.5;
  return Math.max(10, Math.min(200, base + wave + noise));
}

/**
 * POST /api/market/settle
 * Atomically settle an active trade. Double-settle protection via status check.
 *
 * Body: { tradeId: string }
 *
 * Settlement logic:
 * 1. Read trade WHERE status = 'active' (if not active, skip = double-settle protection)
 * 2. Generate exit price from server time seed
 * 3. Compare exit_price vs entry_price with prediction to determine win/loss
 * 4. Atomically update trade: status, exit_price, end_price, result, profit, settled_at
 * 5. Credit wallet if win
 * 6. Send notification + audit log
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { tradeId } = await req.json();
    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    // ===== DOUBLE-SETTLE PROTECTION =====
    // Only fetch if status is 'active' — if already settled, this returns nothing
    const { data: trade, error: fetchErr } = await supabaseAdmin
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', auth.id)     // Must be own trade
      .eq('status', 'active')      // Must still be active
      .single();

    if (fetchErr || !trade) {
      // Trade already settled or doesn't exist — idempotent response
      const { data: settledTrade } = await supabaseAdmin
        .from('trades')
        .select('*')
        .eq('id', tradeId)
        .eq('user_id', auth.id)
        .single();

      return NextResponse.json({
        trade: settledTrade ? formatTrade(settledTrade) : null,
        message: 'Trade already settled',
        alreadySettled: true,
      });
    }

    // ===== GENERATE EXIT PRICE =====
    const now = new Date();
    const seed = now.getTime();
    const exitPrice = Math.round(generateServerPrice(seed) * 10000) / 10000;
    const entryPrice = Number(trade.entry_price ?? trade.start_price);

    // ===== DETERMINE WIN/LOSS =====
    const prediction = trade.prediction;
    const isWin = (prediction === 'buy' && exitPrice > entryPrice) ||
                  (prediction === 'sell' && exitPrice < entryPrice);
    const result = isWin ? 'win' : 'loss';
    const status = isWin ? 'won' : 'lost';

    // ===== CALCULATE PAYOUT =====
    const amount = Number(trade.amount);
    const multiplier = Number(trade.payout_multiplier);
    const totalReturn = isWin ? Math.floor(amount * multiplier) : 0;
    const profit = isWin ? totalReturn - amount : 0;

    // ===== ATOMIC UPDATE =====
    const { data: updatedTrade, error: updateErr } = await supabaseAdmin
      .from('trades')
      .update({
        status,
        result,
        exit_price: exitPrice,
        end_price: exitPrice,
        profit,
        settled_at: now.toISOString(),
      })
      .eq('id', trade.id)
      .eq('status', 'active')   // Second check: only update if still active
      .select()
      .single();

    if (updateErr || !updatedTrade) {
      // Another process settled it between our read and write
      console.warn('Race condition: trade settled by another process', tradeId);
      const { data: existingTrade } = await supabaseAdmin
        .from('trades')
        .select('*')
        .eq('id', tradeId)
        .single();

      return NextResponse.json({
        trade: existingTrade ? formatTrade(existingTrade) : null,
        message: 'Trade settled by another process',
        alreadySettled: true,
      });
    }

    // ===== CREDIT WALLET =====
    if (isWin) {
      const wallet = trade.funding_wallet;
      if (wallet === 'reward') {
        // Reward Wallet: return investment to Reward, credit profit to Profit
        const { data: rw } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', 'reward').single();
        if (rw) await supabaseAdmin.from('wallets').update({ balance: Number(rw.balance) + amount }).eq('id', rw.id);

        const { data: pw } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', 'profit').single();
        if (pw) await supabaseAdmin.from('wallets').update({ balance: Number(pw.balance) + profit }).eq('id', pw.id);
      } else {
        // Deposit or Profit Wallet: return both investment + profit to the same wallet
        const { data: fw } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', wallet).single();
        if (fw) await supabaseAdmin.from('wallets').update({ balance: Number(fw.balance) + totalReturn }).eq('id', fw.id);
      }
    }

    // ===== NOTIFICATIONS =====
    if (isWin) {
      await insertNotification(
        auth.id,
        'Trade Won!',
        `Your ${prediction.toUpperCase()} trade won! Investment: \u20a6${amount.toLocaleString()} x ${multiplier.toFixed(2)} = \u20a6${totalReturn.toLocaleString()}. Profit: \u20a6${profit.toLocaleString()}`,
        'trade',
      );
    } else {
      await insertNotification(
        auth.id,
        'Trade Lost',
        `Your ${prediction.toUpperCase()} trade lost. \u20a6${amount.toLocaleString()} was deducted.`,
        'trade',
      );
    }

    await insertAuditLog(
      auth.id,
      'TRADE_SETTLED',
      `${result.toUpperCase()}: ${prediction.toUpperCase()} \u20a6${amount.toLocaleString()} x${multiplier.toFixed(2)} (entry: ${entryPrice}, exit: ${exitPrice})`,
    );

    // ===== RETURN RESULT =====
    const { data: finalWallets } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id);

    return NextResponse.json({
      trade: formatTrade(updatedTrade),
      wallets: finalWallets,
      result,
      message: isWin
        ? `Trade won! ${multiplier.toFixed(2)}x multiplier applied.`
        : 'Trade lost. Better luck next time.',
    });
  } catch (error: unknown) {
    console.error('Settle error:', error);
    const message = error instanceof Error ? error.message : 'Settlement failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function formatTrade(row: any) {
  return {
    id: row.id,
    prediction: row.prediction,
    amount: Number(row.amount),
    payoutMultiplier: Number(row.payout_multiplier),
    duration: row.duration,
    entryPrice: Number(row.entry_price ?? row.start_price),
    exitPrice: Number(row.exit_price ?? row.end_price),
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    settledAt: row.settled_at,
    status: row.status,
    result: row.result,
    profit: Number(row.profit ?? 0),
    fundingWallet: row.funding_wallet,
  };
}
