import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function safeSecretEquals(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function optionalNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  try {
    const expectedPassword = process.env.CPALEAD_POSTBACK_PASSWORD;
    if (!expectedPassword) {
      console.error('CPALEAD_POSTBACK_PASSWORD is not configured');
      return NextResponse.json({ error: 'Postback is not configured' }, { status: 500 });
    }

    const params = req.nextUrl.searchParams;
    const receivedPassword = params.get('password') ?? '';

    if (!safeSecretEquals(expectedPassword, receivedPassword)) {
      console.log('CPAlead diagnostic: invalid password');
      return NextResponse.json({ error: 'Invalid postback password' }, { status: 403 });
    }

    const subid = (params.get('subid') ?? '').trim();
    const leadId = optionalNumber(params.get('lead_id'));
    const payout = optionalNumber(params.get('payout'));

    if (!subid || leadId === null || !Number.isInteger(leadId) || leadId <= 0) {
      console.log('CPAlead diagnostic: invalid subid/lead_id', {
        has_subid: Boolean(subid),
        lead_id: leadId,
      });
      return NextResponse.json({ error: 'Missing or invalid subid/lead_id' }, { status: 400 });
    }

    if (payout === null || payout < 0 || !Number.isFinite(payout)) {
      console.log('CPAlead diagnostic: invalid payout', {
        lead_id: leadId,
        payout,
      });
      return NextResponse.json({ error: 'Missing or invalid payout' }, { status: 400 });
    }

    // Capture all CPAlead GET parameters except the shared secret.
    const rawParams: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      if (key !== 'password') rawParams[key] = value;
    }

    const { data, error } = await supabaseAdmin.rpc('process_cpalead_postback', {
      p_subid: subid,
      p_lead_id: leadId,
      p_campaign_id: optionalNumber(params.get('campaign_id')),
      p_campaign_name: params.get('campaign_name') || null,
      p_payout: payout,
      p_subid2: params.get('subid2') || null,
      p_subid3: params.get('subid3') || null,
      p_country_iso: params.get('country_iso')?.toUpperCase().slice(0, 2) || null,
      p_ip_address: params.get('ip_address') || null,
      p_gateway_id: params.get('gateway_id') || null,
      p_event_key: params.get('event_key') || null,
      p_event_name: params.get('event_name') || null,
      p_event_payout: optionalNumber(params.get('event_payout')),
      p_virtual_currency: optionalNumber(params.get('virtual_currency')),
      p_raw_params: rawParams,
    });

    if (error) {
      console.error('CPAlead diagnostic: database error', {
        lead_id: leadId,
        payout,
        error: error.message,
      });
      return NextResponse.json({ error: 'Database processing failed' }, { status: 500 });
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result) {
      console.error('CPAlead diagnostic: no processing result', {
        lead_id: leadId,
        payout,
      });
      return NextResponse.json({ error: 'No processing result' }, { status: 500 });
    }

    console.log('CPAlead diagnostic: processed', {
      lead_id: leadId,
      payout,
      result: result.reason,
      processed: result.processed,
      new_balance: result.new_balance,
    });

    if (result.reason === 'duplicate_lead') {
      // CPAlead may retry a successful callback; never credit a lead twice.
      return NextResponse.json({ ok: true, duplicate: true, lead_id: leadId });
    }

    if (result.reason === 'invalid_subid') {
      return NextResponse.json({ error: 'Invalid user reference' }, { status: 400 });
    }

    if (result.reason === 'reward_wallet_not_found') {
      return NextResponse.json({ error: 'Reward wallet not found' }, { status: 404 });
    }

    if (result.reason !== 'credited') {
      return NextResponse.json({ error: result.reason || 'Postback not processed' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      credited: true,
      lead_id: leadId,
      payout,
      new_balance: result.new_balance,
    });
  } catch (error) {
    console.error('CPAlead postback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
