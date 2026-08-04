import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateReferralCode } from '@/lib/auth';

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

    const { fullName, username, email, phone, password, referralCode } = await req.json();

    if (!fullName || !username || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check for existing username
    const { data: existingUsername, error: checkErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (checkErr && checkErr.code !== 'PGRST116') {
      console.error('Username check error:', checkErr);
      return NextResponse.json({ error: 'Failed to check username' }, { status: 500 });
    }
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Validate referral code if provided
    let referrerId: string | undefined;
    if (referralCode) {
      const { data: referrer, error: refErr } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      if (refErr || !referrer) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
      }
      referrerId = referrer.id;
    }

    // Generate unique referral code
    let finalReferralCode = generateReferralCode();
    let codeExists = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('referral_code', finalReferralCode)
      .single();
    while (codeExists) {
      finalReferralCode = generateReferralCode();
      codeExists = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('referral_code', finalReferralCode)
        .single();
    }

    // Sign up via anon client
    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          phone,
        },
      },
    });

    if (signUpError || !signUpData.user) {
      const msg = signUpError?.message || 'Failed to create account';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Update profile with correct referral code and referred_by
    const updateData: Record<string, unknown> = {
      referral_code: finalReferralCode,
      full_name: fullName,
      username,
      phone,
    };
    if (referrerId) updateData.referred_by = referrerId;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', signUpData.user.id);

    if (updateError) {
      console.error('Profile update error after signup:', updateError);
    }

    // Fetch the created profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', signUpData.user.id)
      .single();

    const user = {
      id: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      email: signUpData.user.email!,
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

    // signUp returns a session when email confirmation is off.
    // If no session (email confirmation is on), sign in to get a token.
    let token = signUpData.session?.access_token || null;
    if (!token) {
      const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        console.error('Auto sign-in after signup error:', signInError.message);
      } else {
        token = sessionData?.session?.access_token || null;
      }
    }

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (error: unknown) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
