import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { data: referrals, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username, is_activated, created_at')
      .eq('referred_by', auth.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const totalReferrals = referrals?.length || 0;
    const activeReferrals = referrals?.filter((r) => r.is_activated).length || 0;

    return NextResponse.json({
      referralCode: auth.profile.referralCode,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL || ''}/register?ref=${auth.profile.referralCode}`,
      totalReferrals,
      activeReferrals,
      referralEarnings: 0,
      referrals: (referrals || []).map(r => ({
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
