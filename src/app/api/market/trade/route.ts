import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog, insertNotification } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export const maxDuration = 30;

function generateServerPrice(seed: number): number {
  const base = 80;
  const wave = Math.sin(seed / 1000) * 5;
  const noise = Math.sin(seed * 7.13) * 2 + Math.cos(seed * 3.71) * 1.5;
  return Math.max(10, Math.min(200, base + wave + noise));
}

function generateMultiplier(): number {
  return Math.min(1.50, Math.max(1.10, Math.floor(Math.random() * 4100 + 11000) / 10000));
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
    if (!auth.profile.isActivated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    // Check for existing active trade (graceful if column doesn't exist)
    try {
      const { data: existingActive } = await supabaseAdmin
        .from('trades')
        .select('id')
        .eq('user_id', auth.id)
        .eq('status', 'active')
        .maybeSingle();
      if (existingActive) {
        return NextResponse.json({ error: 'You already have an active trade' }, { status: 409 });
      }
    } catch { /* status column may not exist yet */ }

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

    // Deduct investment
    const newBalance = Number(fundWallet.balance) - numAmount;
    await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('id', fundWallet.id);

    const now = new Date();
    const startedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + numDuration * 1000).toISOString();
    const seed = now.getTime();
    const entryPrice = Math.round(generateServerPrice(seed) * 10000) / 10000;
    const payoutMultiplier = generateMultiplier();

    // Try NEW schema (status=active, started_at, expires_at) then fall back to OLD
    let trade: any = null;
    let usedNewSchema = false;

    const { data: newTrade, error: newErr } = await supabaseAdmin
      .from('trades')
      .insert({
        user_id: auth.id,
        funding_wallet: wallet,
        prediction,
        amount: numAmount,
        payout_multiplier: payoutMultiplier,
        duration: numDuration,
        entry_price: entryPrice,
        start_price: entryPrice,
        started_at: startedAt,
        expires_at: expiresAt,
        status: 'active',
        result: null,
        profit: null,
      })
      .select()
      .maybeSingle();

    if (newTrade && !newErr) {
      trade = newTrade;
      usedNewSchema = true;
    } else {
      console.warn('New schema failed, falling back to old schema:', newErr?.message);

      const isCorrect = Math.random() < 0.55;
      const volatility = Math.random() * 20 + 5;
      const priceDelta = isCorrect
        ? (prediction === 'buy' ? 1 : -1) * (Math.random() * volatility * 100 + 101) / 100
        : (prediction === 'buy' ? -1 : 1) * (Math.random() * volatility * 100 + 101) / 100;
      const endPrice = Math.max(0.01, entryPrice + priceDelta);
      const isWin = (prediction === 'buy' && endPrice > entryPrice) || (prediction === 'sell' && endPrice < entryPrice);
      const result = isWin ? 'win' : 'loss';
      const totalReturn = isWin ? Math.floor(numAmount * payoutMultiplier) : 0;
      const profit = isWin ? totalReturn - numAmount : 0;

      const { data: oldTrade, error: oldErr } = await supabaseAdmin
        .from('trades')
        .insert({
          user_id: auth.id,
          funding_wallet: wallet,
          prediction,
          amount: numAmount,
          payout_multiplier: payoutMultiplier,
          duration: numDuration,
          start_price: entryPrice,
          end_price: endPrice,
          result,
          profit,
        })
        .select()
        .maybeSingle();

      if (oldErr || !oldTrade) {
        console.error('Old schema also failed:', oldErr);
        await supabaseAdmin.from('wallets').update({ balance: newBalance + numAmount }).eq('id', fundWallet.id);
        throw new Error('Failed to create trade record: ' + (oldErr?.message || 'unknown'));
      }

      trade = oldTrade;

      if (isWin) {
        if (wallet === 'reward') {
          const { data: rw } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', 'reward').single();
          if (rw) await supabaseAdmin.from('wallets').update({ balance: Number(rw.balance) + numAmount }).eq('id', rw.id);
          const { data: pw } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', 'profit').single();
          if (pw) await supabaseAdmin.from('wallets').update({ balance: Number(pw.balance) + profit }).eq('id', pw.id);
        } else {
          const { data: fw } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', wallet).single();
          if (fw) await supabaseAdmin.from('wallets').update({ balance: Number(fw.balance) + totalReturn }).eq('id', fw.id);
        }
        await insertNotification(auth.id, 'Trade Won!', 'Your ' + prediction.toUpperCase() + ' trade won! \u20a6' + totalReturn.toLocaleString(), 'trade');
      } else {
        await insertNotification(auth.id, 'Trade Lost', 'Your ' + prediction.toUpperCase() + ' trade lost. \u20a6' + numAmount.toLocaleString() + ' deducted.', 'trade');
      }
    }

    await insertAuditLog(auth.id, 'TRADE_OPENED', prediction.toUpperCase() + ' \u20a6' + numAmount.toLocaleString() + ' for ' + numDuration + 's, entry: ' + entryPrice);

    const { data: updatedWallets } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id);

    if (usedNewSchema) {
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
          status: trade.status || 'active',
          fundingWallet: trade.funding_wallet,
        },
        wallets: updatedWallets,
        serverTime: now.toISOString(),
        message: 'Trade opened',
      }, { status: 201 });
    } else {
      const isWin = trade.result === 'win';
      return NextResponse.json({
        trade: {
          id: trade.id,
          prediction: trade.prediction,
          amount: Number(trade.amount),
          payoutMultiplier: Number(trade.payout_multiplier),
          duration: trade.duration,
          entryPrice: Number(trade.start_price),
          exitPrice: Number(trade.end_price),
          startedAt: trade.created_at,
          expiresAt: new Date(new Date(trade.created_at).getTime() + numDuration * 1000).toISOString(),
          status: isWin ? 'won' : 'lost',
          result: trade.result,
          profit: Number(trade.profit ?? 0),
          fundingWallet: trade.funding_wallet,
        },
        wallets: updatedWallets,
        serverTime: now.toISOString(),
        result: trade.result,
        message: isWin ? 'Trade won! ' + payoutMultiplier.toFixed(2) + 'x multiplier applied.' : 'Trade lost. Better luck next time.',
      }, { status: 201 });
    }
  } catch (error: unknown) {
    console.error('Trade error:', error);
    const message = error instanceof Error ? error.message : 'Trade failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
