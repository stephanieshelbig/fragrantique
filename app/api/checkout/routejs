// Force Node runtime (Stripe SDK needs Node, not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// tiny helper so we ALWAYS return JSON
function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// Health-check / easy debugging in browser
export async function GET() {
  return json({ ok: true, route: '/api/checkout', expect: 'POST with { decantId }' });
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

    const body = await req.json().catch(() => null);
    if (!body || !body.decantId) {
      return json({ error: 'Missing JSON body or decantId' }, 400);
    }
    const { decantId, fragranceId } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load decant & fragrance
    const { data: d, error: dErr } = await supabase
      .from('decants')
      .select('id, fragrance_id, size_ml, price_cents, quantity, is_active, fragrance:fragrances(id, brand, name)')
      .eq('id', decantId)
      .maybeSingle();

    if (dErr) return json({ error: `DB error: ${dErr.message}` }, 500);
    if (!d) return json({ error: 'Decant not found' }, 404);
    if (!d.is_active || d.quantity === 0) return json({ error: 'Out of stock' }, 400);

    const basePrice = d.price_cents;
    const fee = Math.max(0, Math.round(basePrice * 0.05));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${d.fragrance?.brand || ''} ${d.fragrance?.name || ''} — ${d.size_ml} mL decant`
            },
            unit_amount: basePrice
          },
          quantity: 1
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Platform fee (5%)' },
            unit_amount: fee
          },
          quantity: 1
        }
      ],
      success_url: `${SITE_URL}/fragrance/${d.fragrance_id || fragranceId}?checkout=success`,
      cancel_url: `${SITE_URL}/fragrance/${d.fragrance_id || fragranceId}?checkout=cancel`
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: e?.message || 'checkout error' }, 500);
  }
}
