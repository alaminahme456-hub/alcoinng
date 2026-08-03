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

    const user = await db.user.findUnique({
      where: { id: payload.userId },
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
        profilePicture: true,
        bankName: true,
        bankAccount: true,
        bankAccountName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
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

    const body = await req.json();
    const { fullName, phone, profilePicture, bankName, bankAccount, bankAccountName } = body;

    const updateData: Record<string, string | null> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
    if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: payload.userId },
      data: updateData,
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
        profilePicture: true,
        bankName: true,
        bankAccount: true,
        bankAccountName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'UPDATE_PROFILE',
        details: `Updated profile fields: ${Object.keys(updateData).join(', ')}`,
      },
    });

    return NextResponse.json({ user, message: 'Profile updated successfully' });
  } catch (error: unknown) {
    console.error('Update profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
