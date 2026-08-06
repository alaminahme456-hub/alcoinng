import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog, insertNotification } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export const maxDuration = 30;

function generateStartPrice(): number {
  return Math.floor(Math.random() * 10000) / 100 + 1;
}

/**
 * Generate a random multiplier between 1.10 and 1.50.
 * This is calculated at the END of the trade duration, not shown to the user.
 */
function generateMultiplier(): number {
  return Math.floor(Math.random() * 4100 + 11000) / 10000; // 1.10 to 1.51 (clamped below)
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

    const startPrice = generateStartPrice();

    // Generate hidden multiplier (1.10x to 1.50x)
    const finalMultiplier = Math.min(1.50, Math.max(1.10, generateMultiplier()));

    // Determine win/loss (55% win rate)
    const isCorrect = Math.random() < 0.55;
    const volatility = Math.random() * 20 + 5;
    const priceDelta = isCorrect
      ? (prediction === 'buy' ? 1 : -1) * (Math.random() * volatility * 100 + 101) / 100
      : (prediction === 'buy' ? -1 : 1) * (Math.random() * volatility * 100 + 101) / 100;
    const endPrice = Math.max(0.01, startPrice + priceDelta);
    const isWin = (prediction === 'buy' && endPrice > startPrice) || (prediction === 'sell' && endPrice < startPrice);
    const result = isWin ? 'win' : 'loss';

    // Calculate payout
    const totalReturn = isWin ? Math.floor(numAmount * finalMultiplier) : 0;
    const profit = isWin ? totalReturn - numAmount : 0;

    // Insert trade record with all final values in one shot (no update needed)
    const { data: trade, error: tradeErr } = await supabaseAdmin.from('trades').insert({
      user_id: auth.id,
      funding_wallet: wallet,
      prediction,
      amount: numAmount,
      payout_multiplier: finalMultiplier,
      duration: numDuration,
      start_price: startPrice,
      end_price: endPrice,
      result,
      profit,
    }).select().single();

    if (tradeErr) {
      console.error('Trade insert error:', tradeErr);
      // Refund the deducted amount since trade record failed
      await supabaseAdmin.from('wallets').update({ balance: newBalance + numAmount }).eq('id', fundWallet.id);
      throw new Error('Failed to create trade record');
    }

    if (!trade) throw new Error('Failed to create trade');

    // Credit wallets according to rules
    if (isWin) {
      if (wallet === 'reward') {
        // Reward Wallet: return investment to Reward, credit profit to Profit
        const { data: rw } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', 'reward').single();
        if (rw) await supabaseAdmin.from('wallets').update({ balance: Number(rw.balance) + numAmount }).eq('id', rw.id);

        const { data: pw } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', 'profit').single();
        if (pw) await supabaseAdmin.from('wallets').update({ balance: Number(pw.balance) + profit }).eq('id', pw.id);
      } else {
        // Deposit or Profit Wallet: return both investment + profit to the same wallet
        const { data: fw } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id).eq('type', wallet).single();
        if (fw) await supabaseAdmin.from('wallets').update({ balance: Number(fw.balance) + totalReturn }).eq('id', fw.id);
      }

      await insertNotification(
        auth.id,
        'Trade Won!',
        `Your ${prediction.toUpperCase()} trade won! Investment: \u20a6${numAmount.toLocaleString()} x ${finalMultiplier.toFixed(2)} = \u20a6${totalReturn.toLocaleString()}. Profit: \u20a6${profit.toLocaleString()}`,
        'trade'
      );
    } else {
      await insertNotification(
        auth.id,
        'Trade Lost',
        `Your ${prediction.toUpperCase()} trade lost. \u20a6${numAmount.toLocaleString()} was deducted.`,
        'trade'
      );
    }

    await insertAuditLog(
      auth.id,
      'TRADE',
      `${result.toUpperCase()}: ${prediction.toUpperCase()} \u20a6${numAmount.toLocaleString()} x${finalMultiplier.toFixed(2)} (start: ${startPrice}, end: ${endPrice})`
    );

    // Fetch updated trade and wallets
    const { data: updatedTrade } = await supabaseAdmin.from('trades').select('*').eq('id', trade.id).single();
    const { data: updatedWallets } = await supabaseAdmin.from('wallets').select('*').eq('user_id', auth.id);

    return NextResponse.json({
      trade: updatedTrade,
      wallets: updatedWallets,
      result,
      message: isWin
        ? `Trade won! ${finalMultiplier.toFixed(2)}x multiplier applied.`
        : 'Trade lost. Better luck next time.',
    });
  } catch (error: unknown) {
    console.error('Trade error:', error);
    const message = error instanceof Error ? error.message : 'Trade failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
