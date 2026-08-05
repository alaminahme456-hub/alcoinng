import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, insertAuditLog } from '@/lib/db';
import { verifyOTP, storeOTP, verifyPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp || !password) {
      return NextResponse.json({ error: 'Email, OTP, and password are required' }, { status: 400 });
    }

    // Find user by email in profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify password
    if (!profile.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const valid = await verifyPassword(password, profile.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify OTP
    const verified = await verifyOTP(profile.id, otp);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid or expired OTP. Please check and try again.' }, { status: 401 });
    }

    // Sign custom JWT
    const token = await signToken({
      id: profile.id,
      email: profile.email,
      role: profile.role,
    });

    // Audit log
    await insertAuditLog(profile.id, 'user.email_verified', 'Email verified via OTP');

    // Fetch updated profile
    const { data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single();

    return NextResponse.json({ user: mapProfileRow(updatedProfile!), token });
  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    const message = error instanceof Error ? error.message : 'OTP verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Resend OTP endpoint
export async function PUT(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email in profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate and store new OTP
    const otpCode = await storeOTP(profile.id);

    // Audit log
    await insertAuditLog(profile.id, 'user.otp_resent', 'OTP code resent');

    return NextResponse.json({ message: 'OTP resent successfully', otp: otpCode });
  } catch (error: unknown) {
    console.error('Resend OTP error:', error);
    const message = error instanceof Error ? error.message : 'Failed to resend OTP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
