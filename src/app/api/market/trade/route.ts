import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const maxDuration = 60;

function generateStartPrice(): number {
  return Math.floor(Math.random() * 10000) / 100 + 1; // 1.00 to 101.00
}

function generateEndPrice(prediction: string): number {
  // ~55% chance of being correct
  const isCorrect = Math.random() < 0.55;

  const volatility = Math.random() * 20 + 5; // 5-25% change

  if (isCorrect) {
    // Price moves in favor of prediction
    if (prediction === 'buy') {
      return Math.floor(Math.random() * volatility * 100 + 101) / 100; // 1.01 to volatility+1.01 (positive)
    } else {
      return -(Math.floor(Math.random() * volatility * 100 + 101) / 100); // negative
    }
  } else {
    // Price moves against prediction
    if (prediction === 'buy') {
      return -(Math.floor(Math.random() * volatility * 100 + 101) / 100);
    } else {
      return Math.floor(Math.random() * volatility * 100 + 101) / 100;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

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

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isActivated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    // Check wallet balance
    const wallet = await db.wallet.findUnique({
      where: { userId_type: { userId: user.id, type: fundingWallet } },
    });

    if (!wallet || wallet.balance < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Debit the wallet
    await db.wallet.update({
      where: { userId_type: { userId: user.id, type: fundingWallet } },
      data: { balance: { decrement: numAmount } },
    });

    // Generate start price
    const startPrice = generateStartPrice();

    // Create trade record
    const trade = await db.trade.create({
      data: {
        userId: user.id,
        fundingWallet,
        prediction,
        amount: numAmount,
        payoutMultiplier: numMultiplier,
        duration: numDuration,
        startPrice,
      },
    });

    // Wait for duration (in seconds)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, numDuration * 1000);
    });

    // Generate end price change
    const priceChange = generateEndPrice(prediction);
    const endPrice = Math.max(0.01, startPrice + priceChange);

    // Determine result
    const isWin =
      (prediction === 'buy' && endPrice > startPrice) ||
      (prediction === 'sell' && endPrice < startPrice);

    const result = isWin ? 'win' : 'loss';
    const profit = isWin ? numAmount * (numMultiplier - 1) : 0;

    // Update trade
    const updatedTrade = await db.trade.update({
      where: { id: trade.id },
      data: { endPrice, result, profit },
    });

    if (isWin) {
      if (fundingWallet === 'reward') {
        // Return stake to reward wallet, profit to profit wallet
        await db.wallet.update({
          where: { userId_type: { userId: user.id, type: 'reward' } },
          data: { balance: { increment: numAmount } },
        });
        await db.wallet.update({
          where: { userId_type: { userId: user.id, type: 'profit' } },
          data: { balance: { increment: profit } },
        });
      } else {
        // Deposit or profit wallet: return stake + profit to same wallet
        await db.wallet.update({
          where: { userId_type: { userId: user.id, type: fundingWallet } },
          data: { balance: { increment: numAmount + profit } },
        });
      }

      await db.notification.create({
        data: {
          userId: user.id,
          title: 'Trade Won! 🎉',
          message: `Your ${prediction.toUpperCase()} trade won! Profit: ₦${profit.toLocaleString()}`,
          type: 'trade',
        },
      });
    } else {
      await db.notification.create({
        data: {
          userId: user.id,
          title: 'Trade Lost',
          message: `Your ${prediction.toUpperCase()} trade lost. ₦${numAmount.toLocaleString()} was deducted.`,
          type: 'trade',
        },
      });
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'TRADE',
        details: `${result.toUpperCase()}: ${prediction.toUpperCase()} ₦${numAmount.toLocaleString()} (start: ${startPrice}, end: ${endPrice})`,
      },
    });

    // Fetch updated wallets
    const wallets = await db.wallet.findMany({
      where: { userId: user.id },
    });

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
