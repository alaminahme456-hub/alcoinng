import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Client handles token removal (clear from storage/cookies)
    return NextResponse.json({ message: 'Logged out' });
  } catch (error: unknown) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'Logged out' });
  }
}
