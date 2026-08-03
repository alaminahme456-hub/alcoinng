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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (status === 'activated') {
      where.isActivated = true;
    } else if (status === 'pending') {
      where.isActivated = false;
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          isActivated: true,
          activatedAt: true,
          referralCode: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Admin users error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
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

    const { userId, action } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let updatedUser;

    if (action === 'activate') {
      updatedUser = await db.user.update({
        where: { id: userId },
        data: { isActivated: true, activatedAt: new Date() },
      });
    } else if (action === 'suspend') {
      updatedUser = await db.user.update({
        where: { id: userId },
        data: { isActivated: false },
      });
    } else if (action === 'delete') {
      // Delete related records first
      await db.notification.deleteMany({ where: { userId } });
      await db.adView.deleteMany({ where: { userId } });
      await db.taskSubmission.deleteMany({ where: { userId } });
      await db.withdrawal.deleteMany({ where: { userId } });
      await db.trade.deleteMany({ where: { userId } });
      await db.wallet.deleteMany({ where: { userId } });
      await db.user.delete({ where: { id: userId } });

      await db.auditLog.create({
        data: {
          userId: payload.userId,
          action: 'DELETE_USER',
          details: `Deleted user ${targetUser.username} (${targetUser.email})`,
        },
      });

      return NextResponse.json({ message: 'User deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use activate, suspend, or delete' }, { status: 400 });
    }

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: `ADMIN_${action.toUpperCase()}_USER`,
        details: `${action} user ${targetUser.username} (${targetUser.email})`,
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser!;
    return NextResponse.json({ user: userWithoutPassword, message: `User ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Admin edit user error:', error);
    const message = error instanceof Error ? error.message : 'Failed to edit user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
