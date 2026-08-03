import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthAdmin } from '@/lib/supabase/helpers';
import { generateCode } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('deposit_codes')
      .select('*', { count: 'exact' });

    if (status && ['unused', 'used', 'disabled'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query
      .order('generated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;
    const total = count || 0;

    const codes = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      code: row.code,
      amount: Number(row.amount),
      status: row.status,
      usedBy: row.used_by,
      usedAt: row.used_at,
      generatedAt: row.generated_at,
    }));

    return NextResponse.json({
      codes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin deposit codes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch deposit codes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { amount, count = 1 } = await req.json();
    const numAmount = Number(amount);
    const numCount = Number(count);

    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (numCount < 1 || numCount > 100) {
      return NextResponse.json({ error: 'Count must be between 1 and 100' }, { status: 400 });
    }

    const inserts: Array<{ code: string; amount: number; status: string }> = [];

    for (let i = 0; i < numCount; i++) {
      let code = generateCode();
      const { data: existing } = await supabaseAdmin
        .from('deposit_codes')
        .select('id')
        .eq('code', code)
        .single();
      while (existing) {
        code = generateCode();
        const check = await supabaseAdmin
          .from('deposit_codes')
          .select('id')
          .eq('code', code)
          .single();
        if (!check.data) break;
      }
      inserts.push({ code, amount: numAmount, status: 'unused' });
    }

    const { data, error } = await supabaseAdmin
      .from('deposit_codes')
      .insert(inserts)
      .select();

    if (error) throw error;

    const codes = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      code: row.code,
      amount: Number(row.amount),
      status: row.status,
      usedBy: row.used_by,
      usedAt: row.used_at,
      generatedAt: row.generated_at,
    }));

    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'GENERATE_DEPOSIT_CODES',
      details: `Generated ${numCount} deposit codes of ₦${numAmount.toLocaleString()} each`,
    });

    return NextResponse.json({ codes, message: `${numCount} deposit code(s) generated` }, { status: 201 });
  } catch (error: unknown) {
    console.error('Generate deposit codes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate codes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { codeId, action } = await req.json();
    if (!codeId || !action) {
      return NextResponse.json({ error: 'Code ID and action are required' }, { status: 400 });
    }

    const { data: depositCode, error: fetchError } = await supabaseAdmin
      .from('deposit_codes')
      .select('*')
      .eq('id', codeId)
      .single();

    if (fetchError || !depositCode) {
      return NextResponse.json({ error: 'Deposit code not found' }, { status: 404 });
    }

    if (depositCode.status === 'used') {
      return NextResponse.json({ error: 'Cannot modify a used code' }, { status: 400 });
    }

    const newStatus = action === 'disable' ? 'disabled' : 'unused';

    const { data, error } = await supabaseAdmin
      .from('deposit_codes')
      .update({ status: newStatus })
      .eq('id', codeId)
      .select()
      .single();

    if (error) throw error;

    const code = {
      id: data.id,
      code: data.code,
      amount: Number(data.amount),
      status: data.status,
      usedBy: data.used_by,
      usedAt: data.used_at,
      generatedAt: data.generated_at,
    };

    return NextResponse.json({ code, message: `Code ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Update deposit code error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
