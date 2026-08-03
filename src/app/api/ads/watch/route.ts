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

    const { adId } = await req.json();
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isActivated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    const ad = await db.ad.findUnique({ where: { id: adId } });
    if (!ad || !ad.isActive) {
      return NextResponse.json({ error: 'Ad not found or inactive' }, { status: 404 });
    }

    // Check if already watched
    const existingView = await db.adView.findFirst({
      where: { userId: user.id, adId },
    });

    if (existingView) {
      return NextResponse.json({ error: 'Ad already watched' }, { status: 400 });
    }

    // Create ad view
    await db.adView.create({
      data: { userId: user.id, adId, completed: true },
    });

    // Credit reward wallet
    const updatedWallet = await db.wallet.update({
      where: { userId_type: { userId: user.id, type: 'reward' } },
      data: { balance: { increment: ad.reward } },
    });

    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Ad Reward',
        message: `You earned ₦${ad.reward.toLocaleString()} for watching an ad.`,
        type: 'reward',
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'WATCH_AD',
        details: `Watched ad '${ad.title}', earned ₦${ad.reward}`,
      },
    });

    return NextResponse.json({
      message: 'Ad watched successfully',
      reward: ad.reward,
      newBalance: updatedWallet.balance,
    });
  } catch (error: unknown) {
    console.error('Watch ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to watch ad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
