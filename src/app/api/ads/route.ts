import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const ads = await db.ad.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ads });
  } catch (error: unknown) {
    console.error('Fetch ads error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch ads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { title, thumbnail, duration, reward } = await req.json();

    if (!title || !thumbnail || !duration || !reward) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const ad = await db.ad.create({
      data: { title, thumbnail, duration: Number(duration), reward: Number(reward) },
    });

    return NextResponse.json({ ad }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create ad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
