import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, ensureWallets, insertAuditLog } from '@/lib/db';
import { generateReferralCode, hashPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { fullName, username, email, phone, password, referralCode } = await req.json();

    if (!fullName || !username || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();

    // Check email uniqueness in profiles table
    const { data: existingEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', emailLower)
      .single();
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
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

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create profile with email and password_hash directly
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        full_name: fullName,
        username,
        email: emailLower,
        phone,
        password_hash: passwordHash,
        referral_code: finalReferralCode,
        referred_by: referrerId || null,
        email_verified: true,
      })
      .select('*')
      .single();

    if (profileError || !newProfile) {
      return NextResponse.json({ error: profileError?.message || 'Failed to create account' }, { status: 500 });
    }

    const userId = newProfile.id;

    // Create wallets
    await ensureWallets(userId);

    // Audit log
    await insertAuditLog(userId, 'user.registered', `Registered as @${username}`);

    // Sign custom JWT
    const token = await signToken({
      id: userId,
      email: emailLower,
      role: newProfile.role as string,
    });

    return NextResponse.json({
      user: mapProfileRow(newProfile),
      token,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
