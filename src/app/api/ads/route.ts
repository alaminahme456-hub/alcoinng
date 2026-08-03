import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data: ads } = await supabaseAdmin
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    return NextResponse.json({ ads: ads || [] });
  } catch (error: unknown) {
    console.error('Fetch ads error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch ads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { title, thumbnail, duration, reward } = await req.json();
    if (!title || !thumbnail || !duration || !reward) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const { data: ad } = await supabaseAdmin
      .from('ads')
      .insert({ title, thumbnail, duration: Number(duration), reward: Number(reward) })
      .select()
      .single();

    return NextResponse.json({ ad }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create ad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
