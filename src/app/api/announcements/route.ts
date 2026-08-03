import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const announcements = await db.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ announcements });
  } catch (error: unknown) {
    console.error('Fetch announcements error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch announcements';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
