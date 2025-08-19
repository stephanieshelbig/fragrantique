import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';

const stripe = getStripeClient();
const SITE = 'https://fragrantique.net';

// anon client is fine; we only read current session for email if present
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
  let unit_amount = it.unit_amount;
  if (unit_amount == null && it.unit_price != null) {
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
    const { items, successUrl, cancelUrl, buyer } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 });
    }

    const supabase = supabaseClient();
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user || null;

    // Clean items & validate
    const clean = items.map(sanitizeItem);
    for (const it of clean) {
      if (it.unit_amount == null || Number.isNaN(it.unit_amount) || it.unit_amount <= 0) {
        return NextResponse.json(
          { error: 'Each item must include a valid unit_amount (in cents).' },
          { status: 400 }
        );
      }
    }

    // Subtotal (items only) in cents
    const subtotalCents = clean.reduce((sum, it) => sum + (it.unit_amount * it.quantity), 0);

    // Use the first item’s currency (we assume all items share currency)
    const currency = (clean[0].currency || 'usd').toLowerCase();

    // Default seller = @stephanie
    let seller_user_id = null;
    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'stephanie')
      .maybeSingle();
    if (prof?.id) seller_user_id = prof.id;

    // Convert cart items to Stripe line_items
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

    // --- Flat shipping $5.00 ---
    const SHIPPING_FEE_CENTS = 500;
    line_items.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: SHIPPING_FEE_CENTS,
        product_data: {
          name: 'Shipping',
          metadata: { type: 'shipping_flat_fee' },
        },
      },
    });

    // --- Sales tax 7% on subtotal only (not including shipping) ---
    const TAX_RATE = 0.07;
    const taxCents = Math.round(subtotalCents * TAX_RATE);
    if (taxCents > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: taxCents,
          product_data: {
            name: 'Sales Tax (7%)',
            metadata: { type: 'sales_tax', base_cents: String(subtotalCents) },
          },
        },
      });
    }

    // Metadata (also includes buyer shipping details from cart form)
    const md = {
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
      shipping_fee_cents: String(SHIPPING_FEE_CENTS),
      tax_cents: String(taxCents),
      tax_rate_pct: '7',
      // buyer-entered shipping details
      shipping_name: buyer?.name || '',
      shipping_address1: buyer?.address1 || '',
      shipping_address2: buyer?.address2 || '',
      shipping_city: buyer?.city || '',
      shipping_state: buyer?.state || '',
      shipping_postal: buyer?.postal || '',
      shipping_country: buyer?.country || '',
    };

    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: successUrl || `${SITE}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${SITE}/checkout/cancelled`,
      customer_email: user?.email || undefined,
      metadata: md,
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'checkout failed' }, { status: 500 });
  }
}
