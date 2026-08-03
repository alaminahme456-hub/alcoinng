import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: referrals } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username, is_activated, created_at')
      .eq('referred_by', auth.user.id)
      .order('created_at', { ascending: false });

    const totalReferrals = (referrals || []).length;
    const activeReferrals = (referrals || []).filter((r) => r.is_activated).length;

    return NextResponse.json({
      referralCode: auth.profile.referral_code,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL || ''}/register?ref=${auth.profile.referral_code}`,
      totalReferrals,
      activeReferrals,
      referralEarnings: 0,
      referrals: (referrals || []).map(r => ({
        id: r.id,
        fullName: r.full_name,
        username: r.username,
        isActivated: r.is_activated,
        createdAt: r.created_at,
      })),
    });
  } catch (error: unknown) {
    console.error('Referral error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch referral data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
