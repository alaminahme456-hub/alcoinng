import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, insertAuditLog } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const user = mapProfileRow({ ...auth.profile, email: auth.email } as Record<string, unknown>);
    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const body = await req.json();
    const { fullName, phone, profilePicture, bankName, bankAccount, bankAccountName } = body;

    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (profilePicture !== undefined) updates.profile_picture = profilePicture;
    if (bankName !== undefined) updates.bank_name = bankName;
    if (bankAccount !== undefined) updates.bank_account = bankAccount;
    if (bankAccountName !== undefined) updates.bank_account_name = bankAccountName;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await supabaseAdmin.from('profiles').update(updates).eq('id', auth.id);
    await insertAuditLog(auth.id, 'UPDATE_PROFILE', `Updated profile fields: ${Object.keys(updates).join(', ')}`);

    const { data: row } = await supabaseAdmin.from('profiles').select('*').eq('id', auth.id).single();
    const user = mapProfileRow({ ...row, email: auth.email } as Record<string, unknown>);
    return NextResponse.json({ user, message: 'Profile updated successfully' });
  } catch (error: unknown) {
    console.error('Update profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
