import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapProfileRow, insertAuditLog } from '@/lib/db';
import { requireAdmin, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (status === 'activated') {
      query = query.eq('is_activated', true);
    } else if (status === 'pending') {
      query = query.eq('is_activated', false);
    }

    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);

    // Email is now stored directly in profiles
    const users = (rows || []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      email: row.email || '',
      phone: row.phone,
      role: row.role,
      isActivated: Boolean(row.is_activated),
      activatedAt: row.activated_at,
      referralCode: row.referral_code,
      profilePicture: row.profile_picture,
      bankName: row.bank_name,
      bankAccount: row.bank_account,
      bankAccountName: row.bank_account_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      users,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin users error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { userId, action } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'activate') {
      await supabaseAdmin.from('profiles').update({
        is_activated: true,
        activated_at: new Date().toISOString(),
      }).eq('id', userId);

      await insertAuditLog(admin.id, 'ADMIN_ACTIVATE_USER', `activate user ${targetUser.username}`);
    } else if (action === 'suspend') {
      await supabaseAdmin.from('profiles').update({ is_activated: false }).eq('id', userId);
      await insertAuditLog(admin.id, 'ADMIN_SUSPEND_USER', `suspend user ${targetUser.username}`);
    } else if (action === 'delete') {
      // Delete profile (cascade handles related records)
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      await insertAuditLog(admin.id, 'DELETE_USER', `Deleted user ${targetUser.username}`);
      return NextResponse.json({ message: 'User deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use activate, suspend, or delete' },
        { status: 400 }
      );
    }

    const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();

    return NextResponse.json({
      user: {
        id: data.id,
        fullName: data.full_name,
        username: data.username,
        email: data.email || '',
        phone: data.phone,
        role: data.role,
        isActivated: Boolean(data.is_activated),
        activatedAt: data.activated_at,
        referralCode: data.referral_code,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      message: `User ${action}d successfully`,
    });
  } catch (error: unknown) {
    console.error('Admin edit user error:', error);
    const message = error instanceof Error ? error.message : 'Failed to edit user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
