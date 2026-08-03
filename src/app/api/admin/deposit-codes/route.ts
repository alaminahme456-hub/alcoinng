import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generateCode } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const where: Record<string, unknown> = {};
    if (status && ['unused', 'used', 'disabled'].includes(status)) {
      where.status = status;
    }

    const [codes, total] = await Promise.all([
      db.depositCode.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.depositCode.count({ where }),
    ]);

    return NextResponse.json({
      codes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin deposit codes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch deposit codes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { amount, count = 1 } = await req.json();
    const numAmount = Number(amount);
    const numCount = Number(count);

    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (numCount < 1 || numCount > 100) {
      return NextResponse.json({ error: 'Count must be between 1 and 100' }, { status: 400 });
    }

    const codes = [];
    for (let i = 0; i < numCount; i++) {
      let code = generateCode();
      let exists = await db.depositCode.findUnique({ where: { code } });
      while (exists) {
        code = generateCode();
        exists = await db.depositCode.findUnique({ where: { code } });
      }

      const created = await db.depositCode.create({
        data: { code, amount: numAmount },
      });
      codes.push(created);
    }

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'GENERATE_DEPOSIT_CODES',
        details: `Generated ${numCount} deposit codes of ₦${numAmount.toLocaleString()} each`,
      },
    });

    return NextResponse.json({ codes, message: `${numCount} deposit code(s) generated` }, { status: 201 });
  } catch (error: unknown) {
    console.error('Generate deposit codes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate codes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { codeId, action } = await req.json();
    if (!codeId || !action) {
      return NextResponse.json({ error: 'Code ID and action are required' }, { status: 400 });
    }

    const depositCode = await db.depositCode.findUnique({ where: { id: codeId } });
    if (!depositCode) {
      return NextResponse.json({ error: 'Deposit code not found' }, { status: 404 });
    }

    if (depositCode.status === 'used') {
      return NextResponse.json({ error: 'Cannot modify a used code' }, { status: 400 });
    }

    const updated = await db.depositCode.update({
      where: { id: codeId },
      data: { status: action === 'disable' ? 'disabled' : 'unused' },
    });

    return NextResponse.json({ code: updated, message: `Code ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Update deposit code error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
