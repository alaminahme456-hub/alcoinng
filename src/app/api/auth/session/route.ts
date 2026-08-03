import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = {
      id: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      email: user.email!,
      phone: profile.phone,
      role: profile.role,
      isActivated: profile.is_activated,
      activatedAt: profile.activated_at,
      referralCode: profile.referral_code,
      profilePicture: profile.profile_picture,
      bankName: profile.bank_name,
      bankAccount: profile.bank_account,
      bankAccountName: profile.bank_account_name,
      createdAt: profile.created_at,
    };

    return NextResponse.json({ user: userData });
  } catch (error: unknown) {
    console.error('Session error:', error);
    const message = error instanceof Error ? error.message : 'Session check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
