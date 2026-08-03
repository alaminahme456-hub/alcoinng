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

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Deposit code is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isActivated) {
      return NextResponse.json({ error: 'Account must be activated before depositing' }, { status: 403 });
    }

    const depositCode = await db.depositCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!depositCode) {
      return NextResponse.json({ error: 'Invalid deposit code' }, { status: 404 });
    }

    if (depositCode.status !== 'unused') {
      return NextResponse.json({ error: 'Deposit code has already been used' }, { status: 400 });
    }

    const now = new Date();

    await db.$transaction([
      db.depositCode.update({
        where: { id: depositCode.id },
        data: {
          status: 'used',
          redeemedBy: user.id,
          redeemedAt: now,
        },
      }),
      db.wallet.update({
        where: { userId_type: { userId: user.id, type: 'deposit' } },
        data: { balance: { increment: depositCode.amount } },
      }),
    ]);

    const updatedWallet = await db.wallet.findUnique({
      where: { userId_type: { userId: user.id, type: 'deposit' } },
    });

    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Deposit Successful',
        message: `₦${depositCode.amount.toLocaleString()} has been credited to your deposit wallet.`,
        type: 'deposit',
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'DEPOSIT',
        details: `Deposited ₦${depositCode.amount} with code ${depositCode.code}`,
      },
    });

    return NextResponse.json({
      message: 'Deposit successful',
      amount: depositCode.amount,
      newBalance: updatedWallet?.balance || 0,
    });
  } catch (error: unknown) {
    console.error('Deposit error:', error);
    const message = error instanceof Error ? error.message : 'Deposit failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
