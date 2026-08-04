import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog, insertNotification } from '@/lib/db';
import { requireAdmin, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('withdrawals')
      .select(`
        *,
        profiles!withdrawals_user_id_fkey(full_name, username, phone, bank_name, bank_account, bank_account_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);

    const withdrawals = (rows || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      wallet: row.wallet,
      amount: Number(row.amount),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        fullName: row.profiles?.full_name || '',
        username: row.profiles?.username || '',
        phone: row.profiles?.phone || '',
        bankName: row.profiles?.bank_name || '',
        bankAccount: row.profiles?.bank_account || '',
        bankAccountName: row.profiles?.bank_account_name || '',
      },
    }));

    // Totals
    const { data: pendingSum } = await supabaseAdmin
      .from('withdrawals')
      .select('amount')
      .eq('status', 'pending');
    const pendingTotal = (pendingSum || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    const { data: paidSum } = await supabaseAdmin
      .from('withdrawals')
      .select('amount')
      .eq('status', 'paid');
    const paidTotal = (paidSum || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    return NextResponse.json({
      withdrawals,
      pendingTotal,
      paidTotal,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin withdrawals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch withdrawals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { withdrawalId, action } = await req.json();
    if (!withdrawalId || !action) {
      return NextResponse.json({ error: 'Withdrawal ID and action are required' }, { status: 400 });
    }
    if (!['approve', 'reject', 'pay'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve, reject, or pay' }, { status: 400 });
    }

    const { data: withdrawal, error: fetchError } = await supabaseAdmin
      .from('withdrawals')
      .select(`*, profiles!withdrawals_user_id_fkey(username)`)
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

    const username = withdrawal.profiles?.username || 'unknown';
    const amount = Number(withdrawal.amount);

    if (action === 'approve') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending withdrawals can be approved' }, { status: 400 });
      }
      await supabaseAdmin.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawalId);
      await insertNotification(
        withdrawal.user_id,
        'Withdrawal Approved',
        `Your withdrawal of ₦${amount.toLocaleString()} has been approved and will be processed shortly.`,
        'withdrawal'
      );
    } else if (action === 'reject') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending withdrawals can be rejected' }, { status: 400 });
      }
      await supabaseAdmin.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);

      // Refund to wallet
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', withdrawal.user_id)
        .eq('type', withdrawal.wallet)
        .single();
      if (wallet) {
        await supabaseAdmin.from('wallets').update({
          balance: Number(wallet.balance) + amount,
        }).eq('id', wallet.id);
      }

      await insertNotification(
        withdrawal.user_id,
        'Withdrawal Rejected',
        `Your withdrawal of ₦${amount.toLocaleString()} was rejected. The amount has been refunded to your ${withdrawal.wallet} wallet.`,
        'withdrawal'
      );
    } else if (action === 'pay') {
      if (withdrawal.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved withdrawals can be marked as paid' }, { status: 400 });
      }
      await supabaseAdmin.from('withdrawals').update({ status: 'paid' }).eq('id', withdrawalId);
      await insertNotification(
        withdrawal.user_id,
        'Withdrawal Paid ✓',
        `Your withdrawal of ₦${amount.toLocaleString()} has been paid to your bank account.`,
        'withdrawal'
      );
    }

    await insertAuditLog(
      admin.id,
      `WITHDRAWAL_${action.toUpperCase()}`,
      `${action}d withdrawal ${withdrawalId} of ₦${amount.toLocaleString()} for ${username}`
    );

    // Fetch updated withdrawal
    const { data: updated } = await supabaseAdmin
      .from('withdrawals')
      .select(`*, profiles!withdrawals_user_id_fkey(full_name, username, phone, bank_name, bank_account, bank_account_name)`)
      .eq('id', withdrawalId)
      .single();

    return NextResponse.json({ withdrawal: updated, message: `Withdrawal ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Admin process withdrawal error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process withdrawal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
