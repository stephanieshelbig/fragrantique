import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { items = [], buyer = {}, discount } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }

    // Build Stripe line_items from the cart (no metadata bloat)
    const productLineItems = items.map((it) => {
      const qty = Math.max(1, parseInt(it.quantity ?? 1, 10) || 1);
      return {
        quantity: qty,
        price_data: {
          currency: (it.currency || 'usd').toLowerCase(),
          unit_amount: Number(it.unit_amount),
          product_data: {
            name: it.name?.slice(0, 250) || 'Fragrance decant',
          },
        },
      };
    });

    // Calculate server-side subtotal
    const subtotalCents = items.reduce(
      (sum, it) => sum + Number(it.unit_amount || 0) * Math.max(1, parseInt(it.quantity ?? 1, 10) || 1),
      0
    );

    // --- 🔹 DISCOUNT CODE VALIDATION (added) ---
    let appliedDiscount = null;
    if (discount?.code) {
      const { data, error } = await supabaseAdmin
        .from('discount_codes')
        .select('code, type, value, active, expires_at, min_subtotal_cents')
        .eq('code', String(discount.code).toUpperCase())
        .maybeSingle();

      if (
        data &&
        !error &&
        data.active === true &&
        (!data.expires_at || new Date(data.expires_at) > new Date()) &&
        subtotalCents >= Number(data.min_subtotal_cents || 0) &&
        ['percent', 'fixed', 'free_shipping'].includes(data.type)
      ) {
        appliedDiscount = {
          code: data.code.toUpperCase(),
          type: data.type,
          value: data.value ?? null,
        };
      }
    }

    const BASE_SHIPPING_CENTS = 500; // $5 flat rate (matches UI)
    const TAX_RATE = 0.07;

    const discountCents =
      appliedDiscount?.type === 'percent'
        ? Math.floor((subtotalCents * Math.max(0, Math.min(100, Number(appliedDiscount.value || 0)))) / 100)
        : appliedDiscount?.type === 'fixed'
          ? Math.min(Math.max(0, Number(appliedDiscount.value || 0)), subtotalCents)
          : 0;

    const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
    const shippingCents = appliedDiscount?.type === 'free_shipping' ? 0 : BASE_SHIPPING_CENTS;
    const taxCents = Math.round(discountedSubtotal * TAX_RATE);

    const currency = (items[0]?.currency || 'usd').toLowerCase();

    // Build updated shipping/tax lines
    const shippingLine = shippingCents
      ? {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: shippingCents,
            product_data: { name: 'Flat-rate shipping' },
          },
        }
      : null;

    const taxLine = taxCents
      ? {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: taxCents,
            product_data: { name: 'Sales tax (7%)' },
          },
        }
      : null;

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://fragrantique.net';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        ...productLineItems,
        ...(shippingLine ? [shippingLine] : []),
        ...(taxLine ? [taxLine] : []),
      ],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'SE', 'IT', 'ES'],
      },
      success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        discount_code: appliedDiscount?.code || '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: err?.message || 'Checkout failed.' },
      { status: 500 }
    );
  }
}
