import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    // Users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: activatedUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_activated', true);

    const { count: pendingActivations } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_activated', false);

    // Wallets
    const { data: rewardRows } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('type', 'reward');
    const rewardBalance = (rewardRows || []).reduce((sum: number, r: any) => sum + Number(r.balance), 0);

    const { data: depositRows } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('type', 'deposit');
    const depositBalance = (depositRows || []).reduce((sum: number, r: any) => sum + Number(r.balance), 0);

    const { data: profitRows } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('type', 'profit');
    const profitBalance = (profitRows || []).reduce((sum: number, r: any) => sum + Number(r.balance), 0);

    // Deposits
    const { data: depositCodes } = await supabaseAdmin
      .from('deposit_codes')
      .select('amount')
      .eq('status', 'used');
    const totalDeposits = (depositCodes || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    // Withdrawals
    const { data: paidWds } = await supabaseAdmin
      .from('withdrawals')
      .select('amount')
      .eq('status', 'paid');
    const totalPaid = (paidWds || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    const { data: pendingWds } = await supabaseAdmin
      .from('withdrawals')
      .select('amount')
      .eq('status', 'pending');
    const pendingAmount = (pendingWds || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    const { count: pendingWdCount } = await supabaseAdmin
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Trades
    const { count: totalTrades } = await supabaseAdmin
      .from('trades')
      .select('*', { count: 'exact', head: true });

    const { count: winningTrades } = await supabaseAdmin
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('result', 'win');

    const { count: losingTrades } = await supabaseAdmin
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('result', 'loss');

    const { data: stakedRows } = await supabaseAdmin
      .from('trades')
      .select('amount');
    const totalStaked = (stakedRows || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    const { data: profitRows2 } = await supabaseAdmin
      .from('trades')
      .select('profit')
      .eq('result', 'win');
    const totalProfitPaid = (profitRows2 || []).reduce((sum: number, r: any) => sum + Number(r.profit), 0);

    // Tasks
    const { count: activeTasks } = await supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: pendingSubmissions } = await supabaseAdmin
      .from('task_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Ads
    const { count: activeAds } = await supabaseAdmin
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Activation codes
    const { count: unusedCodes } = await supabaseAdmin
      .from('activation_codes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unused');

    const { count: usedCodes } = await supabaseAdmin
      .from('activation_codes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'used');

    // Deposit codes
    const { count: unusedDepositCodes } = await supabaseAdmin
      .from('deposit_codes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unused');

    const { count: usedDepositCodes } = await supabaseAdmin
      .from('deposit_codes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'used');

    // Daily registrations — last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentUsers } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo);

    const registrationByDate: Record<string, number> = {};
    for (const u of recentUsers || []) {
      const dateKey = new Date(u.created_at).toISOString().split('T')[0];
      registrationByDate[dateKey] = (registrationByDate[dateKey] || 0) + 1;
    }

    return NextResponse.json({
      users: {
        total: totalUsers || 0,
        activated: activatedUsers || 0,
        pendingActivation: pendingActivations || 0,
      },
      deposits: {
        total: totalDeposits,
        unusedCodes: unusedCodes || 0,
        usedCodes: usedCodes || 0,
      },
      depositsCodes: {
        unused: unusedDepositCodes || 0,
        used: usedDepositCodes || 0,
      },
      withdrawals: {
        totalPaid,
        pendingAmount,
        pendingCount: pendingWdCount || 0,
      },
      wallets: { rewardBalance, depositBalance, profitBalance },
      trades: {
        total: totalTrades || 0,
        wins: winningTrades || 0,
        losses: losingTrades || 0,
        totalStaked,
        totalProfitPaid,
      },
      tasks: {
        active: activeTasks || 0,
        pendingSubmissions: pendingSubmissions || 0,
      },
      ads: { active: activeAds || 0 },
      dailyRegistrations: registrationByDate,
    });
  } catch (error: unknown) {
    console.error('Analytics error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}