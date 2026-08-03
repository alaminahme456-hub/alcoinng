import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Activation code is required' }, { status: 400 });
    }

    if (auth.profile.is_activated) {
      return NextResponse.json({ error: 'Account is already activated' }, { status: 400 });
    }

    const { data: activationCode } = await supabaseAdmin
      .from('activation_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (!activationCode) {
      return NextResponse.json({ error: 'Invalid activation code' }, { status: 404 });
    }

    if (activationCode.status !== 'unused') {
      return NextResponse.json({ error: 'Activation code has already been used' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update profile and code in a single RPC-like flow
    await supabaseAdmin.from('profiles').update({
      is_activated: true,
      activated_at: now,
      activation_code_id: activationCode.id,
    }).eq('id', auth.user.id);

    await supabaseAdmin.from('activation_codes').update({
      status: 'used',
      redeemed_by: auth.user.id,
      redeemed_at: now,
    }).eq('id', activationCode.id);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'ACTIVATE_ACCOUNT',
      details: `Activated with code ${activationCode.code}`,
    });

    return NextResponse.json({ message: 'Account activated successfully' });
  } catch (error: unknown) {
    console.error('Activation error:', error);
    const message = error instanceof Error ? error.message : 'Activation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
