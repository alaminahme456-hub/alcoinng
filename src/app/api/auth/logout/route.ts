import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ message: 'Logged out' });
  } catch (error: unknown) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'Logged out' });
  }
}
