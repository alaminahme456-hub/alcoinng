import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthAdmin } from '@/lib/supabase/helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('withdrawals')
      .select('*, profiles!withdrawals_user_id_fkey(full_name, username, email, phone, bank_name, bank_account, bank_account_name)', { count: 'exact' });

    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: rows, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;
    const total = count || 0;

    // Flatten user data into the withdrawal object to match old Prisma include shape
    const withdrawals = (rows || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      userId: row.user_id,
      wallet: row.wallet,
      amount: Number(row.amount),
      status: row.status,
      bankName: row.bank_name,
      bankAccount: row.bank_account,
      bankAccountName: row.bank_account_name,
      processedAt: row.processed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: row.profiles
        ? {
            id: (row.profiles as Record<string, unknown>).id,
            fullName: (row.profiles as Record<string, unknown>).full_name,
            username: (row.profiles as Record<string, unknown>).username,
            email: (row.profiles as Record<string, unknown>).email || '',
            phone: (row.profiles as Record<string, unknown>).phone,
            bankName: (row.profiles as Record<string, unknown>).bank_name,
            bankAccount: (row.profiles as Record<string, unknown>).bank_account,
            bankAccountName: (row.profiles as Record<string, unknown>).bank_account_name,
          }
        : null,
    }));

    // Calculate totals
    const { data: pendingRows } = await supabaseAdmin
      .from('withdrawals')
      .select('amount')
      .eq('status', 'pending');

    const { data: paidRows } = await supabaseAdmin
      .from('withdrawals')
      .select('amount')
      .eq('status', 'paid');

    const pendingTotal = (pendingRows || []).reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.amount), 0);
    const paidTotal = (paidRows || []).reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.amount), 0);

    return NextResponse.json({
      withdrawals,
      pendingTotal,
      paidTotal,
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
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { withdrawalId, action } = await req.json();
    if (!withdrawalId || !action) {
      return NextResponse.json({ error: 'Withdrawal ID and action are required' }, { status: 400 });
    }

    if (!['approve', 'reject', 'pay'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve, reject, or pay' }, { status: 400 });
    }

    // Fetch the withdrawal with the user profile
    const { data: withdrawal, error: fetchError } = await supabaseAdmin
      .from('withdrawals')
      .select('*, profiles(username)')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'approved') {
      return NextResponse.json(
        { error: `Withdrawal is ${withdrawal.status}, cannot ${action}` },
        { status: 400 }
      );
    }

    const profile = withdrawal.profiles as Record<string, unknown> | null;
    const username = profile?.username || 'unknown';

    if (action === 'approve') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending withdrawals can be approved' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('withdrawals')
        .update({ status: 'approved' })
        .eq('id', withdrawalId);

      if (error) throw error;

      await supabaseAdmin.from('notifications').insert({
        user_id: withdrawal.user_id,
        title: 'Withdrawal Approved',
        message: `Your withdrawal of ₦${Number(withdrawal.amount).toLocaleString()} has been approved and will be processed shortly.`,
        type: 'withdrawal',
      });
    } else if (action === 'reject') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending withdrawals can be rejected' }, { status: 400 });
      }

      // Update withdrawal status
      const { error: updateError } = await supabaseAdmin
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // Refund to wallet: find the wallet and increment balance
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('id, balance')
        .eq('user_id', withdrawal.user_id)
        .eq('type', withdrawal.wallet)
        .single();

      if (wallet) {
        await supabaseAdmin
          .from('wallets')
          .update({ balance: Number(wallet.balance) + Number(withdrawal.amount) })
          .eq('id', wallet.id);
      }

      await supabaseAdmin.from('notifications').insert({
        user_id: withdrawal.user_id,
        title: 'Withdrawal Rejected',
        message: `Your withdrawal of ₦${Number(withdrawal.amount).toLocaleString()} was rejected. The amount has been refunded to your ${withdrawal.wallet} wallet.`,
        type: 'withdrawal',
      });
    } else if (action === 'pay') {
      if (withdrawal.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved withdrawals can be marked as paid' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('withdrawals')
        .update({ status: 'paid' })
        .eq('id', withdrawalId);

      if (error) throw error;

      await supabaseAdmin.from('notifications').insert({
        user_id: withdrawal.user_id,
        title: 'Withdrawal Paid ✅',
        message: `Your withdrawal of ₦${Number(withdrawal.amount).toLocaleString()} has been paid to your bank account.`,
        type: 'withdrawal',
      });
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: `WITHDRAWAL_${action.toUpperCase()}`,
      details: `${action}d withdrawal ${withdrawalId} of ₦${Number(withdrawal.amount).toLocaleString()} for ${username}`,
    });

    // Fetch updated withdrawal
    const { data: updated } = await supabaseAdmin
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    return NextResponse.json({ withdrawal: updated, message: `Withdrawal ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Admin process withdrawal error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process withdrawal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
