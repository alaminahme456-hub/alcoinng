import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog, insertNotification, ensureWallets } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

const ADSENSE_AD_ID = 'adsense-vid1';
const ADSENSE_REWARD = 200;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    if (!auth.profile.isActivated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    // Check if already claimed today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingView } = await supabaseAdmin
      .from('ad_views')
      .select('id')
      .eq('user_id', auth.id)
      .eq('ad_id', ADSENSE_AD_ID)
      .gte('created_at', todayStart.toISOString())
      .maybeSingle();

    if (existingView) {
      return NextResponse.json({ error: 'Already claimed today. Come back tomorrow!' }, { status: 400 });
    }

    // Record the ad view
    await supabaseAdmin.from('ad_views').insert({
      user_id: auth.id,
      ad_id: ADSENSE_AD_ID,
      completed: true,
    });

    // Credit reward wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.id)
      .eq('type', 'reward')
      .single();

    if (!wallet) throw new Error('Reward wallet not found');

    const newBalance = Number(wallet.balance) + ADSENSE_REWARD;
    await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);

    await insertNotification(auth.id, 'Ad Reward', `You earned \u20a6${ADSENSE_REWARD.toLocaleString()} for watching a sponsored ad.`, 'reward');
    await insertAuditLog(auth.id, 'WATCH_AD', `Watched AdSense ad, earned \u20a6${ADSENSE_REWARD.toLocaleString()}`);

    return NextResponse.json({
      message: 'Reward claimed!',
      reward: ADSENSE_REWARD,
      newBalance,
    });
  } catch (error: unknown) {
    console.error('Claim adsense error:', error);
    const message = error instanceof Error ? error.message : 'Failed to claim reward';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
