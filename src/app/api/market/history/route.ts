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

    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const result = searchParams.get('result');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const where: Record<string, unknown> = { userId: payload.userId };

    if (wallet && ['reward', 'deposit', 'profit'].includes(wallet)) {
      where.fundingWallet = wallet;
    }
    if (result && ['win', 'loss'].includes(result)) {
      where.result = result;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const [trades, total] = await Promise.all([
      db.trade.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.trade.count({ where }),
    ]);

    const wins = await db.trade.count({ where: { ...where, result: 'win' } });
    const losses = await db.trade.count({ where: { ...where, result: 'loss' } });

    return NextResponse.json({
      trades,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: { wins, losses, totalTrades: wins + losses },
    });
  } catch (error: unknown) {
    console.error('Trade history error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch trade history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
