import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { adId } = await req.json();
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    if (!auth.profile.is_activated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    const { data: ad } = await supabaseAdmin
      .from('ads')
      .select('*')
      .eq('id', adId)
      .single();

    if (!ad || !ad.is_active) {
      return NextResponse.json({ error: 'Ad not found or inactive' }, { status: 404 });
    }

    // Check if already watched (UNIQUE constraint will also catch this)
    const { data: existingView } = await supabaseAdmin
      .from('ad_views')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('ad_id', adId)
      .single();

    if (existingView) {
      return NextResponse.json({ error: 'Ad already watched' }, { status: 400 });
    }

    // Create ad view
    await supabaseAdmin.from('ad_views').insert({
      user_id: auth.user.id,
      ad_id: adId,
      completed: true,
    });

    // Credit reward wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('type', 'reward')
      .single();

    if (!wallet) {
      return NextResponse.json({ error: 'Reward wallet not found' }, { status: 500 });
    }

    const newBalance = Number(wallet.balance) + Number(ad.reward);
    await supabaseAdmin.from('wallets').update({
      balance: newBalance,
    }).eq('id', wallet.id);

    await supabaseAdmin.from('notifications').insert({
      user_id: auth.user.id,
      title: 'Ad Reward',
      message: `You earned \u20a6${Number(ad.reward).toLocaleString()} for watching an ad.`,
      type: 'reward',
    });

    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'WATCH_AD',
      details: `Watched ad '${ad.title}', earned \u20a6${Number(ad.reward).toLocaleString()}`,
    });

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
