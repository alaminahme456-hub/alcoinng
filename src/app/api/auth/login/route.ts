import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, insertAuditLog } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { loginId, password } = await req.json();

    if (!loginId || !password) {
      return NextResponse.json({ error: 'Login ID and password are required' }, { status: 400 });
    }

    // Find user by email or username
    let targetUser;

    if (loginId.includes('@')) {
      // Search by email via auth.users
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
        filters: { email: loginId.toLowerCase() },
        perPage: 1,
      });
      targetUser = authUsers?.users[0];
    } else {
      // Search by username via profiles, then get auth user
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', loginId)
        .single();

      if (profile) {
        const { data: userById } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        targetUser = userById?.user;
      }
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Auto-confirm email if not confirmed (handles users stuck from previous email_confirm: false)
    if (!targetUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      });
    }

    // Verify password by signing in
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: targetUser.email!,
      password,
    });

    if (signInError || !signInData.session) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Fetch profile
    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetUser.id)
      .single();

    if (!profileRow) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Audit log
    await insertAuditLog(targetUser.id, 'user.login', 'Logged in');

    return NextResponse.json({
      user: mapProfileRow({ ...profileRow, email: targetUser.email }),
      token: signInData.session.access_token,
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
