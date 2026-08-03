import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, generateReferralCode } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { fullName, username, email, phone, password, referralCode } = await req.json();

    if (!fullName || !username || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check for existing user
    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const existingUsername = await db.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Validate referral code if provided
    if (referralCode) {
      const referrer = await db.user.findUnique({ where: { referralCode } });
      if (!referrer) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
      }
    }

    const hashedPassword = await hashPassword(password);
    const userReferralCode = generateReferralCode();

    // Ensure unique referral code
    let finalReferralCode = userReferralCode;
    let codeExists = await db.user.findUnique({ where: { referralCode: finalReferralCode } });
    while (codeExists) {
      finalReferralCode = generateReferralCode();
      codeExists = await db.user.findUnique({ where: { referralCode: finalReferralCode } });
    }

    const user = await db.user.create({
      data: {
        fullName,
        username,
        email,
        phone,
        password: hashedPassword,
        referralCode: finalReferralCode,
        referredBy: referralCode ? (await db.user.findUnique({ where: { referralCode } }))!.id : null,
      },
    });

    // Create 3 wallets
    await db.wallet.createMany({
      data: [
        { userId: user.id, type: 'reward' },
        { userId: user.id, type: 'deposit' },
        { userId: user.id, type: 'profit' },
      ],
    });

    const token = generateToken(user.id);

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      token,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
