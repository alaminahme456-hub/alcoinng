import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, insertAuditLog } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { loginId, password } = await req.json();

    if (!loginId || !password) {
      return NextResponse.json({ error: 'Login ID and password are required' }, { status: 400 });
    }

    // Find user by email or username from profiles table
    let profileRow: Record<string, unknown> | null = null;

    if (loginId.includes('@')) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', loginId.toLowerCase())
        .single();
      profileRow = data;
    } else {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('username', loginId)
        .single();
      profileRow = data;
    }

    if (!profileRow || !profileRow.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password using bcrypt
    const valid = await verifyPassword(password, profileRow.password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Audit log
    await insertAuditLog(profileRow.id as string, 'user.login', 'Logged in');

    // Sign custom JWT
    const token = await signToken({
      id: profileRow.id as string,
      email: (profileRow.email as string) || '',
      role: (profileRow.role as string) || 'user',
    });

    return NextResponse.json({
      user: mapProfileRow(profileRow),
      token,
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
