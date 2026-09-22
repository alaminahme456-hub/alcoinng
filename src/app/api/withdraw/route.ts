import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog, insertNotification } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { wallet, amount, bankName, bankAccount, bankAccountName } = await req.json();
    if (!wallet || !amount) return NextResponse.json({ error: 'Wallet type and amount are required' }, { status: 400 });
    if (!['reward', 'deposit', 'profit'].includes(wallet)) return NextResponse.json({ error: 'Invalid wallet type' }, { status: 400 });

    const numAmount = Number(amount);
    if (numAmount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    if (!auth.profile.isActivated) return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    if (!bankName || !bankAccount || !bankAccountName) {
      return NextResponse.json({ error: 'Bank name, account number, and account name are required' }, { status: 400 });
    }

    // All withdrawals use the platform-wide minimum of ₦1,000.
    if (numAmount < 1000) {
      return NextResponse.json({ error: 'Minimum withdrawal amount is ₦1,000' }, { status: 400 });
    }

    // Check wallet balance
    const { data: walletRow } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.id)
      .eq('type', wallet)
      .single();

    if (!walletRow || Number(walletRow.balance) < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const { data: withdrawal } = await supabaseAdmin.from('withdrawals').insert({
      user_id: auth.id,
      wallet,
      amount: numAmount,
      bank_name: bankName,
      bank_account: bankAccount,
      bank_account_name: bankAccountName,
    }).select().single();

    // Deduct amount from wallet immediately
    await supabaseAdmin.from('wallets').update({
      balance: Number(walletRow.balance) - numAmount,
    }).eq('id', walletRow.id);

    await insertNotification(auth.id, 'Withdrawal Requested', `Your withdrawal of \u20a6${numAmount.toLocaleString()} from ${wallet} wallet is pending review.`, 'withdrawal');
    await insertAuditLog(auth.id, 'WITHDRAWAL_REQUEST', `Requested \u20a6${numAmount.toLocaleString()} from ${wallet} wallet`);

    return NextResponse.json({ withdrawal, message: 'Withdrawal request submitted' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Withdraw error:', error);
    const message = error instanceof Error ? error.message : 'Withdrawal failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('withdrawals')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: withdrawals, count, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({
      withdrawals: withdrawals || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Fetch withdrawals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch withdrawals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}