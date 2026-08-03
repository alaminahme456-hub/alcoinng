import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

// Anon client for auth operations (server-side, cookie-less)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, username, loginId, password } = await req.json();
    const loginEmail = email || loginId;
    const loginUsername = username || loginId;

    if ((!loginEmail && !loginUsername) || !password) {
      return NextResponse.json({ error: 'Email/username and password are required' }, { status: 400 });
    }

    let signInEmail = loginEmail;

    // If logging in with username, look up the email
    if (!signInEmail && loginUsername) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', loginUsername)
        .single();
      if (!profile) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      signInEmail = userData.user?.email;
      if (!signInEmail) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: signInEmail!,
      password,
    });

    if (error) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const user = {
      id: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      email: data.user.email!,
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

    return NextResponse.json({ user, token: data.session.access_token });
  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
