import { NextRequest, NextResponse } from 'next/server';
import { getDB, insertAuditLog } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(getToken(req)!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Activation code is required' }, { status: 400 });
    if (auth.profile.isActivated) return NextResponse.json({ error: 'Account is already activated' }, { status: 400 });

    const db = getDB();
    const activationCode = db.prepare('SELECT * FROM activation_codes WHERE code = ? AND status = ?').get(code.toUpperCase(), 'unused') as Record<string, unknown> | undefined;

    if (!activationCode) return NextResponse.json({ error: 'Invalid activation code' }, { status: 404 });

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET is_activated = 1, activated_at = ?, activation_code_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(now, activationCode.id, auth.id);
    db.prepare('UPDATE activation_codes SET status = ?, redeemed_by = ?, redeemed_at = ? WHERE id = ?').run('used', auth.id, now, activationCode.id);
    insertAuditLog(db, auth.id, 'ACTIVATE_ACCOUNT', `Activated with code ${activationCode.code}`);

    return NextResponse.json({ message: 'Account activated successfully' });
  } catch (error: unknown) {
    console.error('Activation error:', error);
    const message = error instanceof Error ? error.message : 'Activation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
