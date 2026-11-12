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
      // continue to Supabase JWT verification
    }
  }

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

    const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    const storefrontUrl = (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://gharsoap.shop').replace(/\/+$/, '');

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch live payment transactions directly from Razorpay API
    let razorpayPayments: any[] = [];
    let gatewayError: string | null = null;

    if (keyId && keySecret) {
      try {
        const basicAuth = Buffer.from(`${keyId}:${keySecret}`, 'utf8').toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/payments?count=100&expand[]=card', {
          headers: {
            Authorization: `Basic ${basicAuth}`,
          },
          signal: AbortSignal.timeout(10000),
          cache: 'no-store',
        });

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          razorpayPayments = Array.isArray(rzpData?.items) ? rzpData.items : [];
        } else {
          gatewayError = `Razorpay API HTTP ${rzpRes.status}`;
        }
      } catch (err: any) {
        gatewayError = err?.message || 'Failed connecting to Razorpay API';
      }
    }

    // 2. Fetch recorded webhook events from Supabase audit table
    const { data: dbEvents, error: dbEventsError } = await supabaseAdmin
      .from('payment_events')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(100);

    const paymentEvents = dbEvents || [];

    // 3. Collect all related IDs to cross-reference with Orders table
    const rzpOrderIds = new Set<string>();
    const rzpPaymentIds = new Set<string>();

    razorpayPayments.forEach((p) => {
      if (p.order_id) rzpOrderIds.add(String(p.order_id));
      if (p.id) rzpPaymentIds.add(String(p.id));
    });

    paymentEvents.forEach((ev: any) => {
      if (ev.razorpay_order_id) rzpOrderIds.add(String(ev.razorpay_order_id));
      if (ev.razorpay_payment_id) rzpPaymentIds.add(String(ev.razorpay_payment_id));
    });

    // 4. Fetch matching orders
    const matchedOrdersMap = new Map<string, any>();
    if (rzpOrderIds.size > 0 || rzpPaymentIds.size > 0) {
      const orderIdList = Array.from(rzpOrderIds);
      const paymentIdList = Array.from(rzpPaymentIds);

      // Query by razorpay_order_id
      if (orderIdList.length > 0) {
        const { data: ordersByOrder } = await supabaseAdmin
          .from('orders')
          .select('id, tracking_number, customer_name, phone, email, total, status, payment_status, razorpay_order_id, razorpay_payment_id, created_at')
          .in('razorpay_order_id', orderIdList);

        ordersByOrder?.forEach((ord) => {
          if (ord.razorpay_order_id) matchedOrdersMap.set(ord.razorpay_order_id, ord);
          if (ord.razorpay_payment_id) matchedOrdersMap.set(ord.razorpay_payment_id, ord);
        });
      }

      // Query by razorpay_payment_id
      if (paymentIdList.length > 0) {
        const { data: ordersByPayment } = await supabaseAdmin
          .from('orders')
          .select('id, tracking_number, customer_name, phone, email, total, status, payment_status, razorpay_order_id, razorpay_payment_id, created_at')
          .in('razorpay_payment_id', paymentIdList);

        ordersByPayment?.forEach((ord) => {
          if (ord.razorpay_order_id) matchedOrdersMap.set(ord.razorpay_order_id, ord);
          if (ord.razorpay_payment_id) matchedOrdersMap.set(ord.razorpay_payment_id, ord);
        });
      }
    }

    // 5. Build unified and enriched payments list
    const enrichedPayments = razorpayPayments.map((p) => {
      const matchedOrder =
        (p.order_id ? matchedOrdersMap.get(p.order_id) : null) ||
        (p.id ? matchedOrdersMap.get(p.id) : null);

      return {
        id: p.id,
        entity: p.entity,
        amount: (p.amount || 0) / 100,
        currency: p.currency || 'INR',
        status: p.status, // 'captured' | 'authorized' | 'failed' | 'refunded'
        order_id: p.order_id,
        invoice_id: p.invoice_id,
        method: p.method, // 'upi' | 'card' | 'netbanking' | 'wallet'
        amount_refunded: (p.amount_refunded || 0) / 100,
        refund_status: p.refund_status,
        captured: Boolean(p.captured),
        description: p.description,
        bank: p.bank,
        wallet: p.wallet,
        vpa: p.vpa,
        card: p.card ? {
          network: p.card.network,
          last4: p.card.last4,
          type: p.card.type,
          issuer: p.card.issuer,
        } : null,
        email: p.email,
        contact: p.contact,
        error_code: p.error_code,
        error_description: p.error_description,
        error_reason: p.error_reason || p.error_source,
        created_at: p.created_at ? new Date(p.created_at * 1000).toISOString() : new Date().toISOString(),
        order: matchedOrder ? {
          id: matchedOrder.id,
          tracking_number: matchedOrder.tracking_number,
          customer_name: matchedOrder.customer_name,
          phone: matchedOrder.phone,
          status: matchedOrder.status,
          payment_status: matchedOrder.payment_status,
        } : null,
      };
    });

    // 6. Compute Real-time Statistics
    const totalCapturedCount = enrichedPayments.filter((p) => p.status === 'captured').length;
    const totalCapturedVolume = enrichedPayments
      .filter((p) => p.status === 'captured')
      .reduce((sum, p) => sum + p.amount, 0);

    const failedCount = enrichedPayments.filter((p) => p.status === 'failed').length;
    const refundedCount = enrichedPayments.filter((p) => (p.amount_refunded || 0) > 0 || p.status === 'refunded').length;
    const totalRefundedVolume = enrichedPayments.reduce((sum, p) => sum + (p.amount_refunded || 0), 0);

    const totalAttempts = enrichedPayments.length;
    const successRate = totalAttempts > 0 ? Math.round((totalCapturedCount / totalAttempts) * 100) : 100;

    // Methods breakdown
    const methodCounts: Record<string, number> = {};
    enrichedPayments.forEach((p) => {
      const m = p.method || 'other';
      methodCounts[m] = (methodCounts[m] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        payments: enrichedPayments,
        events: paymentEvents,
        stats: {
          total_volume: totalCapturedVolume,
          total_captured_count: totalCapturedCount,
          failed_count: failedCount,
          refunded_count: refundedCount,
          refunded_volume: totalRefundedVolume,
          success_rate: successRate,
          total_attempts: totalAttempts,
          method_breakdown: methodCounts,
        },
        gateway_info: {
          key_id: keyId,
          masked_key: keyId ? `${keyId.slice(0, 10)}...${keyId.slice(-4)}` : 'Not configured',
          is_live: keyId.startsWith('rzp_live_'),
          webhook_url: `${storefrontUrl}/api/payments/webhook`,
          webhook_secret_configured: Boolean(webhookSecret),
          gateway_error: gatewayError,
        },
      },
    });
  } catch (err: any) {
    console.error('[ADMIN_PAYMENTS_GET_ERROR]', err);
    return NextResponse.json(
      { error: 'Failed to retrieve gateway payments.', details: err?.message },
      { status: 500 }
    );
  }
}

// POST: Actions like Reconcile, Sync, or Test
export async function POST(request: Request) {
  try {
    const isAuthed = await verifyAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body?.action || '').trim();
    const supabaseAdmin = getSupabaseAdmin();

    const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (action === 'reconcile_all') {
      if (!keyId || !keySecret) {
        return NextResponse.json({ error: 'Razorpay keys not configured.' }, { status: 400 });
      }

      // Fetch captured payments from Razorpay
      const basicAuth = Buffer.from(`${keyId}:${keySecret}`, 'utf8').toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/payments?count=100', {
        headers: { Authorization: `Basic ${basicAuth}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!rzpRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch from Razorpay API' }, { status: 502 });
      }

      const rzpData = await rzpRes.json();
      const capturedItems: any[] = (rzpData?.items || []).filter((p: any) => p.status === 'captured');

      let reconciledCount = 0;
      for (const item of capturedItems) {
        if (!item.order_id) continue;
        // Check if there is an order with this razorpay_order_id that is still pending_payment
        const { data: pendingOrder } = await supabaseAdmin
          .from('orders')
          .select('id, payment_status, total')
          .eq('razorpay_order_id', item.order_id)
          .eq('payment_status', 'pending_payment')
          .maybeSingle();

        if (pendingOrder) {
          await supabaseAdmin
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'Confirmed',
              razorpay_payment_id: item.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', pendingOrder.id);

          await supabaseAdmin.from('order_tracking_events').insert({
            order_id: pendingOrder.id,
            status: 'Confirmed',
            title: 'Payment Reconciled',
            description: `Payment of ₹${item.amount / 100} reconciled via Razorpay gateway (${item.id}).`,
            location: 'Admin Portal',
            occurred_at: new Date().toISOString(),
          });

          reconciledCount++;
        }
      }

      return NextResponse.json({
        success: true,
        reconciledCount,
        message: `Reconciliation complete. ${reconciledCount} order(s) updated.`,
      });
    }

    if (action === 'reconcile_single') {
      const paymentId = String(body?.paymentId || '').trim();
      const orderId = String(body?.orderId || '').trim();

      if (!paymentId || !orderId) {
        return NextResponse.json({ error: 'Missing paymentId or orderId.' }, { status: 400 });
      }

      const { data: updated } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'Confirmed',
          razorpay_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select('id, tracking_number, status, payment_status')
        .maybeSingle();

      if (!updated) {
        return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
      }

      await supabaseAdmin.from('order_tracking_events').insert({
        order_id: orderId,
        status: 'Confirmed',
        title: 'Payment Confirmed Manually',
        description: `Admin confirmed payment #${paymentId}.`,
        location: 'Admin Portal',
        occurred_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, order: updated });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err: any) {
    console.error('[ADMIN_PAYMENTS_POST_ERROR]', err);
    return NextResponse.json({ error: 'Action failed.', details: err?.message }, { status: 500 });
  }
}
