import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, insertAuditLog } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { bankName, bankAccount, bankAccountName } = await req.json();

    if (!bankName || !bankAccount || !bankAccountName) {
      return NextResponse.json({ error: 'All bank fields are required' }, { status: 400 });
    }

    await supabaseAdmin.from('profiles').update({
      bank_name: bankName,
      bank_account: bankAccount,
      bank_account_name: bankAccountName,
    }).eq('id', auth.id);

    await insertAuditLog(auth.id, 'UPDATE_BANK_DETAILS', 'Updated bank details');

    const { data: row } = await supabaseAdmin.from('profiles').select('*').eq('id', auth.id).single();
    const user = mapProfileRow({ ...row, email: auth.email } as Record<string, unknown>);

    return NextResponse.json({ user, message: 'Bank details updated successfully' });
  } catch (error: unknown) {
    console.error('Update bank details error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update bank details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
