import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function verifyAdminAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return false;

  const expected = (process.env.ADMIN_SECRET_TOKEN || '').trim();
  if (expected && token.length === expected.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(token, 'utf-8'), Buffer.from(expected, 'utf-8'))) {
        return true;
      }
    } catch {
      // continue to JWT verification
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

// 1. GET: List all registered customers from Supabase Auth & correlate with Orders
export async function GET(request: Request) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Get Auth Users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      return NextResponse.json({ success: false, error: 'Unable to retrieve registered customers.' }, { status: 500, headers: corsHeaders });
    }

    // 2. Get All Orders to aggregate statistics
    const { data: ordersData } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, phone, email, total, status, created_at')
      .order('created_at', { ascending: false });

    const orders = ordersData || [];

    // O(N) pre-index orders by phone (last 10 digits) and email (lowercase)
    const ordersByPhone = new Map<string, any[]>();
    const ordersByEmail = new Map<string, any[]>();

    for (const o of orders) {
      if (o.phone) {
        const cleanP = String(o.phone).replace(/\D/g, '').slice(-10);
        if (cleanP) {
          const list = ordersByPhone.get(cleanP) || [];
          list.push(o);
          ordersByPhone.set(cleanP, list);
        }
      }
      if (o.email) {
        const cleanE = String(o.email).toLowerCase().trim();
        if (cleanE) {
          const list = ordersByEmail.get(cleanE) || [];
          list.push(o);
          ordersByEmail.set(cleanE, list);
        }
      }
    }

    // 3. Map Auth Users in O(M) time using O(1) hash map lookups
    const customers = authData.users.map((u) => {
      const meta = u.user_metadata || {};
      const isInternalEmail = u.email?.endsWith('@customer.gharsoaps.shop');
      const email = isInternalEmail ? undefined : u.email;
      const phone = meta.phone || (isInternalEmail && u.email ? u.email.split('@')[0] : undefined);
      const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : undefined;
      const cleanEmail = email ? String(email).toLowerCase().trim() : undefined;
      const fullName = meta.full_name || meta.name || (email ? email.split('@')[0] : phone ? `Customer ${phone}` : 'Customer');

      // Fast O(1) deduplicated matching
      const userOrdersMap = new Map<string, any>();
      if (cleanPhone) {
        for (const o of ordersByPhone.get(cleanPhone) || []) userOrdersMap.set(o.id, o);
      }
      if (cleanEmail) {
        for (const o of ordersByEmail.get(cleanEmail) || []) userOrdersMap.set(o.id, o);
      }
      const userOrders = Array.from(userOrdersMap.values());

      const totalSpent = userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const orderCount = userOrders.length;
      const lastOrderDate = userOrders.length > 0 ? userOrders[0].created_at : undefined;

      return {
        id: u.id,
        full_name: fullName,
        email,
        phone,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed: !!u.email_confirmed_at,
        totalSpent,
        orderCount,
        lastOrderDate,
        role: meta.role || 'customer',
        orders: userOrders,
      };
    });

    return NextResponse.json({ success: true, customers }, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to fetch registered customers.' }, { status: 500, headers: corsHeaders });
  }
}

// 2. PATCH: Update Customer Profile Details
export async function PATCH(request: Request) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { userId, full_name, phone, email } = body || {};

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: userRes, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (fetchErr || !userRes?.user) {
      return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404, headers: corsHeaders });
    }

    const currentMeta = userRes.user.user_metadata || {};
    const updatedMeta = {
      ...currentMeta,
      full_name: full_name?.trim() || currentMeta.full_name,
      phone: phone?.trim() || currentMeta.phone,
    };

    const updatePayload: any = {
      user_metadata: updatedMeta,
    };

    // If new email provided and not dummy internal
    if (email && email.includes('@') && !email.endsWith('@customer.gharsoaps.shop')) {
      updatePayload.email = email.toLowerCase().trim();
      updatePayload.email_confirm = true;
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);

    if (updateErr) {
      return NextResponse.json({ success: false, error: 'Failed to update customer record.' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, message: 'Customer details updated successfully!' }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error processing customer update.' }, { status: 500, headers: corsHeaders });
  }
}

// 3. DELETE: Remove or deactivate customer
export async function DELETE(request: Request) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete customer.' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, message: 'Customer removed successfully.' }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error processing customer deletion.' }, { status: 500, headers: corsHeaders });
  }
}
