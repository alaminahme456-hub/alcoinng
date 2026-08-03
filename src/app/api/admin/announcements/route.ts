import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.announcement.count(),
    ]);

    return NextResponse.json({
      announcements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin announcements error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch announcements';
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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { title, message } = await req.json();
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const announcement = await db.announcement.create({
      data: { title, message },
    });

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'CREATE_ANNOUNCEMENT',
        details: `Created announcement: ${title}`,
      },
    });

    return NextResponse.json({ announcement, message: 'Announcement created' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { announcementId } = await req.json();
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const announcement = await db.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const updated = await db.announcement.update({
      where: { id: announcementId },
      data: { isActive: !announcement.isActive },
    });

    return NextResponse.json({ announcement: updated, message: `Announcement ${updated.isActive ? 'activated' : 'deactivated'}` });
  } catch (error: unknown) {
    console.error('Toggle announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const announcementId = searchParams.get('announcementId');
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    await db.announcement.delete({ where: { id: announcementId } });

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'DELETE_ANNOUNCEMENT',
        details: `Deleted announcement ${announcementId}`,
      },
    });

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
