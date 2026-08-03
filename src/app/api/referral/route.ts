import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const referrals = await db.user.findMany({
      where: { referredBy: user.id },
      select: {
        id: true,
        fullName: true,
        username: true,
        isActivated: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter((r) => r.isActivated).length;

    // Calculate referral earnings (from trades made by referrals - simplified)
    // In a real system, this would track referral commissions
    const referralEarnings = 0;

    return NextResponse.json({
      referralCode: user.referralCode,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL || ''}/register?ref=${user.referralCode}`,
      totalReferrals,
      activeReferrals,
      referralEarnings,
      referrals,
    });
  } catch (error: unknown) {
    console.error('Referral error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch referral data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
