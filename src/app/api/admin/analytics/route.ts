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

    // Core stats
    const [totalUsers, activatedUsers, pendingActivations, activeTasks, activeAds] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { isActivated: true } }),
        db.user.count({ where: { isActivated: false } }),
        db.task.count({ where: { isActive: true } }),
        db.ad.count({ where: { isActive: true } }),
      ]);

    // Wallet totals
    const rewardBalance = await db.wallet.aggregate({
      where: { type: 'reward' },
      _sum: { balance: true },
    });
    const depositBalance = await db.wallet.aggregate({
      where: { type: 'deposit' },
      _sum: { balance: true },
    });
    const profitBalance = await db.wallet.aggregate({
      where: { type: 'profit' },
      _sum: { balance: true },
    });

    // Total deposits (from used deposit codes)
    const totalDeposits = await db.depositCode.aggregate({
      where: { status: 'used' },
      _sum: { amount: true },
    });

    // Withdrawal stats
    const totalWithdrawals = await db.withdrawal.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
    });
    const pendingWithdrawals = await db.withdrawal.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
    });
    const pendingWithdrawalCount = await db.withdrawal.count({
      where: { status: 'pending' },
    });

    // Trade stats
    const totalTrades = await db.trade.count();
    const winningTrades = await db.trade.count({ where: { result: 'win' } });
    const losingTrades = await db.trade.count({ where: { result: 'loss' } });
    const totalStaked = await db.trade.aggregate({
      _sum: { amount: true },
    });
    const totalProfitPaid = await db.trade.aggregate({
      where: { result: 'win' },
      _sum: { profit: true },
    });

    // Daily registrations for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyRegistrations = await db.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    });

    // Group by date
    const registrationByDate: Record<string, number> = {};
    for (const reg of dailyRegistrations) {
      const dateKey = reg.createdAt.toISOString().split('T')[0];
      registrationByDate[dateKey] = (registrationByDate[dateKey] || 0) + reg._count.id;
    }

    // Pending task submissions
    const pendingSubmissions = await db.taskSubmission.count({
      where: { status: 'pending' },
    });

    // Activation codes stats
    const unusedCodes = await db.activationCode.count({ where: { status: 'unused' } });
    const usedCodes = await db.activationCode.count({ where: { status: 'used' } });

    // Deposit codes stats
    const unusedDepositCodes = await db.depositCode.count({ where: { status: 'unused' } });
    const usedDepositCodes = await db.depositCode.count({ where: { status: 'used' } });

    return NextResponse.json({
      users: {
        total: totalUsers,
        activated: activatedUsers,
        pendingActivation: pendingActivations,
      },
      deposits: {
        total: totalDeposits._sum.amount || 0,
        unusedCodes,
        usedCodes,
      },
      depositsCodes: {
        unused: unusedDepositCodes,
        used: usedDepositCodes,
      },
      withdrawals: {
        totalPaid: totalWithdrawals._sum.amount || 0,
        pendingAmount: pendingWithdrawals._sum.amount || 0,
        pendingCount: pendingWithdrawalCount,
      },
      wallets: {
        rewardBalance: rewardBalance._sum.balance || 0,
        depositBalance: depositBalance._sum.balance || 0,
        profitBalance: profitBalance._sum.balance || 0,
      },
      trades: {
        total: totalTrades,
        wins: winningTrades,
        losses: losingTrades,
        totalStaked: totalStaked._sum.amount || 0,
        totalProfitPaid: totalProfitPaid._sum.profit || 0,
      },
      tasks: {
        active: activeTasks,
        pendingSubmissions,
      },
      ads: {
        active: activeAds,
      },
      dailyRegistrations: registrationByDate,
    });
  } catch (error: unknown) {
    console.error('Analytics error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
