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

function cleanInput(val: any, max = 250): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, max).replace(/[<>]/g, '');
}

// 1. GET: Fetch all orders from Supabase directly
export async function GET(request: Request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const phone = searchParams.get('phone');
    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from('orders')
      .select('*, order_items(*), order_tracking_events(*)');

    if (id) {
      query = query.eq('id', cleanInput(id, 20).toUpperCase());
    } else if (phone) {
      query = query.eq('phone', cleanInput(phone, 15).replace(/\D/g, ''));
    } else {
      query = query.order('created_at', { ascending: false }).limit(200);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[ADMIN_ORDERS_FETCH_ERROR]', error.code);
      return NextResponse.json({ error: 'Failed to retrieve orders.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[ADMIN_ORDERS_GET_EXCEPTION]', err?.name);
    return NextResponse.json({ error: 'Internal system error.' }, { status: 500 });
  }
}

// 2. PATCH: Update order status & courier
export async function PATCH(request: Request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, trackingNumber, carrier, note, location } = body;

    const safeId = cleanInput(id, 20).toUpperCase();
    if (!safeId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const allowedStatuses = ['Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    const safeStatus = status && allowedStatuses.includes(status) ? status : null;
    const safeCarrier = carrier ? cleanInput(carrier, 80) : null;
    const safeTracking = trackingNumber ? cleanInput(trackingNumber, 50) : null;
    const safeNote = note ? cleanInput(note, 250) : null;
    const safeLocation = location ? cleanInput(location, 100) : null;

    const supabaseAdmin = getSupabaseAdmin();
    const updates: any = { updated_at: new Date().toISOString() };
    if (safeStatus) updates.status = safeStatus;
    if (safeCarrier) updates.carrier = safeCarrier;
    if (safeTracking) updates.tracking_number = safeTracking;

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', safeId)
      .select()
      .single();

    if (updateError) {
      console.error('[ADMIN_ORDERS_UPDATE_ERROR]', updateError.code);
      return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 });
    }

    if (safeStatus) {
      const milestoneTitles: Record<string, string> = {
        Confirmed: 'Order Confirmed & Payment Verified',
        Processing: 'Packed at Ghar Soaps Facility',
        Shipped: `In Transit via ${safeCarrier || updatedOrder.carrier || 'BlueDart Air Cargo'}`,
        'Out for Delivery': 'Out for Delivery to Customer Address',
        Delivered: 'Delivered to Doorstep Successfully',
        Cancelled: 'Order Cancelled',
      };

      await supabaseAdmin.from('order_tracking_events').insert({
        order_id: safeId,
        status: safeStatus,
        title: milestoneTitles[safeStatus] || `Status updated to ${safeStatus}`,
        description: safeNote || `Order updated to ${safeStatus}.`,
        location: safeLocation || (safeStatus === 'Delivered' ? updatedOrder.city : 'Regional Air Hub'),
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('[ADMIN_ORDERS_PATCH_EXCEPTION]', err?.name);
    return NextResponse.json({ error: 'Server error updating record.' }, { status: 500 });
  }
}

// 3. DELETE: Delete order
export async function DELETE(request: Request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = cleanInput(searchParams.get('id'), 20).toUpperCase();

    if (!id) {
      return NextResponse.json({ error: 'Valid Order ID is required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('orders').delete().eq('id', id);

    if (error) {
      console.error('[ADMIN_ORDERS_DELETE_ERROR]', error.code);
      return NextResponse.json({ error: 'Failed to delete order.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Order #${id} deleted.` });
  } catch (err: any) {
    console.error('[ADMIN_ORDERS_DELETE_EXCEPTION]', err?.name);
    return NextResponse.json({ error: 'Server error processing deletion.' }, { status: 500 });
  }
}

