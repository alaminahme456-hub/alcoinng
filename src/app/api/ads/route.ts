import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    const db = getDB();
    const ads = db.prepare("SELECT * FROM ads WHERE is_active = 1 ORDER BY created_at DESC").all() as Array<Record<string, unknown>>;
    return NextResponse.json({ ads });
  } catch (error: unknown) {
    console.error('Fetch ads error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch ads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
