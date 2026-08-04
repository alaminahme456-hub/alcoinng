import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const auth = getAuthUser(token);
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({ user: auth.profile });
  } catch (error: unknown) {
    console.error('Session error:', error);
    const message = error instanceof Error ? error.message : 'Session check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
