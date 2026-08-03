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
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const { data, count, error } = await supabaseAdmin
      .from('announcements')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;
    const total = count || 0;

    const announcements = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      announcements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin announcements error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch announcements';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { title, message } = await req.json();
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert({ title, message })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'CREATE_ANNOUNCEMENT',
      details: `Created announcement: ${title}`,
    });

    const announcement = {
      id: data.id,
      title: data.title,
      message: data.message,
      isActive: data.is_active,
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
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { announcementId } = await req.json();
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update({ is_active: !existing.is_active })
      .eq('id', announcementId)
      .select()
      .single();

    if (error) throw error;

    const announcement = {
      id: data.id,
      title: data.title,
      message: data.message,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({
      announcement,
      message: `Announcement ${data.is_active ? 'activated' : 'deactivated'}`,
    });
  } catch (error: unknown) {
    console.error('Toggle announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const announcementId = searchParams.get('announcementId');
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', announcementId);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'DELETE_ANNOUNCEMENT',
      details: `Deleted announcement ${announcementId}`,
    });

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete announcement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
