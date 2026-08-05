import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { verifyOTP, storeOTP } from '@/lib/auth';
import { insertAuditLog } from '@/lib/db';

/**
 * POST /api/auth/verify-otp
 * Verifies an OTP code for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { otp } = await req.json();
    if (!otp) {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
    }

    const verified = await verifyOTP(authUser.id, otp);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid or expired OTP. Please check and try again.' }, { status: 401 });
    }

    await insertAuditLog(authUser.id, 'user.email_verified', 'Email verified via OTP');

    return NextResponse.json({ user: authUser.profile, message: 'OTP verified successfully' });
  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    const message = error instanceof Error ? error.message : 'OTP verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/auth/verify-otp
 * Resends OTP for the authenticated user.
 */
export async function PUT() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const otpCode = await storeOTP(authUser.id);
    await insertAuditLog(authUser.id, 'user.otp_resent', 'OTP code resent');

    return NextResponse.json({ message: 'OTP resent successfully', otp: otpCode });
  } catch (error: unknown) {
    console.error('Resend OTP error:', error);
    const message = error instanceof Error ? error.message : 'Failed to resend OTP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
