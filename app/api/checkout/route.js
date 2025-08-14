// Force Node runtime (Stripe SDK needs Node, not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// Health check
export async function GET() {
  return json({ ok: true, route: '/api/checkout', expect: 'POST { items:[{decantId,qty}], fallbackDecantId? }' });
}

export async function POST(req) {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!STRIPE_SECRET_KEY) return json({ error: 'Missing STRIPE_SECRET_KEY' }, 500);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Missing Supabase server env (URL/Service Role Key)' }, 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: 'Missing JSON body' }, 400);

    // Accept either a single decantId (legacy) OR items array
    let items = [];
    if (Array.isArray(body.items) && body.items.length > 0) {
      items = body.items
        .filter(it => it && it.decantId)
        .map(it => ({ decantId: String(it.decantId), qty: Math.max(1, parseInt(it.qty || 1)) }));
    } else if (body.decantId) {
      items = [{ decantId: String(body.decantId), qty: 1 }];
    } else {
      return json({ error: 'Provide decantId or items[]' }, 400);
    }

    // Load each decant from DB to validate/price accurately
    const lineItems = [];
    let subtotal = 0;
    let lastFragranceId = null;

    for (const { decantId, qty } of items) {
      const { data: d, error: dErr } = await supabase
        .from('decants')
        .select('id, fragrance_id, size_ml, price_cents, quantity, is_active, fragrance:fragrances(id, brand, name)')
        .eq('id', decantId)
        .maybeSingle();

      if (dErr) return json({ error: `DB error: ${dErr.message}` }, 500);
      if (!d) return json({ error: `Decant not found: ${decantId}` }, 404);
      if (!d.is_active || d.quantity === 0) return json({ error: `Decant out of stock: ${decantId}` }, 400);

      const amount = Math.max(0, parseInt(d.price_cents));
      const quantity = Math.max(1, qty);

      subtotal += amount * quantity;
      lastFragranceId = d.fragrance_id || lastFragranceId;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${d.fragrance?.brand || ''} ${d.fragrance?.name || ''} — ${d.size_ml} mL decant`
          },
          unit_amount: amount
        },
        quantity
      });
    }

    // Add single 5% platform fee on subtotal
    const fee = Math.max(0, Math.round(subtotal * 0.05));
    if (fee > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Platform fee (5%)' },
          unit_amount: fee
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      allow_promotion_codes: true,
      line_items: lineItems,
      success_url: `${SITE_URL}/cart?status=success`,
      cancel_url: `${SITE_URL}/cart?status=cancel`
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: e?.message || 'checkout error' }, 500);
  }
}
