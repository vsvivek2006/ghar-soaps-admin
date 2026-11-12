import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, pin } = body;

    // 1. If email & password provided, authenticate via Supabase
    if (email && password) {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: String(email).trim(),
        password: String(password),
      });

      if (error || !data.session) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password.' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        token: data.session.access_token,
        email: data.user.email,
      });
    }

    // 2. Fallback: If legacy PIN / hex token provided
    if (pin) {
      const cleanPin = typeof pin === 'string' ? pin.trim() : '';
      const expected = (process.env.ADMIN_SECRET_TOKEN || '').trim();

      if (!expected || !cleanPin || cleanPin.length !== expected.length) {
        return NextResponse.json(
          { success: false, error: 'Invalid security passcode.' },
          { status: 401 }
        );
      }

      const isValid = crypto.timingSafeEqual(
        Buffer.from(cleanPin, 'utf-8'),
        Buffer.from(expected, 'utf-8')
      );

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid security passcode.' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        token: cleanPin,
        email: 'admin@gharsoap.shop',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing credentials.' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication failed.' },
      { status: 500 }
    );
  }
}
