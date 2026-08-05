import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { insertAuditLog } from '@/lib/db';
import { requireAdmin, isAuthUser } from '@/lib/req-helpers';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const { data: rows, count, error } = await supabaseAdmin
      .from('announcements')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);

    const announcements = (rows || []).map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      announcements,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin announcements error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch announcements';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { title, message } = await req.json();
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert({ title, message, is_active: true })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await insertAuditLog(admin.id, 'CREATE_ANNOUNCEMENT', `Created announcement: ${title}`);

    const announcement = {
      id: data.id,
      title: data.title,
      message: data.message,
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ announcement, message: 'Announcement created' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { announcementId, title, message, isActive, action } = await req.json();
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (action === 'toggle') updates.is_active = !existing.is_active;
    if (title !== undefined) updates.title = title;
    if (message !== undefined) updates.message = message;
    if (isActive !== undefined) updates.is_active = Boolean(isActive);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await supabaseAdmin.from('announcements').update(updates).eq('id', announcementId);

    const { data } = await supabaseAdmin.from('announcements').select('*').eq('id', announcementId).single();

    const announcement = {
      id: data.id,
      title: data.title,
      message: data.message,
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({
      announcement,
      message: action === 'toggle' ? `Announcement ${data.is_active ? 'activated' : 'deactivated'}` : 'Announcement updated',
    });
  } catch (error: unknown) {
    console.error('Toggle announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const announcementId = searchParams.get('announcementId');
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    await supabaseAdmin.from('announcements').delete().eq('id', announcementId);
    await insertAuditLog(admin.id, 'DELETE_ANNOUNCEMENT', `Deleted announcement ${announcementId}`);

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}