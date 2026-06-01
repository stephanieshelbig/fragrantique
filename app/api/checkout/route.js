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

function toInt(v) {
  if (v == null) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function cartHasRojaLostInParis(items) {
  return items.some((it) => {
    const name = String(it.name || '').toLowerCase();
    return name.includes('roja') && name.includes('lost in paris');
  });
}

function allocateFixedDiscount(lineTotals, discountCents) {
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  if (subtotal <= 0 || discountCents <= 0) return lineTotals.map(() => 0);

  const maxDiscount = Math.min(discountCents, subtotal);
  const rawShares = lineTotals.map((t) => (t / subtotal) * maxDiscount);
  const shares = rawShares.map((s, i) => Math.min(lineTotals[i], Math.floor(s)));

  let used = shares.reduce((a, b) => a + b, 0);
  let remaining = maxDiscount - used;

  const remainders = rawShares
    .map((s, i) => ({ i, frac: s - Math.floor(s) }))
    .sort((a, b) => b.frac - a.frac);

  for (const r of remainders) {
    if (remaining <= 0) break;
    const i = r.i;
    if (shares[i] < lineTotals[i]) {
      shares[i] += 1;
      remaining -= 1;
    }
  }

  if (remaining > 0) {
    for (let i = 0; i < shares.length && remaining > 0; i++) {
      const room = lineTotals[i] - shares[i];
      if (room > 0) {
        const add = Math.min(room, remaining);
        shares[i] += add;
        remaining -= add;
      }
    }
  }

  return shares;
}

function applyPercentToLineTotals(lineTotals, percentOff) {
  const p = Math.max(0, Math.min(100, Number(percentOff || 0)));
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  if (subtotal <= 0 || p <= 0) {
    return { discountedLineTotals: [...lineTotals], discountCentsExact: 0 };
  }

  const discountExact = Math.floor((subtotal * p) / 100);
  const targetTotal = subtotal - discountExact;

  const rawDiscounted = lineTotals.map((t) => (t * (100 - p)) / 100);
  const discounted = rawDiscounted.map((v) => Math.floor(v));

  let currentTotal = discounted.reduce((a, b) => a + b, 0);
  let diff = targetTotal - currentTotal;

  const remainders = rawDiscounted
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (const r of remainders) {
    if (diff <= 0) break;
    discounted[r.i] += 1;
    diff -= 1;
  }

  for (let i = 0; i < discounted.length; i++) {
    discounted[i] = Math.max(0, Math.min(discounted[i], lineTotals[i]));
  }

  return { discountedLineTotals: discounted, discountCentsExact: discountExact };
}

export async function POST(req) {
  try {
    let payload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { items = [], buyer = {}, discount } = payload || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }

    const normalizedItems = items.map((it) => {
      const qty = Math.max(1, parseInt(it.quantity ?? 1, 10) || 1);
      const unit_amount = toInt(it.unit_amount);

      if (!unit_amount || unit_amount < 1) {
        throw new Error('Invalid unit_amount for a line item.');
      }

      return {
        name: it.name?.slice(0, 250) || 'Fragrance decant',
        quantity: qty,
        unit_amount,
        currency: (it.currency || 'usd').toLowerCase(),
      };
    });

    const currency = normalizedItems[0]?.currency || 'usd';

    const lineTotals = normalizedItems.map((it) => it.unit_amount * it.quantity);
    const subtotalCents = lineTotals.reduce((a, b) => a + b, 0);

    let appliedDiscount = null;

    if (discount?.code) {
      const submittedCode = String(discount.code).trim().toUpperCase();

      if (submittedCode === 'LOSTINPARIS10' && !cartHasRojaLostInParis(normalizedItems)) {
        return NextResponse.json(
          { error: 'This discount code only works when Roja Lost in Paris is in your cart.' },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from('discount_codes')
        .select('code, type, value, active, expires_at, min_subtotal_cents')
        .eq('code', submittedCode)
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

    const BASE_SHIPPING_CENTS = 600;
    const TAX_RATE = 0.07;

    let discountCents = 0;
    let discountedLineTotals = [...lineTotals];

    if (appliedDiscount?.type === 'percent') {
      const { discountedLineTotals: dlt, discountCentsExact } = applyPercentToLineTotals(
        lineTotals,
        appliedDiscount.value
      );
      discountedLineTotals = dlt;
      discountCents = discountCentsExact;
    } else if (appliedDiscount?.type === 'fixed') {
      const fixed = Math.min(Math.max(0, Number(appliedDiscount.value || 0)), subtotalCents);
      const shares = allocateFixedDiscount(lineTotals, fixed);
      discountedLineTotals = lineTotals.map((t, i) => t - shares[i]);
      discountCents = fixed;
    }

    const discountedSubtotal = discountedLineTotals.reduce((a, b) => a + b, 0);
    const shippingCents = appliedDiscount?.type === 'free_shipping' ? 0 : BASE_SHIPPING_CENTS;
    const taxCents = Math.round(discountedSubtotal * TAX_RATE);

    const productLineItems = normalizedItems.map((it, idx) => {
      const discountedLineTotal = discountedLineTotals[idx];

      if (it.quantity > 1 && discountedLineTotal % it.quantity !== 0) {
        return {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: discountedLineTotal,
            product_data: {
              name: `${it.name} (x${it.quantity})`,
            },
          },
        };
      }

      return {
        quantity: it.quantity,
        price_data: {
          currency,
          unit_amount:
            it.quantity > 1 ? Math.floor(discountedLineTotal / it.quantity) : discountedLineTotal,
          product_data: {
            name: it.name,
          },
        },
      };
    });

    const shippingLine =
      shippingCents > 0
        ? {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: shippingCents,
              product_data: { name: 'Flat-rate shipping' },
            },
          }
        : null;

    const taxLine =
      taxCents > 0
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
        subtotal_cents: String(subtotalCents),
        discount_cents: String(discountCents),
        discounted_subtotal_cents: String(discountedSubtotal),
        shipping_cents: String(shippingCents),
        tax_cents: String(taxCents),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    const msg = err?.raw?.message || err?.message || 'Checkout failed.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
