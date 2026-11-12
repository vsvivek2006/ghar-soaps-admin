import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyAdminAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return false;

  const expectedSecret = (process.env.ADMIN_SECRET_TOKEN || '').trim();
  if (expectedSecret && token.length === expectedSecret.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(token, 'utf-8'), Buffer.from(expectedSecret, 'utf-8'))) {
        return true;
      }
    } catch {
      // fall through to Supabase Auth check
    }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (!error && user?.id) {
      return true;
    }
  } catch {
    // Unauthorized
  }

  return false;
}

function cleanText(val: unknown, max = 500): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, max).replace(/[<>]/g, '');
}

export async function GET(request: Request) {
  try {
    const isAuthed = await verifyAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[ADMIN_CONTACTS_FETCH_ERROR]', error.code);
      return NextResponse.json({ error: 'Failed to load inquiries.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : 'UnknownError';
    console.error('[ADMIN_CONTACTS_GET_EXCEPTION]', name);
    return NextResponse.json({ error: 'Internal system error.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const isAuthed = await verifyAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const id = cleanText(body?.id, 30).toUpperCase();
    const status = cleanText(body?.status, 30);
    const adminNotes = body?.admin_notes !== undefined ? cleanText(body.admin_notes, 1000) : undefined;

    if (!id) {
      return NextResponse.json({ error: 'Inquiry ID is required.' }, { status: 400 });
    }

    const allowedStatuses = ['New', 'In Progress', 'Resolved'];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (adminNotes !== undefined) updates.admin_notes = adminNotes;

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN_CONTACTS_PATCH_ERROR]', error.code);
      return NextResponse.json({ error: 'Failed to update inquiry.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, inquiry: data });
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : 'UnknownError';
    console.error('[ADMIN_CONTACTS_PATCH_EXCEPTION]', name);
    return NextResponse.json({ error: 'Internal system error.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const isAuthed = await verifyAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = cleanText(searchParams.get('id'), 30).toUpperCase();
    if (!id) {
      return NextResponse.json({ error: 'Inquiry ID is required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('contact_messages').delete().eq('id', id);

    if (error) {
      console.error('[ADMIN_CONTACTS_DELETE_ERROR]', error.code);
      return NextResponse.json({ error: 'Failed to delete inquiry.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : 'UnknownError';
    console.error('[ADMIN_CONTACTS_DELETE_EXCEPTION]', name);
    return NextResponse.json({ error: 'Internal system error.' }, { status: 500 });
  }
}

