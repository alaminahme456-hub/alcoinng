import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getDB, mapProfileRow } from './db';

// ============================================================
// JWT helpers
// ============================================================

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: { userId: string; role: string; email: string }): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJWTSecret());
}

export async function verifyToken(token: string): Promise<{ userId: string; role: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Password helpers
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================
// Auth helpers for API routes (replaces getAuthUser / getAuthAdmin)
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  profile: ReturnType<typeof mapProfileRow>;
}

export function getAuthUser(token: string): AuthUser | null {
  const payload = verifyTokenSync(token);
  if (!payload) return null;

  const db = getDB();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: row.id as string,
    email: row.email as string,
    role: row.role as string,
    profile: mapProfileRow(row),
  };
}

export function getAuthAdmin(token: string): AuthUser | null {
  const auth = getAuthUser(token);
  if (!auth || auth.role !== 'admin') return null;
  return auth;
}

// Synchronous JWT verify
function verifyTokenSync(token: string): { userId: string; role: string; email: string } | null {
  try {
    const secret = getJWTSecret();
    const { payload } = jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

// ============================================================
// OTP helpers
// ============================================================

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(db: ReturnType<typeof getDB>, userId: string): string {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
  db.prepare('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?').run(otp, expiresAt, userId);
  return otp;
}

export function verifyOTP(db: ReturnType<typeof getDB>, userId: string, code: string): boolean {
  const row = db.prepare('SELECT otp_code, otp_expires_at FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;
  if (!row || !row.otp_code) return false;
  if (new Date(row.otp_expires_at as string) < new Date()) return false;
  if (row.otp_code !== code) return false;
  // Clear OTP and mark verified
  db.prepare('UPDATE users SET otp_code = NULL, otp_expires_at = NULL, email_verified = 1, updated_at = datetime(\'now\') WHERE id = ?').run(userId);
  return true;
}

// ============================================================
// Utility functions (existing)
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
