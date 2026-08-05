import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog } from '@/lib/db';
import { requireAuth, isAuthUser } from '@/lib/req-helpers';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthUser(auth)) return auth;

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Activation code is required' }, { status: 400 });
    if (auth.profile.isActivated) return NextResponse.json({ error: 'Account is already activated' }, { status: 400 });

    const { data: activationCode, error: codeError } = await supabaseAdmin
      .from('activation_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('status', 'unused')
      .single();

    if (codeError || !activationCode) return NextResponse.json({ error: 'Invalid activation code' }, { status: 404 });

    const now = new Date().toISOString();
    await supabaseAdmin.from('profiles').update({
      is_activated: true,
      activated_at: now,
      activation_code_id: activationCode.id,
    }).eq('id', auth.id);

    await supabaseAdmin.from('activation_codes').update({
      status: 'used',
      redeemed_by: auth.id,
      redeemed_at: now,
    }).eq('id', activationCode.id);

    const { data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', auth.id)
      .single();

    await insertAuditLog(auth.id, 'ACTIVATE_ACCOUNT', `Activated with code ${activationCode.code}`);

    return NextResponse.json({ message: 'Account activated successfully', user: updatedProfile });
  } catch (error: unknown) {
    console.error('Activation error:', error);
    const message = error instanceof Error ? error.message : 'Activation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}