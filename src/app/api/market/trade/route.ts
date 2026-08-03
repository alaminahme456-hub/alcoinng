import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 60;

function generateStartPrice(): number {
  return Math.floor(Math.random() * 10000) / 100 + 1;
}

function generateEndPrice(prediction: string): number {
  const isCorrect = Math.random() < 0.55;
  const volatility = Math.random() * 20 + 5;

  if (isCorrect) {
    if (prediction === 'buy') {
      return Math.floor(Math.random() * volatility * 100 + 101) / 100;
    } else {
      return -(Math.floor(Math.random() * volatility * 100 + 101) / 100);
    }
  } else {
    if (prediction === 'buy') {
      return -(Math.floor(Math.random() * volatility * 100 + 101) / 100);
    } else {
      return Math.floor(Math.random() * volatility * 100 + 101) / 100;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fundingWallet, prediction, amount, payoutMultiplier, duration } = await req.json();

    if (!fundingWallet || !prediction || !amount || !payoutMultiplier || !duration) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!['reward', 'deposit', 'profit'].includes(fundingWallet)) {
      return NextResponse.json({ error: 'Invalid wallet type' }, { status: 400 });
    }

    if (!['buy', 'sell'].includes(prediction)) {
      return NextResponse.json({ error: 'Prediction must be buy or sell' }, { status: 400 });
    }

    const numAmount = Number(amount);
    const numMultiplier = Number(payoutMultiplier);
    const numDuration = Number(duration);

    if (numAmount <= 0 || numMultiplier <= 0 || numDuration <= 0) {
      return NextResponse.json({ error: 'Amount, multiplier and duration must be positive' }, { status: 400 });
    }

    if (!auth.profile.is_activated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    // Check wallet balance
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('type', fundingWallet)
      .single();

    if (!wallet || Number(wallet.balance) < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Debit the wallet
    const newWalletBalance = Number(wallet.balance) - numAmount;
    await supabaseAdmin
      .from('wallets')
      .update({ balance: newWalletBalance })
      .eq('id', wallet.id);

    // Generate start price
    const startPrice = generateStartPrice();

    // Create trade record
    const { data: trade } = await supabaseAdmin
      .from('trades')
      .insert({
        user_id: auth.user.id,
        funding_wallet: fundingWallet,
        prediction,
        amount: numAmount,
        payout_multiplier: numMultiplier,
        duration: numDuration,
        start_price: startPrice,
      })
      .select()
      .single();

    // Wait for duration (in seconds)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, numDuration * 1000);
    });

    // Generate end price
    const priceChange = generateEndPrice(prediction);
    const endPrice = Math.max(0.01, startPrice + priceChange);
    const isWin =
      (prediction === 'buy' && endPrice > startPrice) ||
      (prediction === 'sell' && endPrice < startPrice);

    const result = isWin ? 'win' : 'loss';
    const profit = isWin ? numAmount * (numMultiplier - 1) : 0;

    // Update trade
    const { data: updatedTrade } = await supabaseAdmin
      .from('trades')
      .update({ end_price: endPrice, result, profit })
      .eq('id', trade.id)
      .select()
      .single();

    if (isWin) {
      if (fundingWallet === 'reward') {
        // Return stake to reward wallet
        const { data: rw } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .eq('user_id', auth.user.id)
          .eq('type', 'reward')
          .single();
        await supabaseAdmin.from('wallets').update({
          balance: Number(rw!.balance) + numAmount,
        }).eq('id', rw!.id);

        // Profit to profit wallet
        const { data: pw } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .eq('user_id', auth.user.id)
          .eq('type', 'profit')
          .single();
        await supabaseAdmin.from('wallets').update({
          balance: Number(pw!.balance) + profit,
        }).eq('id', pw!.id);
      } else {
        // Deposit or profit wallet: return stake + profit to same wallet
        const { data: fw } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .eq('user_id', auth.user.id)
          .eq('type', fundingWallet)
          .single();
        await supabaseAdmin.from('wallets').update({
          balance: Number(fw!.balance) + numAmount + profit,
        }).eq('id', fw!.id);
      }

      await supabaseAdmin.from('notifications').insert({
        user_id: auth.user.id,
        title: 'Trade Won!',
        message: `Your ${prediction.toUpperCase()} trade won! Profit: \u20a6${profit.toLocaleString()}`,
        type: 'trade',
      });
    } else {
      await supabaseAdmin.from('notifications').insert({
        user_id: auth.user.id,
        title: 'Trade Lost',
        message: `Your ${prediction.toUpperCase()} trade lost. \u20a6${numAmount.toLocaleString()} was deducted.`,
        type: 'trade',
      });
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'TRADE',
      details: `${result.toUpperCase()}: ${prediction.toUpperCase()} \u20a6${numAmount.toLocaleString()} (start: ${startPrice}, end: ${endPrice})`,
    });

    // Fetch updated wallets
    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.user.id);

    return NextResponse.json({
      trade: updatedTrade,
      wallets,
      message: isWin ? 'Trade won!' : 'Trade lost',
    });
  } catch (error: unknown) {
    console.error('Trade error:', error);
    const message = error instanceof Error ? error.message : 'Trade failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
