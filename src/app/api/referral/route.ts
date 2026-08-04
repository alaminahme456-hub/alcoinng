import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = getAuthUser(token!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const referrals = db.prepare(
      'SELECT id, full_name, username, is_activated, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC'
    ).all(auth.id) as Array<Record<string, unknown>>;

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter((r) => Boolean(r.is_activated)).length;

    return NextResponse.json({
      referralCode: auth.profile.referralCode,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL || ''}/register?ref=${auth.profile.referralCode}`,
      totalReferrals,
      activeReferrals,
      referralEarnings: 0,
      referrals: referrals.map(r => ({
        id: r.id,
        fullName: r.full_name,
        username: r.username,
        isActivated: Boolean(r.is_activated),
        createdAt: r.created_at,
      })),
    });
  } catch (error: unknown) {
    console.error('Referral error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch referral data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
