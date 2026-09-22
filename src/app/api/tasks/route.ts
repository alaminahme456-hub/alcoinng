import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data: rows, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    const tasks = (rows || []).map((row: any) => ({
      ...row,
      requiresProof: Boolean(row.requires_proof),
      actionUrl: row.action_url || null,
      autoApprove: Boolean(row.auto_approve),
    }));
    return NextResponse.json({ tasks });
  } catch (error: unknown) {
    console.error('Fetch tasks error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
