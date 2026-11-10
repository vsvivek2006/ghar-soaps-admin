import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    const cleanPin = typeof pin === 'string' ? pin.trim() : '';
    const expected = (process.env.ADMIN_SECRET_TOKEN || '27906e7eaf').trim();

    if (!cleanPin || cleanPin.length !== expected.length) {
      return NextResponse.json({ success: false, error: 'Invalid security passcode.' }, { status: 401 });
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(cleanPin, 'utf-8'),
      Buffer.from(expected, 'utf-8')
    );

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid security passcode.' }, { status: 401 });
    }

    // Return session token
    return NextResponse.json({
      success: true,
      token: cleanPin,
      email: 'admin@gharsoaps.shop',
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Authentication failed.' }, { status: 500 });
  }
}

