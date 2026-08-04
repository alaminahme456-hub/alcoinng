import { NextRequest, NextResponse } from 'next/server';
import { getDB, mapProfileRow, insertAuditLog } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { loginId, password } = await req.json();

    if (!loginId || !password) {
      return NextResponse.json({ error: 'Login ID and password are required' }, { status: 400 });
    }

    const db = getDB();

    // Look up user by email or username
    const row = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(loginId, loginId) as Record<string, unknown> | undefined;

    if (!row) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Compare password
    const valid = await comparePassword(password, row.password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Sign JWT
    const token = await signToken({
      userId: row.id as string,
      role: row.role as string,
      email: row.email as string,
    });

    // Audit log
    insertAuditLog(db, row.id as string, 'user.login', 'Logged in');

    return NextResponse.json({ user: mapProfileRow(row), token });
  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
