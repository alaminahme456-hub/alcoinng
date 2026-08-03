import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Activation code is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isActivated) {
      return NextResponse.json({ error: 'Account is already activated' }, { status: 400 });
    }

    const activationCode = await db.activationCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!activationCode) {
      return NextResponse.json({ error: 'Invalid activation code' }, { status: 404 });
    }

    if (activationCode.status !== 'unused') {
      return NextResponse.json({ error: 'Activation code has already been used' }, { status: 400 });
    }

    const now = new Date();

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          isActivated: true,
          activatedAt: now,
          activationCodeId: activationCode.id,
        },
      }),
      db.activationCode.update({
        where: { id: activationCode.id },
        data: {
          status: 'used',
          redeemedBy: user.id,
          redeemedAt: now,
        },
      }),
    ]);

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'ACTIVATE_ACCOUNT',
        details: `Activated with code ${activationCode.code}`,
      },
    });

    return NextResponse.json({ message: 'Account activated successfully' });
  } catch (error: unknown) {
    console.error('Activation error:', error);
    const message = error instanceof Error ? error.message : 'Activation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
