import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin, isAuthUser } from '@/lib/req-helpers';

export const maxDuration = 30;

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!isAuthUser(admin)) return admin;

    // Run all independent queries in parallel for speed
    const [
      { count: totalUsers },
      { count: activatedUsers },
      { count: pendingActivations },
      { data: rewardRows },
      { data: depositRows },
      { data: profitRows },
      { data: depositCodes },
      { data: paidWds },
      { data: pendingWds },
      { count: pendingWdCount },
      { count: totalTrades },
      { count: winningTrades },
      { count: losingTrades },
      { data: stakedRows },
      { data: profitRows2 },
      { count: activeTasks },
      { count: pendingSubmissions },
      { count: activeAds },
      { count: unusedCodes },
      { count: usedCodes },
      { count: unusedDepositCodes },
      { count: usedDepositCodes },
      { data: recentUsers },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_activated', true),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_activated', false),
      supabaseAdmin.from('wallets').select('balance').eq('type', 'reward'),
      supabaseAdmin.from('wallets').select('balance').eq('type', 'deposit'),
      supabaseAdmin.from('wallets').select('balance').eq('type', 'profit'),
      supabaseAdmin.from('deposit_codes').select('amount').eq('status', 'used'),
      supabaseAdmin.from('withdrawals').select('amount').eq('status', 'paid'),
      supabaseAdmin.from('withdrawals').select('amount').eq('status', 'pending'),
      supabaseAdmin.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('trades').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('trades').select('*', { count: 'exact', head: true }).eq('result', 'win'),
      supabaseAdmin.from('trades').select('*', { count: 'exact', head: true }).eq('result', 'loss'),
      supabaseAdmin.from('trades').select('amount'),
      supabaseAdmin.from('trades').select('profit').eq('result', 'win'),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('task_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('ads').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('activation_codes').select('*', { count: 'exact', head: true }).eq('status', 'unused'),
      supabaseAdmin.from('activation_codes').select('*', { count: 'exact', head: true }).eq('status', 'used'),
      supabaseAdmin.from('deposit_codes').select('*', { count: 'exact', head: true }).eq('status', 'unused'),
      supabaseAdmin.from('deposit_codes').select('*', { count: 'exact', head: true }).eq('status', 'used'),
      supabaseAdmin.from('profiles').select('created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Aggregate sums
    const sumField = (rows: any[], field: string) =>
      (rows || []).reduce((s: number, r: any) => s + Number(r[field] || 0), 0);

    const totalDeposits = sumField(depositCodes, 'amount');
    const totalPaid = sumField(paidWds, 'amount');
    const pendingAmount = sumField(pendingWds, 'amount');
    const rewardBalance = sumField(rewardRows, 'balance');
    const depositBalance = sumField(depositRows, 'balance');
    const profitBalance = sumField(profitRows, 'balance');
    const totalStaked = sumField(stakedRows, 'amount');
    const totalProfitPaid = sumField(profitRows2, 'profit');

    // Daily registrations
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
        unusedCodes: unusedDepositCodes || 0,
        usedCodes: usedDepositCodes || 0,
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
