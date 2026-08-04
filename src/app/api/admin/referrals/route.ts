import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    // Count total referred users
    const { count: total, data: rows, error } = await supabaseAdmin
      .from('profiles')
      .select(`*, referrer:profiles!referred_by(id, full_name, username, referral_code)`, { count: 'exact' })
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);

    const referrals = (rows || []).map((row: any) => ({
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      email: '', // Not stored in profiles in Supabase
      phone: row.phone,
      isActivated: Boolean(row.is_activated),
      referredBy: row.referred_by,
      createdAt: row.created_at,
      referredByUser: row.referrer ? {
        id: row.referrer.id,
        fullName: row.referrer.full_name,
        username: row.referrer.username,
        referralCode: row.referrer.referral_code,
      } : null,
    }));

    // Top 10 referrers
    const { data: allReferred } = await supabaseAdmin
      .from('profiles')
      .select('referred_by')
      .not('referred_by', 'is', null);

    const referrerCounts: Record<string, number> = {};
    for (const r of allReferred || []) {
      if (r.referred_by) {
        referrerCounts[r.referred_by] = (referrerCounts[r.referred_by] || 0) + 1;
      }
    }

    const topEntries = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topReferrerIds = topEntries.map(e => e[0]);
    const { data: topProfiles } = topReferrerIds.length > 0
      ? await supabaseAdmin
          .from('profiles')
          .select('id, full_name, username, referral_code')
          .in('id', topReferrerIds)
      : { data: [] };

    const profileMap: Record<string, any> = {};
    for (const p of topProfiles || []) profileMap[p.id] = p;

    const topReferrers = topEntries.map(([id, count]) => ({
      id,
      fullName: profileMap[id]?.full_name || '',
      username: profileMap[id]?.username || '',
      referralCode: profileMap[id]?.referral_code || '',
      _count: { referralsMade: count },
    }));

    // Stats
    const { count: activeReferralUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('referred_by', 'is', null)
      .eq('is_activated', true);

    const conversionRate = (total || 0) > 0
      ? Math.round(((activeReferralUsers || 0) / (total || 0)) * 100)
      : 0;

    return NextResponse.json({
      referrals,
      topReferrers,
      stats: {
        totalReferralUsers: total || 0,
        activeReferralUsers: activeReferralUsers || 0,
        conversionRate,
      },
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Admin referrals error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch referrals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}