import { NextRequest, NextResponse } from 'next/server';
import { getDB, insertAuditLog, insertNotification } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = getAuthUser(token!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { adId } = await req.json();
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    if (!auth.profile.isActivated) {
      return NextResponse.json({ error: 'Account must be activated' }, { status: 403 });
    }

    const db = getDB();

    const ad = db.prepare('SELECT * FROM ads WHERE id = ?').get(adId) as Record<string, unknown> | undefined;
    if (!ad || !ad.is_active) {
      return NextResponse.json({ error: 'Ad not found or inactive' }, { status: 404 });
    }

    const existingView = db.prepare('SELECT id FROM ad_views WHERE user_id = ? AND ad_id = ?').get(auth.id, adId);
    if (existingView) {
      return NextResponse.json({ error: 'Ad already watched' }, { status: 400 });
    }

    db.transaction(() => {
      // Create ad view
      db.prepare('INSERT INTO ad_views (id, user_id, ad_id, completed) VALUES (?, ?, ?, 1)').run(crypto.randomUUID(), auth.id, adId);

      // Credit reward wallet
      const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(auth.id, 'reward') as Record<string, unknown> | undefined;
      if (!wallet) throw new Error('Reward wallet not found');

      const newBalance = Number(wallet.balance) + Number(ad.reward);
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBalance, wallet.id);

      insertNotification(db, auth.id, 'Ad Reward', `You earned \u20a6${Number(ad.reward).toLocaleString()} for watching an ad.`, 'reward');
      insertAuditLog(db, auth.id, 'WATCH_AD', `Watched ad '${ad.title}', earned \u20a6${Number(ad.reward).toLocaleString()}`);
    })();

    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(auth.id, 'reward') as Record<string, unknown>;
    const newBalance = Number(wallet.balance);

    return NextResponse.json({
      message: 'Ad watched successfully',
      reward: Number(ad.reward),
      newBalance,
    });
  } catch (error: unknown) {
    console.error('Watch ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to watch ad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
