import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { generateReferralCode } from '@/lib/auth';

// Anon client for auth operations (server-side, cookie-less)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { fullName, username, email, phone, password, referralCode } = await req.json();

    if (!fullName || !username || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check for existing username
    const { data: existingUsername } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Validate referral code if provided
    let referrerId: string | undefined;
    if (referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      if (!referrer) {
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

    // Create user via admin API (bypasses email confirmation)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
        phone,
      },
    });

    if (createError || !userData.user) {
      const msg = createError?.message || 'Failed to create account';
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
      .eq('id', userData.user.id);

    if (updateError) {
      console.error('Profile update error after signup:', updateError);
    }

    // Fetch the created profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    // Generate a session token by signing in with anon client
    const { data: sessionData, error: sessionError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    const token = sessionData?.session?.access_token || null;

    if (sessionError) {
      console.error('Session generation error:', sessionError);
      // Return user without token — frontend can redirect to login
      const user = {
        id: profile.id,
        fullName: profile.full_name,
        username: profile.username,
        email: userData.user.email!,
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
      return NextResponse.json({ user, token: null }, { status: 201 });
    }

    const user = {
      id: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      email: userData.user.email!,
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

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (error: unknown) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
