import { supabaseAdmin } from './supabase/admin';
import { mapProfileRow } from './db';

// ============================================================
// Auth helpers for API routes
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  profile: ReturnType<typeof mapProfileRow>;
}

export async function getAuthUser(token: string): Promise<AuthUser | null> {
  try {
    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      id: user.id,
      email: user.email || '',
      role: profile.role as string,
      profile: mapProfileRow({ ...profile, email: user.email }),
    };
  } catch {
    return null;
  }
}

export async function getAuthAdmin(token: string): Promise<AuthUser | null> {
  const auth = await getAuthUser(token);
  if (!auth || auth.role !== 'admin') return null;
  return auth;
}

// ============================================================
// OTP helpers
// ============================================================

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeOTP(userId: string): Promise<string> {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from('profiles')
    .update({ otp_code: otp, otp_expires_at: expiresAt })
    .eq('id', userId);
  return otp;
}

export async function verifyOTP(userId: string, code: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('otp_code, otp_expires_at')
    .eq('id', userId)
    .single();

  if (!profile || !profile.otp_code) return false;
  if (new Date(profile.otp_expires_at) < new Date()) return false;
  if (profile.otp_code !== code) return false;

  await supabaseAdmin
    .from('profiles')
    .update({ otp_code: null, otp_expires_at: null, email_verified: true })
    .eq('id', userId);

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
