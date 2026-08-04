import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAnon = getSupabaseAnon();
    if (!supabaseAnon) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { email, otp, password } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // Verify the OTP using Supabase auth
    const { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    if (verifyError) {
      console.error('OTP verification error:', verifyError.message);
      if (verifyError.message.includes('Token has expired') || verifyError.message.includes('expired')) {
        return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 410 });
      }
      if (verifyError.message.includes('Invalid') || verifyError.message.includes('invalid')) {
        return NextResponse.json({ error: 'Invalid OTP. Please check and try again.' }, { status: 401 });
      }
      return NextResponse.json({ error: verifyError.message || 'OTP verification failed' }, { status: 400 });
    }

    // After successful OTP verification, we should have a session
    let token = verifyData.session?.access_token || null;

    // If no session from verifyOtp, try signing in with credentials
    if (!token && password) {
      const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        console.error('Post-verify sign-in error:', signInError.message);
      } else {
        token = sessionData?.session?.access_token || null;
      }
    }

    if (!verifyData.user) {
      return NextResponse.json({ error: 'Verification succeeded but user not found' }, { status: 500 });
    }

    // Fetch the complete profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', verifyData.user.id)
      .single();

    const user = {
      id: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      email: verifyData.user.email!,
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

    return NextResponse.json({ user, token }, { status: 200 });
  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    const message = error instanceof Error ? error.message : 'OTP verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Resend OTP endpoint
export async function PUT(req: NextRequest) {
  try {
    const supabaseAnon = getSupabaseAnon();
    if (!supabaseAnon) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Resend the signup OTP
    const { error: resendError } = await supabaseAnon.auth.resend({
      type: 'signup',
      email,
    });

    if (resendError) {
      console.error('Resend OTP error:', resendError.message);
      return NextResponse.json({ error: resendError.message || 'Failed to resend OTP' }, { status: 400 });
    }

    return NextResponse.json({ message: 'OTP resent successfully' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Resend OTP error:', error);
    const message = error instanceof Error ? error.message : 'Failed to resend OTP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
