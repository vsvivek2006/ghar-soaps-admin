import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function verifyAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const expected = (process.env.ADMIN_SECRET_TOKEN || '27906e7eaf').trim();

  if (!token || token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token, 'utf-8'), Buffer.from(expected, 'utf-8'));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    if (!verifyAdminAuth(request)) {
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

