import { NextRequest, NextResponse } from 'next/server';
import { getDB, insertAuditLog } from '@/lib/db';
import { getAuthAdmin } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const admin = getAuthAdmin(token || '');
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const db = getDB();

    // Count total referred users
    const countRow = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE referred_by IS NOT NULL")
      .get() as { count: number };
    const total = countRow?.count || 0;

    // Fetch paginated referred users
    const rows = db
      .prepare(
        `SELECT id, full_name, username, email, phone, is_activated, referred_by, created_at
         FROM users WHERE referred_by IS NOT NULL
         ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(limit, offset) as Array<Record<string, unknown>>;

    // For each referred user, fetch the referrer's info
    const referrals = rows.map((row) => {
      const referrer = db
        .prepare(
          'SELECT id, full_name, username, referral_code FROM users WHERE id = ?'
        )
        .get(row.referred_by) as Record<string, unknown> | undefined;

      return {
        id: row.id,
        fullName: row.full_name,
        username: row.username,
        email: row.email,
        phone: row.phone,
        isActivated: Boolean(row.is_activated),
        referredBy: row.referred_by,
        createdAt: row.created_at,
        referredByUser: referrer
          ? {
              id: referrer.id,
              fullName: referrer.full_name,
              username: referrer.username,
              referralCode: referrer.referral_code,
            }
          : null,
      };
    });

    // Top 10 referrers by referral count
    const topReferrerRows = db
      .prepare(
        `SELECT referred_by, COUNT(*) as count
         FROM users WHERE referred_by IS NOT NULL
         GROUP BY referred_by ORDER BY count DESC LIMIT 10`
      )
      .all() as Array<{ referred_by: string; count: number }>;

    const topReferrers = topReferrerRows.map((r) => {
      const profile = db
        .prepare(
          'SELECT id, full_name, username, referral_code FROM users WHERE id = ?'
        )
        .get(r.referred_by) as Record<string, unknown> | undefined;

      return {
        id: r.referred_by,
        fullName: profile?.full_name || '',
        username: profile?.username || '',
        referralCode: profile?.referral_code || '',
        _count: { referralsMade: r.count },
      };
    });

    // Stats
    const totalReferralUsers = total;

    const activeRow = db
      .prepare(
        "SELECT COUNT(*) as count FROM users WHERE referred_by IS NOT NULL AND is_activated = 1"
      )
      .get() as { count: number };
    const activeReferralUsers = activeRow?.count || 0;

    const conversionRate =
      totalReferralUsers > 0
        ? Math.round((activeReferralUsers / totalReferralUsers) * 100)
        : 0;

    return NextResponse.json({
      referrals,
      topReferrers,
      stats: {
        totalReferralUsers,
        activeReferralUsers,
        conversionRate,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Admin referrals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch referrals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
