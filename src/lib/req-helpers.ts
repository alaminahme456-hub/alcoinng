import { NextRequest } from 'next/server';
import { getAuthUser, getAuthAdmin, type AuthUser } from '@/lib/auth';

/**
 * Extract Bearer token from request (kept for backwards compat, unused with Clerk).
 */
export function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

/**
 * Require authenticated user — uses Clerk session internally.
 * Accepts optional `req` for backwards compatibility (ignored).
 */
export async function requireAuth(req?: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser();
  if (!user) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

/**
 * Require admin user — uses Clerk session internally.
 */
export async function requireAdmin(req?: NextRequest): Promise<AuthUser | NextResponse> {
  const admin = await getAuthAdmin();
  if (!admin) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return admin;
}

export function isAuthUser(result: AuthUser | NextResponse): result is AuthUser {
  return 'id' in result && !('status' in result);
}
