import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog, insertNotification, ensureWallets } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Deposit code is required' }, { status: 400 });
    }

    if (!auth.profile.isActivated) {
      return NextResponse.json({ error: 'Account must be activated before depositing' }, { status: 403 });
    }

    const { data: depositCode, error: codeError } = await supabaseAdmin
      .from('deposit_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('status', 'unused')
      .single();

    if (codeError || !depositCode) {
      return NextResponse.json({ error: 'Invalid deposit code' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Mark code as used
    await supabaseAdmin.from('deposit_codes').update({
      status: 'used',
      redeemed_by: auth.id,
      redeemed_at: now,
    }).eq('id', depositCode.id);

    // Credit deposit wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.id)
      .eq('type', 'deposit')
      .single();

    if (!wallet) throw new Error('Deposit wallet not found');

    const newBalance = Number(wallet.balance) + Number(depositCode.amount);
    await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);

    await insertNotification(auth.id, 'Deposit Successful', `\u20a6${Number(depositCode.amount).toLocaleString()} has been credited to your deposit wallet.`, 'deposit');
    await insertAuditLog(auth.id, 'DEPOSIT', `Deposited \u20a6${Number(depositCode.amount).toLocaleString()} with code ${depositCode.code}`);

    return NextResponse.json({
      message: 'Deposit successful',
      amount: Number(depositCode.amount),
      newBalance,
    });
  } catch (error: unknown) {
    console.error('Deposit error:', error);
    const message = error instanceof Error ? error.message : 'Deposit failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
