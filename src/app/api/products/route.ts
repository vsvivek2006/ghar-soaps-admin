import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_FALLBACK_IMAGE =
  'https://mlglwjaxvmcswesysipt.supabase.co/storage/v1/object/public/store-assets/catalog/acd01ae19e-1-2_486ce64b-b1be-401c-a596-a0d19973b3f0.webp';

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
      // continue to Supabase Auth JWT verification
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

function cleanInput(val: unknown, max = 250): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, max).replace(/[<>]/g, '');
}

async function fetchFullCatalog() {
  const supabaseAdmin = getSupabaseAdmin();
  // Single high-speed PostgREST embedded join (1 round-trip)
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*, product_variants(*)')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error || !products) throw error || new Error('Failed to load products');

  return products.map((p) => {
    const prodVariants = (p.product_variants || []).sort(
      (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
    );
    const totalStockQty = prodVariants.reduce((sum: number, v: any) => sum + (Number(v.stock_qty) || 0), 0);
    const primaryStockQty = prodVariants[0]?.stock_qty ?? (p.stock_status === 'out_of_stock' ? 0 : 100);
    return {
      ...p,
      product_variants: prodVariants,
      variants: prodVariants,
      stock_qty: prodVariants.length > 0 ? primaryStockQty : 100,
      total_stock_qty: totalStockQty,
    };
  });
}

// 1. GET: Fetch all products + variants from Supabase
export async function GET(request: Request) {
  try {
    if (!(await verifyAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const data = await fetchFullCatalog();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[ADMIN_PRODUCTS_GET_ERROR]', err?.message);
    return NextResponse.json({ error: 'Failed to retrieve products.' }, { status: 500 });
  }
}

// 2. POST: Create a new product + default variant in Supabase
export async function POST(request: Request) {
  try {
    if (!(await verifyAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const title = cleanInput(body?.title, 180);
    if (!title) {
      return NextResponse.json({ error: 'Product title is required.' }, { status: 400 });
    }

    const price = Math.max(0, Math.round(Number(body?.price) || 0));
    const compareAt = Math.max(0, Math.round(Number(body?.compare_at_price) || 0));
    const category = cleanInput(body?.category || 'Soaps', 80) || 'Soaps';
    const rawQty = Number(body?.stock_qty);
    const stockQty = Number.isFinite(rawQty) ? Math.max(0, Math.round(rawQty)) : 100;
    const requestedStatus = ['in_stock', 'low_stock', 'out_of_stock'].includes(body?.stock_status)
      ? body.stock_status
      : stockQty === 0
      ? 'out_of_stock'
      : stockQty <= 10
      ? 'low_stock'
      : 'in_stock';
    const finalQty = requestedStatus === 'out_of_stock' ? 0 : stockQty > 0 ? stockQty : 100;
    const badge = cleanInput(body?.badge || '', 60) || null;
    const rating = Math.min(5, Math.max(1, Number(body?.rating) || 4.9));
    const reviewsCount = Math.max(0, Math.round(Number(body?.reviews_count) || 0));
    const imageUrl = cleanInput(body?.image || (Array.isArray(body?.images) ? body.images[0] : ''), 500) || DEFAULT_FALLBACK_IMAGE;

    const baseHandle =
      cleanInput(body?.handle, 120) ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      `product-${Date.now()}`;

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingHandle } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('handle', baseHandle)
      .maybeSingle();

    const handle = existingHandle ? `${baseHandle}-${Date.now().toString().slice(-4)}` : baseHandle;
    const newProductId = Date.now();
    const newVariantId = newProductId * 10 + 1;

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('products')
      .insert({
        id: newProductId,
        title,
        handle,
        subtitle: `${category} • Natural Skincare`,
        price,
        compare_at_price: compareAt,
        rating,
        reviews_count: reviewsCount,
        badge,
        category,
        tags: [],
        images: [imageUrl],
        options: [{ name: 'Title', values: ['Default Title'] }],
        collection_handles: ['all'],
        description: cleanInput(body?.description || `${title} by Ghar Soaps.`, 2000),
        stock_status: requestedStatus,
        is_hidden_promo: false,
        sort_order: 0,
      })
      .select()
      .single();

    if (insErr) {
      console.error('[ADMIN_PRODUCT_INSERT_ERROR]', insErr.message);
      return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 });
    }

    const { error: varErr } = await supabaseAdmin.from('product_variants').insert({
      id: newVariantId,
      product_id: newProductId,
      title: 'Default Title',
      price,
      compare_at_price: compareAt,
      available: finalQty > 0 && requestedStatus !== 'out_of_stock',
      stock_qty: finalQty,
      option1: 'Default Title',
      featured_image: imageUrl,
      position: 0,
    });

    if (varErr) {
      console.error('[ADMIN_VARIANT_INSERT_ERROR]', varErr.message);
      return NextResponse.json({ error: 'Failed to create product variant.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { ...inserted, stock_qty: finalQty },
    });
  } catch (err: any) {
    console.error('[ADMIN_PRODUCT_POST_EXCEPTION]', err?.message);
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
}

// 3. PATCH: Update product fields, pricing & stock quantities in Supabase
export async function PATCH(request: Request) {
  try {
    if (!(await verifyAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const productId = Number(body?.id);
    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ error: 'Valid product ID is required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingProd, error: fetchErr } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (fetchErr || !existingProd) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const { data: variants } = await supabaseAdmin
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    const productUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) productUpdates.title = cleanInput(body.title, 180) || existingProd.title;
    if (body.price !== undefined) productUpdates.price = Math.max(0, Math.round(Number(body.price) || 0));
    if (body.compare_at_price !== undefined) {
      productUpdates.compare_at_price = Math.max(0, Math.round(Number(body.compare_at_price) || 0));
    }
    if (body.category !== undefined) productUpdates.category = cleanInput(body.category, 80) || existingProd.category;
    if (body.badge !== undefined) productUpdates.badge = cleanInput(body.badge, 60) || null;
    if (body.rating !== undefined) productUpdates.rating = Math.min(5, Math.max(1, Number(body.rating) || 4.8));
    if (body.reviews_count !== undefined) {
      productUpdates.reviews_count = Math.max(0, Math.round(Number(body.reviews_count) || 0));
    }
    if (body.image !== undefined && typeof body.image === 'string' && body.image.trim()) {
      const restImages = Array.isArray(existingProd.images) ? existingProd.images.slice(1) : [];
      productUpdates.images = [cleanInput(body.image, 500), ...restImages];
    } else if (Array.isArray(body.images) && body.images.length > 0) {
      productUpdates.images = body.images.map((u: unknown) => cleanInput(u, 500)).filter(Boolean);
    }

    // Handle stock updates consistently across products & product_variants
    const hasStockQty = body.stock_qty !== undefined && body.stock_qty !== null;
    const requestedStatus = ['in_stock', 'low_stock', 'out_of_stock'].includes(body.stock_status)
      ? (body.stock_status as 'in_stock' | 'low_stock' | 'out_of_stock')
      : null;

    if (hasStockQty || requestedStatus) {
      let nextQty = hasStockQty ? Math.max(0, Math.round(Number(body.stock_qty) || 0)) : null;
      if (requestedStatus === 'out_of_stock') {
        nextQty = 0;
      } else if (requestedStatus === 'in_stock' && (nextQty === null || nextQty <= 0)) {
        const curQty = variants?.[0]?.stock_qty ?? 0;
        nextQty = curQty > 0 ? curQty : 100;
      } else if (requestedStatus === 'low_stock' && (nextQty === null || nextQty <= 0 || nextQty > 10)) {
        nextQty = 5;
      }

      const derivedStatus: 'in_stock' | 'low_stock' | 'out_of_stock' =
        requestedStatus ||
        (nextQty === 0 ? 'out_of_stock' : nextQty !== null && nextQty <= 10 ? 'low_stock' : 'in_stock');

      productUpdates.stock_status = derivedStatus;

      if (variants && variants.length > 0) {
        const targetVariantId = body.variant_id ? Number(body.variant_id) : null;
        if (targetVariantId) {
          await supabaseAdmin
            .from('product_variants')
            .update({
              ...(nextQty !== null ? { stock_qty: nextQty, available: nextQty > 0 } : { available: derivedStatus !== 'out_of_stock' }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetVariantId)
            .eq('product_id', productId);
        } else {
          await supabaseAdmin
            .from('product_variants')
            .update({
              ...(nextQty !== null ? { stock_qty: nextQty, available: nextQty > 0 } : { available: derivedStatus !== 'out_of_stock' }),
              updated_at: new Date().toISOString(),
            })
            .eq('product_id', productId);
        }
      }
    }

    // Keep primary variant price aligned if price changed from simple product modal
    if ((body.price !== undefined || body.compare_at_price !== undefined) && variants && variants.length > 0) {
      const targetVarId = body.variant_id ? Number(body.variant_id) : variants[0].id;
      const vUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (body.price !== undefined && (variants.length === 1 || body.variant_id || body.price !== existingProd.price)) {
        vUpdates.price = productUpdates.price;
      }
      if (body.compare_at_price !== undefined) {
        vUpdates.compare_at_price = productUpdates.compare_at_price;
      }
      await supabaseAdmin.from('product_variants').update(vUpdates).eq('id', targetVarId);
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('products')
      .update(productUpdates)
      .eq('id', productId)
      .select()
      .single();

    if (updErr) {
      console.error('[ADMIN_PRODUCT_UPDATE_ERROR]', updErr.message);
      return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 });
    }

    const { data: refreshedVariants } = await supabaseAdmin
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        variants: refreshedVariants || [],
        stock_qty: refreshedVariants?.[0]?.stock_qty ?? 100,
      },
    });
  } catch (err: any) {
    console.error('[ADMIN_PRODUCT_PATCH_EXCEPTION]', err?.message);
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
}

// 4. DELETE: Delete a product (cascades to variants)
export async function DELETE(request: Request) {
  try {
    if (!(await verifyAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const productId = Number(idParam);
    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ error: 'Valid product id query param is required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('products').delete().eq('id', productId);

    if (error) {
      console.error('[ADMIN_PRODUCT_DELETE_ERROR]', error.message);
      return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[ADMIN_PRODUCT_DELETE_EXCEPTION]', err?.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

