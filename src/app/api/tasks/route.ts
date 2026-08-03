import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error: unknown) {
    console.error('Fetch tasks error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { title, instructions, reward, requiresProof } = await req.json();
    if (!title || !instructions || !reward) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const { data: task } = await supabaseAdmin
      .from('tasks')
      .insert({
        title,
        instructions,
        reward: Number(reward),
        requires_proof: Boolean(requiresProof),
      })
      .select()
      .single();

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
