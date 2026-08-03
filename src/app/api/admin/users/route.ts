import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthAdmin } from '@/lib/supabase/helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabaseAdmin
      .from('profiles')
      .select('*, wallets(id, type, balance)', { count: 'exact' });

    if (search) {
      const safeSearch = search.replace(/,/g, '\\,');
      query = query.or(`full_name.ilike.%${safeSearch}%,username.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`);
    }

    if (status === 'activated') {
      query = query.eq('is_activated', true);
    } else if (status === 'pending') {
      query = query.eq('is_activated', false);
    }

    const { data: rows, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const total = count || 0;

    // Map to camelCase response matching old Prisma shape
    const users = (rows || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      email: '', // email is in auth.users, not profiles
      phone: row.phone,
      role: row.role,
      isActivated: row.is_activated,
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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Admin users error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, action } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    const { data: targetUser } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'activate') {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ is_activated: true, activated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      await supabaseAdmin.from('audit_logs').insert({
        user_id: auth.user.id,
        action: 'ADMIN_ACTIVATE_USER',
        details: `activate user ${targetUser.username}`,
      });

      return NextResponse.json({
        user: {
          id: data.id,
          fullName: data.full_name,
          username: data.username,
          phone: data.phone,
          role: data.role,
          isActivated: data.is_activated,
          activatedAt: data.activated_at,
          referralCode: data.referral_code,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        message: 'User activated successfully',
      });
    } else if (action === 'suspend') {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ is_activated: false })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      await supabaseAdmin.from('audit_logs').insert({
        user_id: auth.user.id,
        action: 'ADMIN_SUSPEND_USER',
        details: `suspend user ${targetUser.username}`,
      });

      return NextResponse.json({
        user: {
          id: data.id,
          fullName: data.full_name,
          username: data.username,
          phone: data.phone,
          role: data.role,
          isActivated: data.is_activated,
          activatedAt: data.activated_at,
          referralCode: data.referral_code,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        message: 'User suspended successfully',
      });
    } else if (action === 'delete') {
      // Delete the auth user — ON DELETE CASCADE on profiles handles related records
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) throw error;

      await supabaseAdmin.from('audit_logs').insert({
        user_id: auth.user.id,
        action: 'DELETE_USER',
        details: `Deleted user ${targetUser.username}`,
      });

      return NextResponse.json({ message: 'User deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use activate, suspend, or delete' },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Admin edit user error:', error);
    const message = error instanceof Error ? error.message : 'Failed to edit user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
