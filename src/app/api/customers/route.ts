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

function verifyAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const expected = (process.env.ADMIN_SECRET_TOKEN || '').trim();
  if (!expected || !token || token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token, 'utf-8'), Buffer.from(expected, 'utf-8'));
  } catch {
    return false;
  }
}

// 1. GET: List all registered customers from Supabase Auth & correlate with Orders
export async function GET(request: Request) {
  if (!verifyAdminAuth(request)) {
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

    // 3. Map Auth Users
    const customers = authData.users.map((u) => {
      const meta = u.user_metadata || {};
      const isInternalEmail = u.email?.endsWith('@customer.gharsoaps.shop');
      const email = isInternalEmail ? undefined : u.email;
      const phone = meta.phone || (isInternalEmail && u.email ? u.email.split('@')[0] : undefined);
      const fullName = meta.full_name || meta.name || (email ? email.split('@')[0] : phone ? `Customer ${phone}` : 'Customer');

      // Filter user's orders
      const userOrders = orders.filter((o) => {
        const matchPhone = phone && o.phone && o.phone.replace(/\D/g, '').slice(-10) === phone.replace(/\D/g, '').slice(-10);
        const matchEmail = email && o.email && o.email.toLowerCase() === email.toLowerCase();
        return matchPhone || matchEmail;
      });

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
  if (!verifyAdminAuth(request)) {
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
  if (!verifyAdminAuth(request)) {
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
