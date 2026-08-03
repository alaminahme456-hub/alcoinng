import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    if (!auth.profile.is_activated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    if (!auth.profile.bank_name || !auth.profile.bank_account || !auth.profile.bank_account_name) {
      return NextResponse.json({ error: 'Please update your bank details before withdrawing' }, { status: 400 });
    }

    // Check minimum amounts for reward wallet
    if (wallet === 'reward') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: weeklyWithdrawals } = await supabaseAdmin
        .from('withdrawals')
        .select('amount')
        .eq('user_id', auth.user.id)
        .eq('wallet', 'reward')
        .gte('created_at', oneWeekAgo)
        .in('status', ['pending', 'approved', 'paid']);

      const weeklyTotal = (weeklyWithdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0);

      if (weeklyTotal === 0 && numAmount < 2000) {
        return NextResponse.json(
          { error: 'Minimum weekly withdrawal for reward wallet is \u20a62,000' },
          { status: 400 }
        );
      }

      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: monthlyWithdrawals } = await supabaseAdmin
        .from('withdrawals')
        .select('amount')
        .eq('user_id', auth.user.id)
        .eq('wallet', 'reward')
        .gte('created_at', oneMonthAgo)
        .in('status', ['pending', 'approved', 'paid']);

      const monthlyTotal = (monthlyWithdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0);

      if (monthlyTotal === 0 && numAmount < 8000) {
        return NextResponse.json(
          { error: 'Minimum monthly withdrawal for reward wallet is \u20a68,000' },
          { status: 400 }
        );
      }
    }

    // Check wallet balance
    const { data: walletRecord } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('type', wallet)
      .single();

    if (!walletRecord || Number(walletRecord.balance) < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Create withdrawal request
    const { data: withdrawal } = await supabaseAdmin
      .from('withdrawals')
      .insert({
        user_id: auth.user.id,
        wallet,
        amount: numAmount,
      })
      .select()
      .single();

    await supabaseAdmin.from('notifications').insert({
      user_id: auth.user.id,
      title: 'Withdrawal Requested',
      message: `Your withdrawal of \u20a6${numAmount.toLocaleString()} from ${wallet} wallet is pending review.`,
      type: 'withdrawal',
    });

    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'WITHDRAWAL_REQUEST',
      details: `Requested \u20a6${numAmount.toLocaleString()} from ${wallet} wallet`,
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
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('withdrawals')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: withdrawals, count } = await query;

    return NextResponse.json({
      withdrawals: withdrawals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Fetch withdrawals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch withdrawals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
