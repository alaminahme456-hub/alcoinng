import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from './supabase/admin';
import { mapProfileRow } from './db';

// ============================================================
// Auth helpers for API routes — powered by Clerk
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  profile: ReturnType<typeof mapProfileRow>;
  clerkId: string;
}

/**
 * Get the authenticated user via Clerk session + Supabase profile.
 * Looks up profile by clerk_id column.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (!profile) return null;

    return {
      id: profile.id as string,
      email: profile.email || '',
      role: profile.role as string,
      clerkId: userId,
      profile: mapProfileRow(profile),
    };
  } catch {
    return null;
  }
}

/**
 * Get authenticated user — requires admin role.
 */
export async function getAuthAdmin(): Promise<AuthUser | null> {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== 'admin') return null;
  return authUser;
}

/**
 * Get the Clerk user object (email, name, etc.) from the current request.
 */
export async function getClerkUser() {
  try {
    return await currentUser();
  } catch {
    return null;
  }
}

// ============================================================
// OTP helpers (data-only, stored in profiles table)
// ============================================================

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeOTP(profileId: string): Promise<string> {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from('profiles')
    .update({ otp_code: otp, otp_expires_at: expiresAt })
    .eq('id', profileId);
  return otp;
}

export async function verifyOTP(profileId: string, code: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('otp_code, otp_expires_at')
    .eq('id', profileId)
    .single();

  if (!profile || !profile.otp_code) return false;
  if (new Date(profile.otp_expires_at) < new Date()) return false;
  if (profile.otp_code !== code) return false;

  await supabaseAdmin
    .from('profiles')
    .update({ otp_code: null, otp_expires_at: null, email_verified: true })
    .eq('id', profileId);

  return true;
}

// ============================================================
// Utility functions
// ============================================================

export function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'ALC-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function formatNaira(amount: number): string {
  return '\u20a6' + amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
