import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clerk handles session cleanup via middleware. This is a no-op for the client.
 */
export async function POST() {
  return NextResponse.json({ message: 'Logged out' });
}
