import { NextRequest } from 'next/server';
import { getAuthUser, getAuthAdmin, type AuthUser } from '@/lib/auth';

export function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function requireAuth(req: NextRequest): Promise<AuthUser | NextResponse> {
  const token = getToken(req);
  if (!token) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await getAuthUser(token);
  if (!user) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

export async function requireAdmin(req: NextRequest): Promise<AuthUser | NextResponse> {
  const token = getToken(req);
  if (!token) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const admin = await getAuthAdmin(token);
  if (!admin) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return admin;
}

export function isAuthUser(result: AuthUser | NextResponse): result is AuthUser {
  return 'id' in result && !('status' in result);
}
