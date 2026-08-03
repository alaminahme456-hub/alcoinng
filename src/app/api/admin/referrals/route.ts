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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    // Get all users who were referred
    const [referrals, total] = await Promise.all([
      db.user.findMany({
        where: { referredBy: { not: null } },
        include: {
          referredByUser: {
            select: {
              id: true,
              fullName: true,
              username: true,
              referralCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where: { referredBy: { not: null } } }),
    ]);

    // Top referrers
    const topReferrers = await db.user.findMany({
      where: {
        referralsMade: { some: {} },
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        referralCode: true,
        _count: {
          select: { referralsMade: true },
        },
      },
      orderBy: {
        referralsMade: { _count: 'desc' },
      },
      take: 10,
    });

    const totalReferralUsers = await db.user.count({
      where: { referredBy: { not: null } },
    });
    const activeReferralUsers = await db.user.count({
      where: { referredBy: { not: null }, isActivated: true },
    });

    return NextResponse.json({
      referrals,
      topReferrers,
      stats: {
        totalReferralUsers,
        activeReferralUsers,
        conversionRate: totalReferralUsers > 0
          ? Math.round((activeReferralUsers / totalReferralUsers) * 100)
          : 0,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin referrals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch referrals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
