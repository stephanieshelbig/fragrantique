// /app/api/checkout/route.js
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export async function POST(req) {
  try {
    const { items = [], buyer = {} } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }

    // Build Stripe line_items from the cart (no metadata bloat)
    const productLineItems = items.map((it) => {
      // Expecting fields from your cart: name, unit_amount (in cents), currency, quantity
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

    // Calculate server-side subtotal for tax calc
    const subtotalCents = items.reduce(
      (sum, it) => sum + Number(it.unit_amount || 0) * Math.max(1, parseInt(it.quantity ?? 1, 10) || 1),
      0
    );

    const SHIPPING_CENTS = 500;     // $5 flat rate (matches your UI)
    const TAX_RATE = 0.07;          // 7% (matches your UI)
    const taxCents = Math.round(subtotalCents * TAX_RATE);

    const currency = (items[0]?.currency || 'usd').toLowerCase();

    // Add shipping as its own line item
    const shippingLine = {
      quantity: 1,
      price_data: {
        currency,
        unit_amount: SHIPPING_CENTS,
        product_data: { name: 'Flat-rate shipping' },
      },
    };

    // Add tax as its own line item (simple + matches your UI total)
    const taxLine = {
      quantity: 1,
      price_data: {
        currency,
        unit_amount: taxCents,
        product_data: { name: 'Sales tax (7%)' },
      },
    };

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://fragrantique.net';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [...productLineItems, shippingLine, taxLine],
      // Let Stripe collect the shipping address so we don't put it in metadata
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'SE', 'IT', 'ES'],
      },
      success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      // Keep metadata tiny (or omit entirely). If you need an internal link,
      // store to your DB first and pass a short order_ref here.
      // metadata: { order_ref: 'short-id-here' },
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
