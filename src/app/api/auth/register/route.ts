import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateReferralCode } from '@/lib/auth';

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
    if (referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      if (!referrer) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
      }
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

    // Sign up with Supabase Auth (trigger creates profile + wallets)
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
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

    if (error) {
      if (error.message.includes('already registered')) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update profile with correct referral code and referred_by
    const updateData: Record<string, unknown> = {
      referral_code: finalReferralCode,
      full_name: fullName,
      username,
      phone,
    };
    if (referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      if (referrer) updateData.referred_by = referrer.id;
    }

    await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', data.user!.id);

    // Fetch the created profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user!.id)
      .single();

    const user = {
      id: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      email: data.user!.email!,
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

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || null;

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (error: unknown) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
