import { NextRequest, NextResponse } from 'next/server';
import { getDB, insertAuditLog } from '@/lib/db';
import { getAuthAdmin, generateCode } from '@/lib/auth';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const admin = getAuthAdmin(token || '');
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const db = getDB();

    let whereClause = '';
    const params: unknown[] = [];

    if (status && ['unused', 'used', 'disabled'].includes(status)) {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }

    // Count total
    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM deposit_codes ${whereClause}`
    ).get(...params) as { count: number };
    const total = countRow?.count || 0;

    // Fetch paginated codes
    const rows = db.prepare(
      `SELECT * FROM deposit_codes ${whereClause} ORDER BY generated_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as Array<Record<string, unknown>>;

    const codes = rows.map((row) => ({
      id: row.id,
      code: row.code,
      amount: Number(row.amount),
      status: row.status,
      redeemedBy: row.redeemed_by,
      redeemedAt: row.redeemed_at,
      generatedAt: row.generated_at,
    }));

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
    const token = getToken(req);
    const admin = getAuthAdmin(token || '');
    if (!admin) {
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

    const db = getDB();
    const insertStmt = db.prepare(
      'INSERT INTO deposit_codes (id, code, amount, status) VALUES (?, ?, ?, ?)'
    );
    const checkStmt = db.prepare('SELECT id FROM deposit_codes WHERE code = ?');

    const insertMany = db.transaction(() => {
      const ids: string[] = [];
      for (let i = 0; i < numCount; i++) {
        let code = generateCode();
        while (checkStmt.get(code)) {
          code = generateCode();
        }
        const id = crypto.randomUUID();
        insertStmt.run(id, code, numAmount, 'unused');
        ids.push(id);
      }
      return ids;
    });

    const insertedIds = insertMany();

    // Fetch the inserted codes for response
    const placeholders = insertedIds.map(() => '?').join(', ');
    const rows = db.prepare(
      `SELECT * FROM deposit_codes WHERE id IN (${placeholders})`
    ).all(...insertedIds) as Array<Record<string, unknown>>;

    const codes = rows.map((row) => ({
      id: row.id,
      code: row.code,
      amount: Number(row.amount),
      status: row.status,
      redeemedBy: row.redeemed_by,
      redeemedAt: row.redeemed_at,
      generatedAt: row.generated_at,
    }));

    insertAuditLog(db, admin.id, 'GENERATE_DEPOSIT_CODES', `Generated ${numCount} deposit codes of \u20a6${numAmount.toLocaleString()} each`);

    return NextResponse.json({ codes, message: `${numCount} deposit code(s) generated` }, { status: 201 });
  } catch (error: unknown) {
    console.error('Generate deposit codes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate codes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getToken(req);
    const admin = getAuthAdmin(token || '');
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { codeId, action } = await req.json();
    if (!codeId || !action) {
      return NextResponse.json({ error: 'Code ID and action are required' }, { status: 400 });
    }

    const db = getDB();

    const depositCode = db.prepare('SELECT * FROM deposit_codes WHERE id = ?').get(codeId) as Record<string, unknown> | undefined;

    if (!depositCode) {
      return NextResponse.json({ error: 'Deposit code not found' }, { status: 404 });
    }

    if (depositCode.status === 'used') {
      return NextResponse.json({ error: 'Cannot modify a used code' }, { status: 400 });
    }

    const newStatus = action === 'disable' ? 'disabled' : 'unused';

    db.prepare('UPDATE deposit_codes SET status = ? WHERE id = ?').run(newStatus, codeId);

    const data = db.prepare('SELECT * FROM deposit_codes WHERE id = ?').get(codeId) as Record<string, unknown>;

    const code = {
      id: data.id,
      code: data.code,
      amount: Number(data.amount),
      status: data.status,
      redeemedBy: data.redeemed_by,
      redeemedAt: data.redeemed_at,
      generatedAt: data.generated_at,
    };

    return NextResponse.json({ code, message: `Code ${action}d successfully` });
  } catch (error: unknown) {
    console.error('Update deposit code error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
