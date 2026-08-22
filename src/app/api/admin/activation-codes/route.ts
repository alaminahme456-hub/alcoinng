import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog } from '@/lib/db';
import { requireAdmin, isAuthUser } from '@/lib/req-helpers';
import { generateCode } from '@/lib/auth';

const ALC_REGEX = /^ALC[0-9]{3}$/;

/**
 * Generate a unique ALC### code that doesn't exist in the DB.
 * Used/disabled codes are also excluded from regeneration.
 */
async function generateUniqueCode(): Promise<string> {
  const maxAttempts = 50;
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCode(); // ALC###
    const { data } = await supabaseAdmin
      .from('activation_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Failed to generate a unique activation code after multiple attempts');
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('activation_codes')
      .select('*, profiles!activation_codes_redeemed_by_fkey(username)', { count: 'exact' })
      .order('generated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status && ['unused', 'used', 'disabled'].includes(status)) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('code', `%${search}%`);
    }

    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);

    const codes = (rows || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      activationValue: Number(row.activation_value ?? row.value ?? 5000),
      status: row.status,
      redeemedBy: row.profiles?.username || row.redeemed_by || null,
      redeemedAt: row.redeemed_at,
      generatedAt: row.generated_at,
    }));

    return NextResponse.json({
      codes,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin activation codes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch activation codes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const body = await req.json();
    const numCount = Number(body.count) || 1;

    if (numCount < 1 || numCount > 100) {
      return NextResponse.json({ error: 'Count must be between 1 and 100' }, { status: 400 });
    }

    const results: any[] = [];
    for (let i = 0; i < numCount; i++) {
      const code = await generateUniqueCode();

      const insertPayload: any = {
        code,
        status: 'unused',
      };

      // Use activation_value if the column exists, otherwise fall back to value
      const { data: row, error } = await supabaseAdmin
        .from('activation_codes')
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (error) {
        // If it's a unique violation, retry once
        if (error.code === '23505') {
          const retryCode = await generateUniqueCode();
          const { data: retryRow } = await supabaseAdmin
            .from('activation_codes')
            .insert({ code: retryCode, status: 'unused' })
            .select()
            .maybeSingle();
          if (retryRow) results.push(retryRow);
        }
        // Otherwise skip this code
        continue;
      }
      if (row) results.push(row);
    }

    const codes = results.map((row: any) => ({
      id: row.id,
      code: row.code,
      activationValue: Number(row.activation_value ?? row.value ?? 5000),
      status: row.status,
      redeemedBy: row.redeemed_by,
      redeemedAt: row.redeemed_at,
      generatedAt: row.generated_at,
    }));

    await insertAuditLog(admin.id, 'GENERATE_ACTIVATION_CODES', `Generated ${results.length} activation codes (ALC format)`);

    return NextResponse.json({ codes, message: `${results.length} activation code(s) generated` }, { status: 201 });
  } catch (error: unknown) {
    console.error('Generate activation codes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate codes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { codeId, action } = await req.json();
    if (!codeId || !action) {
      return NextResponse.json({ error: 'Code ID and action are required' }, { status: 400 });
    }

    const { data: activationCode } = await supabaseAdmin
      .from('activation_codes')
      .select('*')
      .eq('id', codeId)
      .single();

    if (!activationCode) {
      return NextResponse.json({ error: 'Activation code not found' }, { status: 404 });
    }

    if (activationCode.status === 'used') {
      return NextResponse.json({ error: 'Cannot modify a used code' }, { status: 400 });
    }

    if (action === 'enable' && activationCode.status === 'disabled') {
      await supabaseAdmin.from('activation_codes').update({ status: 'unused' }).eq('id', codeId);
    } else if (action === 'disable') {
      await supabaseAdmin.from('activation_codes').update({ status: 'disabled' }).eq('id', codeId);
    } else {
      return NextResponse.json({ error: 'Invalid action. Use disable or enable.' }, { status: 400 });
    }

    const { data } = await supabaseAdmin.from('activation_codes').select('*').eq('id', codeId).single();

    const code = {
      id: data.id,
      code: data.code,
      activationValue: Number(data.activation_value ?? data.value ?? 5000),
      status: data.status,
      redeemedBy: data.redeemed_by,
      redeemedAt: data.redeemed_at,
      generatedAt: data.generated_at,
    };

    return NextResponse.json({ code, message: `Code ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Update activation code error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
