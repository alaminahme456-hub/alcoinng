import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthAdmin } from '@/lib/supabase/helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    // Get all users who were referred (referred_by is not null)
    // Join with the referrer profile
    let query = supabaseAdmin
      .from('profiles')
      .select('*, referrer:profiles!referred_by(id, full_name, username, referral_code)', { count: 'exact' })
      .not('referred_by', 'is', null);

    const { data: rows, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;
    const total = count || 0;

    const referrals = (rows || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      email: '',
      phone: row.phone,
      isActivated: row.is_activated,
      referredBy: row.referred_by,
      createdAt: row.created_at,
      referredByUser: row.referrer
        ? {
            id: (row.referrer as Record<string, unknown>).id,
            fullName: (row.referrer as Record<string, unknown>).full_name,
            username: (row.referrer as Record<string, unknown>).username,
            referralCode: (row.referrer as Record<string, unknown>).referral_code,
          }
        : null,
    }));

    // Top 10 referrers: fetch all profiles, group by referred_by in JS
    const { data: allReferred } = await supabaseAdmin
      .from('profiles')
      .select('referred_by')
      .not('referred_by', 'is', null);

    // Count referrals per referrer
    const referrerCounts: Record<string, number> = {};
    for (const r of allReferred || []) {
      const key = (r as Record<string, unknown>).referred_by as string;
      if (key) {
        referrerCounts[key] = (referrerCounts[key] || 0) + 1;
      }
    }

    // Get top 10 referrer IDs sorted by count desc
    const sortedReferrerIds = Object.entries(referrerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({ id, count }));

    // Fetch those referrer profiles
    const topReferrers: Array<Record<string, unknown>> = [];
    if (sortedReferrerIds.length > 0) {
      const { data: referrerProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, username, referral_code')
        .in(
          'id',
          sortedReferrerIds.map((r) => r.id)
        );

      if (referrerProfiles) {
        for (const profile of referrerProfiles) {
          const p = profile as Record<string, unknown>;
          const entry = sortedReferrerIds.find((r) => r.id === p.id);
          topReferrers.push({
            id: p.id as string,
            fullName: p.full_name as string,
            username: p.username as string,
            referralCode: p.referral_code as string,
            _count: { referralsMade: entry?.count || 0 },
          });
        }
      }
    }

    // Stats
    const { count: totalReferralUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('referred_by', 'is', null);

    const { count: activeReferralUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('referred_by', 'is', null)
      .eq('is_activated', true);

    return NextResponse.json({
      referrals,
      topReferrers,
      stats: {
        totalReferralUsers: totalReferralUsers || 0,
        activeReferralUsers: activeReferralUsers || 0,
        conversionRate:
          (totalReferralUsers || 0) > 0
            ? Math.round(((activeReferralUsers || 0) / (totalReferralUsers || 0)) * 100)
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
