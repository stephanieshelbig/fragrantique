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
  // Accept ints or numeric strings; treat as integer cents.
  if (v == null) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

/**
 * Allocate a fixed discount across items proportionally by line total.
 * Returns an array of discount cents for each item index, summing exactly to discountCents.
 */
function allocateFixedDiscount(lineTotals, discountCents) {
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  if (subtotal <= 0 || discountCents <= 0) return lineTotals.map(() => 0);

  const maxDiscount = Math.min(discountCents, subtotal);
  const rawShares = lineTotals.map((t) => (t / subtotal) * maxDiscount);

  // Start with floors
  const shares = rawShares.map((s, i) => Math.min(lineTotals[i], Math.floor(s)));

  // Distribute remainder cents
  let used = shares.reduce((a, b) => a + b, 0);
  let remaining = maxDiscount - used;

  // Sort indices by largest fractional remainder first
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

  // If still remaining (due to caps), push into any item with room
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

/**
 * Apply a percent discount to line totals with rounding so the final sum matches exactly.
 * Returns discounted line totals that sum to (subtotal - discountCentsExact).
 */
function applyPercentToLineTotals(lineTotals, percentOff) {
  const p = Math.max(0, Math.min(100, Number(percentOff || 0)));
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  if (subtotal <= 0 || p <= 0) return { discountedLineTotals: [...lineTotals], discountCentsExact: 0 };

  const discountExact = Math.floor((subtotal * p) / 100);
  const targetTotal = subtotal - discountExact;

  // Start with floors per line
  const rawDiscounted = lineTotals.map((t) => (t * (100 - p)) / 100);
  const discounted = rawDiscounted.map((v) => Math.floor(v));

  let currentTotal = discounted.reduce((a, b) => a + b, 0);
  let diff = targetTotal - currentTotal; // we need to add diff cents across lines (diff >= 0 usually)

  // Distribute +1 cent to lines with largest fractional remainder
  const remainders = rawDiscounted
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (const r of remainders) {
    if (diff <= 0) break;
    discounted[r.i] += 1;
    diff -= 1;
  }

  // Safety: clamp to original totals
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

    // Validate and normalize raw items
    const normalizedItems = items.map((it) => {
      const qty = Math.max(1, parseInt(it.quantity ?? 1, 10) || 1);
      const unit_amount = toInt(it.unit_amount);
      if (!unit_amount || unit_amount < 1) {
        throw new Error('Invalid unit_amount for a line item (must be integer cents).');
      }
      return {
        name: it.name?.slice(0, 250) || 'Fragrance decant',
        quantity: qty,
        unit_amount,
        currency: (it.currency || 'usd').toLowerCase(),
      };
    });

    const currency = normalizedItems[0]?.currency || 'usd';

    // Server-side merchandise subtotal
    const lineTotals = normalizedItems.map((it) => it.unit_amount * it.quantity);
    const subtotalCents = lineTotals.reduce((a, b) => a + b, 0);

    // --- DISCOUNT CODE VALIDATION (Supabase) ---
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

    const BASE_SHIPPING_CENTS = 500; // $5 flat rate (matches your UI)
    const TAX_RATE = 0.07;

    // Compute discounted merchandise totals (ONLY on product lines)
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

    // Free shipping handled here (since you model shipping as a line item)
    const shippingCents = appliedDiscount?.type === 'free_shipping' ? 0 : BASE_SHIPPING_CENTS;

    // Tax on discounted merchandise subtotal (not on shipping)
    const taxCents = Math.round(discountedSubtotal * TAX_RATE);

    // Build Stripe line_items:
    // - product items use DISCOUNTED line totals
    // - shipping + tax added after (not discounted)
    const productLineItems = normalizedItems.map((it, idx) => {
      const discountedLineTotal = discountedLineTotals[idx];

      // If quantity > 1 and cents don't divide evenly, collapse to qty=1 to keep totals exact
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

      const unit_amount_discounted =
        it.quantity > 1 ? Math.floor(discountedLineTotal / it.quantity) : discountedLineTotal;

      return {
        quantity: it.quantity,
        price_data: {
          currency,
          unit_amount: unit_amount_discounted,
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

    // IMPORTANT:
    // We do NOT pass Stripe "discounts" here, because Stripe would discount shipping+tax line items.
    // Instead, we pre-discounted only the product line items above.
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
        // helpful for debugging parity with cart:
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
