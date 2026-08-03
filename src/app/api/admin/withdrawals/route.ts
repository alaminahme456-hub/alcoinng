import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const where: Record<string, unknown> = {};
    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      db.withdrawal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              phone: true,
              bankName: true,
              bankAccount: true,
              bankAccountName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.withdrawal.count({ where }),
    ]);

    // Calculate totals
    const pendingTotal = await db.withdrawal.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
    });
    const paidTotal = await db.withdrawal.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
    });

    return NextResponse.json({
      withdrawals,
      pendingTotal: pendingTotal._sum.amount || 0,
      paidTotal: paidTotal._sum.amount || 0,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin withdrawals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch withdrawals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { withdrawalId, action } = await req.json();
    if (!withdrawalId || !action) {
      return NextResponse.json({ error: 'Withdrawal ID and action are required' }, { status: 400 });
    }

    if (!['approve', 'reject', 'pay'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve, reject, or pay' }, { status: 400 });
    }

    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'approved') {
      return NextResponse.json({ error: `Withdrawal is ${withdrawal.status}, cannot ${action}` }, { status: 400 });
    }

    if (action === 'approve') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending withdrawals can be approved' }, { status: 400 });
      }
      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'approved' },
      });

      await db.notification.create({
        data: {
          userId: withdrawal.userId,
          title: 'Withdrawal Approved',
          message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been approved and will be processed shortly.`,
          type: 'withdrawal',
        },
      });
    } else if (action === 'reject') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending withdrawals can be rejected' }, { status: 400 });
      }

      // Refund to wallet
      await db.$transaction([
        db.withdrawal.update({
          where: { id: withdrawalId },
          data: { status: 'rejected' },
        }),
        db.wallet.update({
          where: { userId_type: { userId: withdrawal.userId, type: withdrawal.wallet } },
          data: { balance: { increment: withdrawal.amount } },
        }),
      ]);

      await db.notification.create({
        data: {
          userId: withdrawal.userId,
          title: 'Withdrawal Rejected',
          message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} was rejected. The amount has been refunded to your ${withdrawal.wallet} wallet.`,
          type: 'withdrawal',
        },
      });
    } else if (action === 'pay') {
      if (withdrawal.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved withdrawals can be marked as paid' }, { status: 400 });
      }
      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'paid' },
      });

      await db.notification.create({
        data: {
          userId: withdrawal.userId,
          title: 'Withdrawal Paid ✅',
          message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been paid to your bank account.`,
          type: 'withdrawal',
        },
      });
    }

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: `WITHDRAWAL_${action.toUpperCase()}`,
        details: `${action}d withdrawal ${withdrawalId} of ₦${withdrawal.amount.toLocaleString()} for ${withdrawal.user.username}`,
      },
    });

    const updatedWithdrawal = await db.withdrawal.findUnique({ where: { id: withdrawalId } });
    return NextResponse.json({ withdrawal: updatedWithdrawal, message: `Withdrawal ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Admin process withdrawal error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process withdrawal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
