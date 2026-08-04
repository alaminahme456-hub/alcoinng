import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog, insertNotification, ensureWallets } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { adId } = await req.json();
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    if (!auth.profile.isActivated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    const { data: ad, error: adError } = await supabaseAdmin
      .from('ads')
      .select('*')
      .eq('id', adId)
      .single();

    if (adError || !ad || !ad.is_active) {
      return NextResponse.json({ error: 'Ad not found or inactive' }, { status: 404 });
    }

    // Check existing view
    const { data: existingView } = await supabaseAdmin
      .from('ad_views')
      .select('id')
      .eq('user_id', auth.id)
      .eq('ad_id', adId)
      .maybeSingle();

    if (existingView) {
      return NextResponse.json({ error: 'Ad already watched' }, { status: 400 });
    }

    // Create ad view
    await supabaseAdmin.from('ad_views').insert({
      user_id: auth.id,
      ad_id: adId,
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

    const newBalance = Number(wallet.balance) + Number(ad.reward);
    await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);

    await insertNotification(auth.id, 'Ad Reward', `You earned \u20a6${Number(ad.reward).toLocaleString()} for watching an ad.`, 'reward');
    await insertAuditLog(auth.id, 'WATCH_AD', `Watched ad '${ad.title}', earned \u20a6${Number(ad.reward).toLocaleString()}`);

    return NextResponse.json({
      message: 'Ad watched successfully',
      reward: Number(ad.reward),
      newBalance,
    });
  } catch (error: unknown) {
    console.error('Watch ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to watch ad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
