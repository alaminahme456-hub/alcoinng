import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: user.profile });
  } catch (error: unknown) {
    console.error('Session error:', error);
    const message = error instanceof Error ? error.message : 'Session check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
