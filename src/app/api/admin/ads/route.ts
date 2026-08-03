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

    const { data: rows, count, error } = await supabaseAdmin
      .from('ads')
      .select(`*, ad_views(id)`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;
    const total = count || 0;

    const ads = (rows || []).map((row: Record<string, unknown>) => {
      const views = row.ad_views as Array<Record<string, unknown>> || [];
      return {
        id: row.id,
        title: row.title,
        thumbnail: row.thumbnail,
        duration: Number(row.duration),
        reward: Number(row.reward),
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        _count: {
          views: views.length,
        },
      };
    });

    return NextResponse.json({
      ads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Admin ads error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch ads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { adId, title, thumbnail, duration, reward, isActive } = await req.json();
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (duration !== undefined) updateData.duration = Number(duration);
    if (reward !== undefined) updateData.reward = Number(reward);
    if (isActive !== undefined) updateData.is_active = Boolean(isActive);

    const { data, error } = await supabaseAdmin
      .from('ads')
      .update(updateData)
      .eq('id', adId)
      .select()
      .single();

    if (error) throw error;

    const ad = {
      id: data.id,
      title: data.title,
      thumbnail: data.thumbnail,
      duration: Number(data.duration),
      reward: Number(data.reward),
      isActive: data.is_active,
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
    const auth = await getAuthAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const adId = searchParams.get('adId');
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
    }

    // Delete ad views first, then the ad
    const { error: viewError } = await supabaseAdmin
      .from('ad_views')
      .delete()
      .eq('ad_id', adId);

    if (viewError) throw viewError;

    const { error } = await supabaseAdmin
      .from('ads')
      .delete()
      .eq('id', adId);

    if (error) throw error;

    return NextResponse.json({ message: 'Ad deleted successfully' });
  } catch (error: unknown) {
    console.error('Admin delete ad error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete ad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
