import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mapProfileRow } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = mapProfileRow({ ...auth.profile, email: auth.email });
    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fullName, phone, profilePicture, bankName, bankAccount, bankAccountName } = body;

    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (profilePicture !== undefined) updateData.profile_picture = profilePicture;
    if (bankName !== undefined) updateData.bank_name = bankName;
    if (bankAccount !== undefined) updateData.bank_account = bankAccount;
    if (bankAccountName !== undefined) updateData.bank_account_name = bankAccountName;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', auth.user.id);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'UPDATE_PROFILE',
      details: `Updated profile fields: ${Object.keys(updateData).join(', ')}`,
    });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .single();

    const user = mapProfileRow({ ...profile, email: auth.email });
    return NextResponse.json({ user, message: 'Profile updated successfully' });
  } catch (error: unknown) {
    console.error('Update profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
