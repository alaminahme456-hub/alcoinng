import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase/admin';
import { mapProfileRow } from './db';

// ============================================================
// JWT Configuration
// ============================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'alcoin-default-secret-change-in-production'
);

const TOKEN_EXPIRY = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: { id: string; email: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ id: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

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
    const payload = await verifyToken(token);
    if (!payload) return null;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', payload.id)
      .single();

    if (!profile) return null;

    return {
      id: payload.id,
      email: profile.email || payload.email,
      role: profile.role as string,
      profile: mapProfileRow(profile),
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
// OTP helpers (data-only, no Supabase Auth)
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
