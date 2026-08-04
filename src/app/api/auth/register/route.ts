import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, ensureWallets, insertAuditLog } from '@/lib/db';
import { storeOTP, generateReferralCode } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { fullName, username, email, phone, password, referralCode } = await req.json();

    if (!fullName || !username || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check username uniqueness
    const { data: existingUsername } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Check email uniqueness via auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      filters: { email: email.toLowerCase() },
      perPage: 1,
    });
    if (existingUsers && existingUsers.users.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
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
    let codeExists = true;
    while (codeExists) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('referral_code', finalReferralCode)
        .single();
      codeExists = !!data;
      if (codeExists) finalReferralCode = generateReferralCode();
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, username, phone },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create account' }, { status: 500 });
    }

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      full_name: fullName,
      username,
      phone,
      referral_code: finalReferralCode,
      referred_by: referrerId || null,
      email_verified: false,
    });

    if (profileError) {
 // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Create wallets
    await ensureWallets(userId);

    // Generate and store OTP
    const otpCode = await storeOTP(userId);

    // Audit log
    await insertAuditLog(userId, 'user.registered', `Registered as @${username}`);

    // Fetch the created profile for response
    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      user: mapProfileRow({ ...profileRow, email }),
      token: null,
      requiresOtp: true,
      otp: otpCode,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
