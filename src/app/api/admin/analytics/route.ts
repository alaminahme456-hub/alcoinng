import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthAdmin } from '@/lib/supabase/helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Core counts in parallel
    const [
      totalUsersRes,
      activatedUsersRes,
      pendingActivationsRes,
      activeTasksRes,
      activeAdsRes,
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_activated', true),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_activated', false),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('ads').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    const totalUsers = totalUsersRes.count || 0;
    const activatedUsers = activatedUsersRes.count || 0;
    const pendingActivations = pendingActivationsRes.count || 0;
    const activeTasks = activeTasksRes.count || 0;
    const activeAds = activeAdsRes.count || 0;

    // Wallet totals
    const [rewardRes, depositRes, profitRes] = await Promise.all([
      supabaseAdmin.from('wallets').select('balance').eq('type', 'reward'),
      supabaseAdmin.from('wallets').select('balance').eq('type', 'deposit'),
      supabaseAdmin.from('wallets').select('balance').eq('type', 'profit'),
    ]);

    const rewardBalance = (rewardRes.data || []).reduce(
      (sum: number, r: Record<string, unknown>) => sum + Number(r.balance),
      0
    );
    const depositBalance = (depositRes.data || []).reduce(
      (sum: number, r: Record<string, unknown>) => sum + Number(r.balance),
      0
    );
    const profitBalance = (profitRes.data || []).reduce(
      (sum: number, r: Record<string, unknown>) => sum + Number(r.balance),
      0
    );

    // Total deposits (from used deposit codes)
    const { data: usedDepositCodesData } = await supabaseAdmin
      .from('deposit_codes')
      .select('amount')
      .eq('status', 'used');

    const totalDeposits = (usedDepositCodesData || []).reduce(
      (sum: number, r: Record<string, unknown>) => sum + Number(r.amount),
      0
    );

    // Withdrawal stats
    const [paidWithdrawalsRes, pendingWithdrawalsRes, pendingWithdrawalCountRes] =
      await Promise.all([
        supabaseAdmin.from('withdrawals').select('amount').eq('status', 'paid'),
        supabaseAdmin.from('withdrawals').select('amount').eq('status', 'pending'),
        supabaseAdmin.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

    const totalPaid = (paidWithdrawalsRes.data || []).reduce(
      (sum: number, r: Record<string, unknown>) => sum + Number(r.amount),
      0
    );
    const pendingAmount = (pendingWithdrawalsRes.data || []).reduce(
      (sum: number, r: Record<string, unknown>) => sum + Number(r.amount),
      0
    );
    const pendingCount = pendingWithdrawalCountRes.count || 0;

    // Trade stats
    const [
      totalTradesRes,
      winningTradesRes,
      losingTradesRes,
      allTradesAmountRes,
      winningTradesProfitRes,
    ] = await Promise.all([
      supabaseAdmin.from('trades').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('trades').select('*', { count: 'exact', head: true }).eq('result', 'win'),
      supabaseAdmin.from('trades').select('*', { count: 'exact', head: true }).eq('result', 'loss'),
      supabaseAdmin.from('trades').select('amount'),
      supabaseAdmin.from('trades').select('profit').eq('result', 'win'),
    ]);

    const totalTrades = totalTradesRes.count || 0;
    const winningTrades = winningTradesRes.count || 0;
    const losingTrades = losingTradesRes.count || 0;
    const totalStaked = (allTradesAmountRes.data || []).reduce(
      (sum: number, r: Record<string, unknown>) => sum + Number(r.amount),
      0
    );
    const totalProfitPaid = (winningTradesProfitRes.data || []).reduce(
      (sum: number, r: Record<string, unknown>) => sum + Number(r.profit),
      0
    );

    // Daily registrations for last 30 days — fetch all and group in JS
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentUsers } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo);

    const registrationByDate: Record<string, number> = {};
    for (const u of recentUsers || []) {
      const row = u as Record<string, unknown>;
      const dateKey = new Date(row.created_at as string).toISOString().split('T')[0];
      registrationByDate[dateKey] = (registrationByDate[dateKey] || 0) + 1;
    }

    // Pending task submissions
    const { count: pendingSubmissions } = await supabaseAdmin
      .from('task_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Activation codes stats
    const [unusedCodesRes, usedCodesRes] = await Promise.all([
      supabaseAdmin.from('activation_codes').select('*', { count: 'exact', head: true }).eq('status', 'unused'),
      supabaseAdmin.from('activation_codes').select('*', { count: 'exact', head: true }).eq('status', 'used'),
    ]);

    const unusedCodes = unusedCodesRes.count || 0;
    const usedCodes = usedCodesRes.count || 0;

    // Deposit codes stats
    const [unusedDepositCodesRes, usedDepositCodesRes] = await Promise.all([
      supabaseAdmin.from('deposit_codes').select('*', { count: 'exact', head: true }).eq('status', 'unused'),
      supabaseAdmin.from('deposit_codes').select('*', { count: 'exact', head: true }).eq('status', 'used'),
    ]);

    const unusedDepositCodes = unusedDepositCodesRes.count || 0;
    const usedDepositCodes = usedDepositCodesRes.count || 0;

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
        pendingCount,
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
        pendingSubmissions: pendingSubmissions || 0,
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
