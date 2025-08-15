import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Client for reading session user (anon OK)
const supabaseClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function toInt(v) {
  if (typeof v === 'number') return Math.round(v);
  if (typeof v === 'string') return Math.round(parseFloat(v));
  return null;
}
function sanitizeItem(it) {
  const qty = Math.max(1, parseInt(it.quantity ?? 1, 10) || 1);
  const currency = (it.currency || 'usd').toLowerCase();
  // Accept either unit_amount (cents) or unit_price (dollars) from older UIs.
  let unit_amount = it.unit_amount;
  if (unit_amount == null && it.unit_price != null) {
    // Convert dollars → cents
    unit_amount = Math.round(parseFloat(String(it.unit_price)) * 100);
  }
  unit_amount = toInt(unit_amount);

  return {
    name: it.name || 'Fragrance',
    quantity: qty,
    unit_amount,
    currency,
    fragrance_id: it.fragrance_id ?? null,
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { items, successUrl, cancelUrl } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 });
    }

    const supabase = supabaseClient();
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user || null;

    // Normalize each item and validate
    const clean = items.map(sanitizeItem);
    for (const it of clean) {
      if (it.unit_amount == null || Number.isNaN(it.unit_amount) || it.unit_amount <= 0) {
        return NextResponse.json(
          { error: 'Each item must include a valid unit_amount (in cents).' },
          { status: 400 }
        );
      }
    }

    // Default seller = your admin profile (stephanie)
    let seller_user_id = null;
    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'stephanie')
      .maybeSingle();
    if (prof?.id) seller_user_id = prof.id;

    const line_items = clean.map((it) => ({
      quantity: it.quantity,
      price_data: {
        currency: it.currency,
        unit_amount: it.unit_amount,
        product_data: {
          name: it.name,
          metadata: { fragrance_id: String(it.fragrance_id ?? '') },
        },
      },
    }));

    const sessionArgs = {
      mode: 'payment',
      line_items,
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/cancelled`,
      customer_email: user?.email || undefined,
      metadata: {
        seller_user_id: seller_user_id || '',
        cart: JSON.stringify(
          clean.map(({ name, quantity, unit_amount, currency, fragrance_id }) => ({
            name,
            quantity,
            unit_amount,
            currency,
            fragrance_id,
          }))
        ),
      },
    };

    const stripeSession = await stripe.checkout.sessions.create(sessionArgs);
    return NextResponse.json({ url: stripeSession.url });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'checkout failed' }, { status: 500 });
  }
}
