import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getAuthAdmin } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const admin = getAuthAdmin(token || '');
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = getDB();

    // Users
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count || 0;
    const activatedUsers = (db.prepare('SELECT COUNT(*) as count FROM users WHERE is_activated = 1').get() as { count: number }).count || 0;
    const pendingActivations = (db.prepare('SELECT COUNT(*) as count FROM users WHERE is_activated = 0').get() as { count: number }).count || 0;

    // Wallets
    const rewardRow = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE type = ?').get('reward') as { total: number };
    const depositRow = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE type = ?').get('deposit') as { total: number };
    const profitRow = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE type = ?').get('profit') as { total: number };
    const rewardBalance = Number(rewardRow.total) || 0;
    const depositBalance = Number(depositRow.total) || 0;
    const profitBalance = Number(profitRow.total) || 0;

    // Deposits (from used deposit codes)
    const depositTotalRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM deposit_codes WHERE status = 'used'").get() as { total: number };
    const totalDeposits = Number(depositTotalRow.total) || 0;

    // Withdrawals
    const paidRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = 'paid'").get() as { total: number };
    const totalPaid = Number(paidRow.total) || 0;

    const pendingAmtRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = 'pending'").get() as { total: number };
    const pendingAmount = Number(pendingAmtRow.total) || 0;

    const pendingWdCount = (db.prepare("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'").get() as { count: number }).count || 0;

    // Trades
    const totalTrades = (db.prepare('SELECT COUNT(*) as count FROM trades').get() as { count: number }).count || 0;
    const winningTrades = (db.prepare("SELECT COUNT(*) as count FROM trades WHERE result = 'win'").get() as { count: number }).count || 0;
    const losingTrades = (db.prepare("SELECT COUNT(*) as count FROM trades WHERE result = 'loss'").get() as { count: number }).count || 0;

    const stakedRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM trades').get() as { total: number };
    const totalStaked = Number(stakedRow.total) || 0;

    const profitPaidRow = db.prepare("SELECT COALESCE(SUM(profit), 0) as total FROM trades WHERE result = 'win'").get() as { total: number };
    const totalProfitPaid = Number(profitPaidRow.total) || 0;

    // Tasks
    const activeTasks = (db.prepare('SELECT COUNT(*) as count FROM tasks WHERE is_active = 1').get() as { count: number }).count || 0;
    const pendingSubmissions = (db.prepare("SELECT COUNT(*) as count FROM task_submissions WHERE status = 'pending'").get() as { count: number }).count || 0;

    // Ads
    const activeAds = (db.prepare('SELECT COUNT(*) as count FROM ads WHERE is_active = 1').get() as { count: number }).count || 0;

    // Activation codes
    const unusedCodes = (db.prepare("SELECT COUNT(*) as count FROM activation_codes WHERE status = 'unused'").get() as { count: number }).count || 0;
    const usedCodes = (db.prepare("SELECT COUNT(*) as count FROM activation_codes WHERE status = 'used'").get() as { count: number }).count || 0;

    // Deposit codes
    const unusedDepositCodes = (db.prepare("SELECT COUNT(*) as count FROM deposit_codes WHERE status = 'unused'").get() as { count: number }).count || 0;
    const usedDepositCodes = (db.prepare("SELECT COUNT(*) as count FROM deposit_codes WHERE status = 'used'").get() as { count: number }).count || 0;

    // Daily registrations — last 30 days
    const recentRows = db
      .prepare("SELECT created_at FROM users WHERE created_at >= datetime('now', '-30 days')")
      .all() as Array<{ created_at: string }>;

    const registrationByDate: Record<string, number> = {};
    for (const u of recentRows) {
      const dateKey = new Date(u.created_at).toISOString().split('T')[0];
      registrationByDate[dateKey] = (registrationByDate[dateKey] || 0) + 1;
    }

    return NextResponse.json({
      users: {
        total: totalUsers,
        activated: activatedUsers,
        pendingActivation: pendingActivations,
      },
      deposits: {
        total: totalDeposits,
        unusedCodes,
        usedCodes,
      },
      depositsCodes: {
        unused: unusedDepositCodes,
        used: usedDepositCodes,
      },
      withdrawals: {
        totalPaid,
        pendingAmount,
        pendingCount: pendingWdCount,
      },
      wallets: {
        rewardBalance,
        depositBalance,
        profitBalance,
      },
      trades: {
        total: totalTrades,
        wins: winningTrades,
        losses: losingTrades,
        totalStaked,
        totalProfitPaid,
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
