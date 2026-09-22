import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

const ALC_FORMAT = /^ALC[0-9]{3}$/;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { code } = await req.json();
    const rawCode = (code || '').trim().toUpperCase();

    if (!rawCode) {
      return NextResponse.json(
        { error: 'Activation code is required' },
        { status: 400 },
      );
    }

    // 1. Validate format
    if (!ALC_FORMAT.test(rawCode)) {
      return NextResponse.json(
        { error: 'Enter a valid ALCOIN activation code, for example ALC001.' },
        { status: 400 },
      );
    }

    // Already activated?
    if (auth.profile.isActivated) {
      return NextResponse.json(
        { error: 'Account is already activated' },
        { status: 400 },
      );
    }

    // 2. Look up the code
    const { data: activationCode, error: codeError } = await supabaseAdmin
      .from('activation_codes')
      .select('*')
      .eq('code', rawCode)
      .single();

    // Code doesn't exist
    if (codeError || !activationCode) {
      return NextResponse.json(
        { error: 'Invalid activation code.' },
        { status: 404 },
      );
    }

    // 3. Check status
    if (activationCode.status === 'used') {
      return NextResponse.json(
        { error: 'This activation code has already been used.' },
        { status: 400 },
      );
    }

    if (activationCode.status === 'disabled') {
      return NextResponse.json(
        { error: 'This activation code is no longer active.' },
        { status: 400 },
      );
    }

    if (activationCode.status !== 'unused') {
      return NextResponse.json(
        { error: 'This activation code cannot be used.' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    // Activation is permanent. No expiry date is stored or enforced.


    // 4. Activate the user's account
    await supabaseAdmin.from('profiles').update({
      is_activated: true,
      activated_at: now,
      activation_code_id: activationCode.id,
    }).eq('id', auth.id);

    // 4b. Referral milestone:
    // Invite 10 people who sign up, and have at least 2 of those 10 activate.
    // The referrer receives a one-time ₦2,000 Reward Wallet bonus.
    const { data: referrer } = await supabaseAdmin
      .from('profiles')
      .select('id, referral_reward_claimed')
      .eq('id', auth.profile.referredBy || '')
      .maybeSingle();

    if (referrer && !referrer.referral_reward_claimed) {
      const { count: referralCount } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by', referrer.id);

      const { count: activeReferralCount } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by', referrer.id)
        .eq('is_activated', true);

      if ((referralCount || 0) >= 10 && (activeReferralCount || 0) >= 2) {
        // Conditional update makes the milestone claim one-time even if
        // two referred users activate at nearly the same time.
        const { data: claimed } = await supabaseAdmin
          .from('profiles')
          .update({ referral_reward_claimed: true })
          .eq('id', referrer.id)
          .eq('referral_reward_claimed', false)
          .select('id')
          .maybeSingle();

        if (claimed) {
          const { data: rewardWallet } = await supabaseAdmin
            .from('wallets')
            .select('id, balance')
            .eq('user_id', referrer.id)
            .eq('type', 'reward')
            .maybeSingle();

          if (rewardWallet) {
            await supabaseAdmin
              .from('wallets')
              .update({ balance: Number(rewardWallet.balance) + 2000 })
              .eq('id', rewardWallet.id);

            await insertAuditLog(
              referrer.id,
              'REFERRAL_MILESTONE_REWARD',
              'Received ₦2,000 for referring 10 users with at least 2 activated accounts.',
            );

            await supabaseAdmin.from('notifications').insert({
              user_id: referrer.id,
              title: 'Referral Reward Unlocked!',
              message: 'You invited 10 people and 2 of them activated their accounts. ₦2,000 has been credited to your Reward Wallet.',
              type: 'reward',
            });
          } else {
            // Do not permanently consume the milestone if the wallet is missing.
            await supabaseAdmin
              .from('profiles')
              .update({ referral_reward_claimed: false })
              .eq('id', referrer.id);
          }
        }
      }
    }

    // 5. Mark the code as used
    await supabaseAdmin.from('activation_codes').update({
      status: 'used',
      redeemed_by: auth.id,
      redeemed_at: now,
    }).eq('id', activationCode.id);

    // 6. Record activation transaction in audit log
    await insertAuditLog(
      auth.id,
      'ACTIVATE_ACCOUNT',
      `Activated with code ${activationCode.code} (N5,000 activation)`,
    );

    // 7. Return updated profile
    const { data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', auth.id)
      .single();

    return NextResponse.json({
      message: 'Account Activated Successfully',
      user: updatedProfile,
    });
  } catch (error: unknown) {
    console.error('Activation error:', error);
    const message = error instanceof Error ? error.message : 'Activation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
