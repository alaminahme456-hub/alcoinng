import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, username, loginId, password } = await req.json();
    const loginEmail = email || loginId;
    const loginUsername = username || loginId;

    if ((!loginEmail && !loginUsername) || !password) {
      return NextResponse.json({ error: 'Email/username and password are required' }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: loginEmail || undefined },
          { username: loginUsername || undefined },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user.id);

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword, token });
  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
