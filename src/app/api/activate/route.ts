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
