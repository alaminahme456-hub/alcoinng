import { NextRequest, NextResponse } from 'next/server';
import { getDB, mapProfileRow, ensureWallets, insertAuditLog } from '@/lib/db';
import { hashPassword, storeOTP, generateReferralCode } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { fullName, username, email, phone, password, referralCode } = await req.json();

    // Validate required fields
    if (!fullName || !username || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const db = getDB();

    // Check username uniqueness
    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Check email uniqueness
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Validate referral code if provided
    let referrerId: string | undefined;
    if (referralCode) {
      const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode) as Record<string, unknown> | undefined;
      if (!referrer) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
      }
      referrerId = referrer.id as string;
    }

    // Generate unique referral code
    let finalReferralCode = generateReferralCode();
    while (db.prepare('SELECT id FROM users WHERE referral_code = ?').get(finalReferralCode)) {
      finalReferralCode = generateReferralCode();
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, username, phone, referral_code, referred_by, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(userId, email, passwordHash, fullName, username, phone, finalReferralCode, referrerId ?? null);

    // Create wallets
    ensureWallets(db, userId);

    // Generate and store OTP
    const otpCode = storeOTP(db, userId);

    // Audit log
    insertAuditLog(db, userId, 'user.registered', `Registered as @${username}`);

    // Fetch the created user row for response
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;

    return NextResponse.json({
      user: mapProfileRow(userRow),
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
