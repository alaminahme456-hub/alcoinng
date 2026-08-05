import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/auth/login
 * Clerk handles the actual login. This endpoint returns the profile if one exists.
 */
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ user: user.profile });
  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
