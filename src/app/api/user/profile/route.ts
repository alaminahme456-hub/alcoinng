import { NextRequest, NextResponse } from 'next/server';
import { getDB, mapProfileRow, insertAuditLog, touchUpdated } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = getAuthUser(token!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = mapProfileRow({ ...auth.profile, email: auth.email } as Record<string, unknown>);
    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = getAuthUser(token!);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fullName, phone, profilePicture, bankName, bankAccount, bankAccountName } = body;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (fullName !== undefined) { fields.push('full_name = ?'); values.push(fullName); }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
    if (profilePicture !== undefined) { fields.push('profile_picture = ?'); values.push(profilePicture); }
    if (bankName !== undefined) { fields.push('bank_name = ?'); values.push(bankName); }
    if (bankAccount !== undefined) { fields.push('bank_account = ?'); values.push(bankAccount); }
    if (bankAccountName !== undefined) { fields.push('bank_account_name = ?'); values.push(bankAccountName); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const db = getDB();
    values.push(auth.id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    touchUpdated(db, 'users', auth.id);
    insertAuditLog(db, auth.id, 'UPDATE_PROFILE', `Updated profile fields: ${fields.map(f => f.split(' = ')[0]).join(', ')}`);

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.id) as Record<string, unknown>;
    const user = mapProfileRow({ ...row, email: auth.email } as Record<string, unknown>);
    return NextResponse.json({ user, message: 'Profile updated successfully' });
  } catch (error: unknown) {
    console.error('Update profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
