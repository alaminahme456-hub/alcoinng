import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, insertAuditLog } from '@/lib/db';
import { verifyOTP, storeOTP } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // Find user by email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
      filters: { email: email.toLowerCase() },
      perPage: 1,
    });
    const user = authUsers?.users[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify OTP
    const verified = await verifyOTP(user.id, otp);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid or expired OTP. Please check and try again.' }, { status: 401 });
    }

    // Sign in to get a token
    let token: string;
    if (password) {
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });
      if (signInError || !signInData.session) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      token = signInData.session.access_token;
    } else {
      // Generate an admin token for the user
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email.toLowerCase(),
      });
      if (error || !data) {
        // Fallback: sign in if password was stored
        return NextResponse.json({ error: 'Please provide your password to complete verification' }, { status: 400 });
      }
      // Extract the token from the generated link
      const hashedToken = data.hashed_token;
      // For magic link, we need to verify the OTP that was sent
      // Instead, let's just create a session directly
      const { data: sessionData } = await supabaseAdmin.auth.admin.getUserById(user.id);
      // Use the user's existing session
      token = ''; // We'll need the password for proper auth
      return NextResponse.json({ error: 'Please provide your password to complete verification' }, { status: 400 });
    }

    // Audit log
    await insertAuditLog(user.id, 'user.email_verified', 'Email verified via OTP');

    // Fetch updated profile
    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ user: mapProfileRow({ ...profileRow, email: user.email }), token });
  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    const message = error instanceof Error ? error.message : 'OTP verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Resend OTP endpoint
export async function PUT(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
      filters: { email: email.toLowerCase() },
      perPage: 1,
    });
    const user = authUsers?.users[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate and store new OTP
    const otpCode = await storeOTP(user.id);

    // Audit log
    await insertAuditLog(user.id, 'user.otp_resent', 'OTP code resent');

    return NextResponse.json({ message: 'OTP resent successfully', otp: otpCode });
  } catch (error: unknown) {
    console.error('Resend OTP error:', error);
    const message = error instanceof Error ? error.message : 'Failed to resend OTP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
