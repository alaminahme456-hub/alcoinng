import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

    const { wallet, amount } = await req.json();
    if (!wallet || !amount) {
      return NextResponse.json({ error: 'Wallet type and amount are required' }, { status: 400 });
    }

    if (!['reward', 'deposit', 'profit'].includes(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet type' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isActivated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    if (!user.bankName || !user.bankAccount || !user.bankAccountName) {
      return NextResponse.json({ error: 'Please update your bank details before withdrawing' }, { status: 400 });
    }

    // Check minimum amounts for reward wallet
    if (wallet === 'reward') {
      // Weekly minimum: ₦2,000
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyWithdrawals = await db.withdrawal.findMany({
        where: {
          userId: user.id,
          wallet: 'reward',
          createdAt: { gte: oneWeekAgo },
          status: { in: ['pending', 'approved', 'paid'] },
        },
        select: { amount: true },
      });
      const weeklyTotal = weeklyWithdrawals.reduce((sum, w) => sum + w.amount, 0);

      if (weeklyTotal + numAmount < 2000 && weeklyTotal === 0) {
        return NextResponse.json(
          { error: 'Minimum weekly withdrawal for reward wallet is ₦2,000' },
          { status: 400 }
        );
      }

      // Monthly minimum: ₦8,000
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const monthlyWithdrawals = await db.withdrawal.findMany({
        where: {
          userId: user.id,
          wallet: 'reward',
          createdAt: { gte: oneMonthAgo },
          status: { in: ['pending', 'approved', 'paid'] },
        },
        select: { amount: true },
      });
      const monthlyTotal = monthlyWithdrawals.reduce((sum, w) => sum + w.amount, 0);

      if (monthlyTotal + numAmount < 8000 && monthlyTotal === 0) {
        return NextResponse.json(
          { error: 'Minimum monthly withdrawal for reward wallet is ₦8,000' },
          { status: 400 }
        );
      }
    }

    // Check wallet balance
    const walletRecord = await db.wallet.findUnique({
      where: { userId_type: { userId: user.id, type: wallet } },
    });

    if (!walletRecord || walletRecord.balance < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Create withdrawal request
    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        wallet,
        amount: numAmount,
      },
    });

    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Withdrawal Requested',
        message: `Your withdrawal of ₦${numAmount.toLocaleString()} from ${wallet} wallet is pending review.`,
        type: 'withdrawal',
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'WITHDRAWAL_REQUEST',
        details: `Requested ₦${numAmount.toLocaleString()} from ${wallet} wallet`,
      },
    });

    return NextResponse.json({ withdrawal, message: 'Withdrawal request submitted' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Withdraw error:', error);
    const message = error instanceof Error ? error.message : 'Withdrawal failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
 const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const where: Record<string, unknown> = { userId: payload.userId };
    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      db.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.withdrawal.count({ where }),
    ]);

    return NextResponse.json({
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Fetch withdrawals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch withdrawals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
