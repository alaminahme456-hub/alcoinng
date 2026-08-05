import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog } from '@/lib/db';
import { requireAdmin, isAuthUser } from '@/lib/req-helpers';
import { generateCode } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('deposit_codes')
      .select('*', { count: 'exact' })
      .order('generated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status && ['unused', 'used', 'disabled'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);

    const codes = (rows || []).map((row) => ({
      id: row.id,
      code: row.code,
      amount: Number(row.amount),
      status: row.status,
      redeemedBy: row.redeemed_by,
      redeemedAt: row.redeemed_at,
      generatedAt: row.generated_at,
    }));

    return NextResponse.json({
      codes,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin deposit codes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch deposit codes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

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
      inserts.push({
        code: generateCode(),
        amount: numAmount,
        status: 'unused',
      });
    }

    const { data, error } = await supabaseAdmin
      .from('deposit_codes')
      .insert(inserts)
      .select();

    if (error) {
      const results: any[] = [];
      for (const ins of inserts) {
        const { data: row } = await supabaseAdmin
          .from('deposit_codes')
          .insert(ins)
          .select()
          .maybeSingle();
        if (row) results.push(row);
      }
      const codes = results.map((row) => ({
        id: row.id, code: row.code, amount: Number(row.amount), status: row.status,
        redeemedBy: row.redeemed_by, redeemedAt: row.redeemed_at, generatedAt: row.generated_at,
      }));
      await insertAuditLog(admin.id, 'GENERATE_DEPOSIT_CODES', `Generated ${results.length} deposit codes of ₦${numAmount.toLocaleString()} each`);
      return NextResponse.json({ codes, message: `${results.length} deposit code(s) generated` }, { status: 201 });
    }

    const codes = (data || []).map((row) => ({
      id: row.id, code: row.code, amount: Number(row.amount), status: row.status,
      redeemedBy: row.redeemed_by, redeemedAt: row.redeemed_at, generatedAt: row.generated_at,
    }));

    await insertAuditLog(admin.id, 'GENERATE_DEPOSIT_CODES', `Generated ${numCount} deposit codes of ₦${numAmount.toLocaleString()} each`);

    return NextResponse.json({ codes, message: `${numCount} deposit code(s) generated` }, { status: 201 });
  } catch (error: unknown) {
    console.error('Generate deposit codes error:', error);
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

    const { data: depositCode } = await supabaseAdmin
      .from('deposit_codes')
      .select('*')
      .eq('id', codeId)
      .single();

    if (!depositCode) {
      return NextResponse.json({ error: 'Deposit code not found' }, { status: 404 });
    }

    if (depositCode.status === 'used') {
      return NextResponse.json({ error: 'Cannot modify a used code' }, { status: 400 });
    }

    const newStatus = action === 'disable' ? 'disabled' : 'unused';
    await supabaseAdmin.from('deposit_codes').update({ status: newStatus }).eq('id', codeId);

    const { data } = await supabaseAdmin.from('deposit_codes').select('*').eq('id', codeId).single();

    const code = {
      id: data.id, code: data.code, amount: Number(data.amount), status: data.status,
      redeemedBy: data.redeemed_by, redeemedAt: data.redeemed_at, generatedAt: data.generated_at,
    };

    return NextResponse.json({ code, message: `Code ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Update deposit code error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}