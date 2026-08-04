import { NextRequest, NextResponse } from 'next/server';
import { getDB, ensureWallets, insertAuditLog, insertNotification } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const maxDuration = 60;

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

function generateStartPrice(): number {
  return Math.floor(Math.random() * 10000) / 100 + 1;
}

function generateEndPrice(prediction: string): number {
  const isCorrect = Math.random() < 0.55;
  const volatility = Math.random() * 20 + 5;
  if (isCorrect) {
    return prediction === 'buy'
      ? Math.floor(Math.random() * volatility * 100 + 101) / 100
      : -(Math.floor(Math.random() * volatility * 100 + 101) / 100);
  } else {
    return prediction === 'buy'
      ? -(Math.floor(Math.random() * volatility * 100 + 101) / 100)
      : Math.floor(Math.random() * volatility * 100 + 101) / 100;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(getToken(req)!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fundingWallet, prediction, amount, payoutMultiplier, duration } = await req.json();
    if (!fundingWallet || !prediction || !amount || !payoutMultiplier || !duration) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (!['reward', 'deposit', 'profit'].includes(fundingWallet)) return NextResponse.json({ error: 'Invalid wallet type' }, { status: 400 });
    if (!['buy', 'sell'].includes(prediction)) return NextResponse.json({ error: 'Prediction must be buy or sell' }, { status: 400 });

    const numAmount = Number(amount);
    const numMultiplier = Number(payoutMultiplier);
    const numDuration = Number(duration);
    if (numAmount <= 0 || numMultiplier <= 0 || numDuration <= 0) {
      return NextResponse.json({ error: 'Amount, multiplier and duration must be positive' }, { status: 400 });
    }
    if (!auth.profile.isActivated) return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });

    const db = getDB();
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(auth.id, fundingWallet) as Record<string, unknown> | undefined;
    if (!wallet || Number(wallet.balance) < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Debit wallet
    const newBalance = Number(wallet.balance) - numAmount;
    db.prepare('UPDATE wallets SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newBalance, wallet.id);

    const startPrice = generateStartPrice();
    const tradeId = crypto.randomUUID();
    db.prepare('INSERT INTO trades (id, user_id, funding_wallet, prediction, amount, payout_multiplier, duration, start_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(tradeId, auth.id, fundingWallet, prediction, numAmount, numMultiplier, numDuration, startPrice);

    // Wait for trade duration
    await new Promise<void>((resolve) => setTimeout(resolve, numDuration * 1000));

    // Generate result
    const priceChange = generateEndPrice(prediction);
    const endPrice = Math.max(0.01, startPrice + priceChange);
    const isWin = (prediction === 'buy' && endPrice > startPrice) || (prediction === 'sell' && endPrice < startPrice);
    const result = isWin ? 'win' : 'loss';
    const profit = isWin ? numAmount * (numMultiplier - 1) : 0;

    db.prepare('UPDATE trades SET end_price = ?, result = ?, profit = ? WHERE id = ?').run(endPrice, result, profit, tradeId);

    if (isWin) {
      if (fundingWallet === 'reward') {
        const rw = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(auth.id, 'reward') as Record<string, unknown> | undefined;
        if (rw) db.prepare('UPDATE wallets SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?').run(Number(rw.balance) + numAmount, rw.id);

        const pw = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(auth.id, 'profit') as Record<string, unknown> | undefined;
        if (pw) db.prepare('UPDATE wallets SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?').run(Number(pw.balance) + profit, pw.id);
      } else {
        const fw = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(auth.id, fundingWallet) as Record<string, unknown> | undefined;
        if (fw) db.prepare('UPDATE wallets SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?').run(Number(fw.balance) + numAmount + profit, fw.id);
      }
      insertNotification(db, auth.id, 'Trade Won!', `Your ${prediction.toUpperCase()} trade won! Profit: \u20a6${profit.toLocaleString()}`, 'trade');
    } else {
      insertNotification(db, auth.id, 'Trade Lost', `Your ${prediction.toUpperCase()} trade lost. \u20a6${numAmount.toLocaleString()} was deducted.`, 'trade');
    }

    insertAuditLog(db, auth.id, 'TRADE', `${result.toUpperCase()}: ${prediction.toUpperCase()} \u20a6${numAmount.toLocaleString()} (start: ${startPrice}, end: ${endPrice})`);

    const updatedTrade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId);
    const wallets = db.prepare('SELECT * FROM wallets WHERE user_id = ?').all(auth.id);

    return NextResponse.json({ trade: updatedTrade, wallets, message: isWin ? 'Trade won!' : 'Trade lost' });
  } catch (error: unknown) {
    console.error('Trade error:', error);
    const message = error instanceof Error ? error.message : 'Trade failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
