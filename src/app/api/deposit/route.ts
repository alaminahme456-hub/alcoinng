import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Deposit code is required' }, { status: 400 });
    }

    if (!auth.profile.is_activated) {
      return NextResponse.json({ error: 'Account must be activated before depositing' }, { status: 403 });
    }

    const { data: depositCode } = await supabaseAdmin
      .from('deposit_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (!depositCode) {
      return NextResponse.json({ error: 'Invalid deposit code' }, { status: 404 });
    }

    if (depositCode.status !== 'unused') {
      return NextResponse.json({ error: 'Deposit code has already been used' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Mark code as used
    await supabaseAdmin.from('deposit_codes').update({
      status: 'used',
      redeemed_by: auth.user.id,
      redeemed_at: now,
    }).eq('id', depositCode.id);

    // Credit deposit wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('type', 'deposit')
      .single();

    if (!wallet) {
      return NextResponse.json({ error: 'Deposit wallet not found' }, { status: 500 });
    }

    const newBalance = Number(wallet.balance) + Number(depositCode.amount);
    await supabaseAdmin.from('wallets').update({
      balance: newBalance,
    }).eq('id', wallet.id);

    // Notification
    await supabaseAdmin.from('notifications').insert({
      user_id: auth.user.id,
      title: 'Deposit Successful',
      message: `\u20a6${Number(depositCode.amount).toLocaleString()} has been credited to your deposit wallet.`,
      type: 'deposit',
    });

    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'DEPOSIT',
      details: `Deposited \u20a6${Number(depositCode.amount).toLocaleString()} with code ${depositCode.code}`,
    });

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
