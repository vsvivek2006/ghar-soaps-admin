import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyAdminAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return false;

  // 1. Check backup ADMIN_SECRET_TOKEN
  const expectedSecret = (process.env.ADMIN_SECRET_TOKEN || '').trim();
  if (expectedSecret && token.length === expectedSecret.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(token, 'utf-8'), Buffer.from(expectedSecret, 'utf-8'))) {
        return true;
      }
    } catch {
      // continue to JWT verification
    }
  }

  // 2. Check Supabase Auth JWT token
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user?.id) {
      return true;
    }
  } catch {
    // Auth failed
  }

  return false;
}

export async function GET(request: Request) {
  try {
    const isAuthed = await verifyAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error, count } = await supabaseAdmin
      .from('subscribers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ADMIN_SUBSCRIBERS_FETCH_ERROR]', error.code);
      return NextResponse.json({ error: 'Failed to retrieve subscribers.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscribers: data, count });
  } catch (err: any) {
    console.error('[ADMIN_SUBSCRIBERS_GET_EXCEPTION]', err?.name);
    return NextResponse.json({ error: 'Server error retrieving subscribers.' }, { status: 500 });
  }
}
