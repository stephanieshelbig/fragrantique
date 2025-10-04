// app/api/checkout/route.js
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// --- Replace this with your real validation / lookup ---
function validateCustomCode(code) {
  if (!code) return null;
  const up = String(code).trim().toUpperCase();
  if (up === 'FALL20') return { type: 'percent', value: 20 };
  if (up === 'TENOFF') return { type: 'amount', value: 1000 }; // $10 in cents
  return null;
}

async function resolveStripeDiscount(discountCode) {
  if (!discountCode) return null;

  // OPTION A: existing Promotion Code in Stripe
  // try {
  //   const promo = (await stripe.promotionCodes.list({ code: discountCode, active: true, limit: 1 })).data[0];
  //   if (promo) return { promotion_code: promo.id };
  // } catch (e) { /* swallow */ }

  // OPTION B: your mapping from code -> coupon id
  // const COUPON_MAP = { FALL20: 'coupon_123', TENOFF: 'coupon_abc' };
  // const m = COUPON_MAP[String(discountCode).trim().toUpperCase()];
  // if (m) return { coupon: m };

  // OPTION C: create a one-off coupon based on your own logic
  const rule = validateCustomCode(discountCode);
  if (!rule) return null;

  if (rule.type === 'percent') {
    const coupon = await stripe.coupons.create({
      percent_off: rule.value,
      duration: 'once',
      name: String(discountCode).trim(),
    });
    return { coupon: coupon.id };
  } else if (rule.type === 'amount') {
    const coupon = await stripe.coupons.create({
      amount_off: rule.value,
      currency: 'usd',
      duration: 'once',
      name: String(discountCode).trim(),
    });
    return { coupon: coupon.id };
  }
  return null;
}

function toIntCents(v) {
  if (v == null) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return null;
  // Accept either cents (integer) or dollars (>=1 with decimals); prefer cents if looks like int >= 50.
  if (Number.isInteger(n)) return n; // assume already cents
  return Math.round(n * 100);
}

function normalizeLineItem(it) {
  // Supports either `price` (Price ID) or raw price_data
  if (it.price) {
    return { price: it.price, quantity: it.quantity ?? 1 };
  }
  const quantity = it.quantity ?? 1;
  const currency = (it.currency || 'usd').toLowerCase();
  const unit_amount = toIntCents(it.unit_amount);
  if (!unit_amount || unit_amount < 1) {
    throw new Error('Invalid unit_amount for line item (must be integer cents).');
  }
  const name = it.name || 'Item';
  return {
    quantity,
    price_data: {
      currency,
      product_data: { name },
      unit_amount,
    },
  };
}

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: { message: 'Invalid JSON body.' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const origin = req.headers.get('origin') || 'https://www.fragrantique.net';

    const {
      items = [],
      success_url = `${origin}/checkout/success`,
      cancel_url = `${origin}/checkout/cancel`,
      discountCode,
      customer_email,
      customer,
      mode = 'payment',
      allow_promotion_codes = false, // set true if you want Stripe’s code field, too
    } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: { message: 'No items to checkout.' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const line_items = items.map(normalizeLineItem);

    // Resolve discount (if any)
    const discountForStripe = await resolveStripeDiscount(discountCode);

    const sessionParams = {
      mode,
      line_items,
      success_url,
      cancel_url,
      allow_promotion_codes,
      ...(customer ? { customer } : {}),
      ...(customer_email ? { customer_email } : {}),
      ...(discountForStripe ? { discounts: [discountForStripe] } : {}),
    };

    // Create the Checkout Session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    const message = err?.raw?.message || err?.message || 'Checkout failed.';
    return new Response(JSON.stringify({ error: { message } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
