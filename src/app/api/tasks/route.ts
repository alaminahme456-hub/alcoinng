import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM tasks WHERE is_active = 1 ORDER BY created_at DESC').all();
    return NextResponse.json({ tasks: rows || [] });
  } catch (error: unknown) {
    console.error('Fetch tasks error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
