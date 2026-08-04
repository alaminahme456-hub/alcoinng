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
      .from('ads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);

    const ads = await Promise.all((rows || []).map(async (row) => {
      const { count: viewCount } = await supabaseAdmin
        .from('ad_views')
        .select('*', { count: 'exact', head: true })
        .eq('ad_id', row.id);

      return {
        id: row.id,
        title: row.title,
        thumbnail: row.thumbnail,
        duration: Number(row.duration),
        reward: Number(row.reward),
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        _count: { views: viewCount || 0 },
      };
    }));

    return NextResponse.json({
      ads,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin ads error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch ads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { adId, title, thumbnail, duration, reward, isActive } = await req.json();
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('ads')
      .select('id')
      .eq('id', adId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (thumbnail !== undefined) updates.thumbnail = thumbnail;
    if (duration !== undefined) updates.duration = Number(duration);
    if (reward !== undefined) updates.reward = Number(reward);
    if (isActive !== undefined) updates.is_active = Boolean(isActive);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await supabaseAdmin.from('ads').update(updates).eq('id', adId);

    const { data } = await supabaseAdmin.from('ads').select('*').eq('id', adId).single();

    const ad = {
      id: data.id,
      title: data.title,
      thumbnail: data.thumbnail,
      duration: Number(data.duration),
      reward: Number(data.reward),
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ ad, message: 'Ad updated successfully' });
  } catch (error: unknown) {
    console.error('Admin edit ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update ad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAuthUser(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const adId = searchParams.get('adId');
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    await supabaseAdmin.from('ad_views').delete().eq('ad_id', adId);
    await supabaseAdmin.from('ads').delete().eq('id', adId);

    await insertAuditLog(admin.id, 'DELETE_AD', `Deleted ad ${adId}`);

    return NextResponse.json({ message: 'Ad deleted successfully' });
  } catch (error: unknown) {
    console.error('Admin delete ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete ad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}