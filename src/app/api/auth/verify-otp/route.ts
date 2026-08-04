import { NextRequest, NextResponse } from 'next/server';
import { getDB, mapProfileRow, insertAuditLog } from '@/lib/db';
import { verifyOTP, storeOTP, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const db = getDB();

    // Look up user by email
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify OTP
    const verified = verifyOTP(db, row.id as string, otp);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid or expired OTP. Please check and try again.' }, { status: 401 });
    }

    // Sign token
    const token = await signToken({
      userId: row.id as string,
      role: row.role as string,
      email: row.email as string,
    });

    // Audit log
    insertAuditLog(db, row.id as string, 'user.email_verified', 'Email verified via OTP');

    // Re-fetch the user row to get updated email_verified status
    const updatedRow = db.prepare('SELECT * FROM users WHERE id = ?').get(row.id) as Record<string, unknown>;

    return NextResponse.json({ user: mapProfileRow(updatedRow), token });
  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    const message = error instanceof Error ? error.message : 'OTP verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Resend OTP endpoint
export async function PUT(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = getDB();

    // Look up user by email
    const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate and store new OTP
    const otpCode = storeOTP(db, row.id as string);

    // Audit log
    insertAuditLog(db, row.id as string, 'user.otp_resent', 'OTP code resent');

    return NextResponse.json({ message: 'OTP resent successfully', otp: otpCode });
  } catch (error: unknown) {
    console.error('Resend OTP error:', error);
    const message = error instanceof Error ? error.message : 'Failed to resend OTP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
