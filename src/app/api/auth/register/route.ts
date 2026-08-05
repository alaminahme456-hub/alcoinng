import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, ensureWallets, insertAuditLog } from '@/lib/db';
import { generateReferralCode } from '@/lib/auth';
import { auth, currentUser } from '@clerk/nextjs/server';

/**
 * POST /api/auth/register
 * Called after Clerk sign-up to create/update the Supabase profile.
 * Body: { username, phone, referralCode?, email, fullName? }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { username, phone, referralCode, email, fullName } = await req.json();

    if (!username || !phone) {
      return NextResponse.json({ error: 'Username and phone are required' }, { status: 400 });
    }

    // Get email/fullName from Clerk if not provided
    const clerkUser = await currentUser();
    const emailToUse = email || clerkUser?.emailAddresses?.[0]?.emailAddress || '';
    const fullNameToUse = fullName || clerkUser?.fullName || clerkUser?.firstName || '';

    if (!emailToUse) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if profile already exists for this Clerk user
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (existingProfile) {
      // Profile exists — return it
      return NextResponse.json({ user: mapProfileRow(existingProfile) }, { status: 200 });
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

    // Check email uniqueness
    const { data: existingEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', emailToUse.toLowerCase())
      .single();
    if (existingEmail) {
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

    // Create profile
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        full_name: fullNameToUse,
        username,
        email: emailToUse.toLowerCase(),
        phone,
        clerk_id: userId,
        referral_code: finalReferralCode,
        referred_by: referrerId || null,
        email_verified: true,
      })
      .select('*')
      .single();

    if (profileError || !newProfile) {
      return NextResponse.json({ error: profileError?.message || 'Failed to create profile' }, { status: 500 });
    }

    // Create wallets
    await ensureWallets(newProfile.id);

    // Audit log
    await insertAuditLog(newProfile.id, 'user.registered', `Registered as @${username}`);

    return NextResponse.json({ user: mapProfileRow(newProfile) }, { status: 201 });
  } catch (error: unknown) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
